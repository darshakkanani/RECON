/**
 * ========================================
 * ADIYOGI V2 - Advanced Tool Execution Engine
 * ========================================
 * 
 * High-performance, secure tool execution system with:
 * - Process isolation and resource limits
 * - Concurrent execution management
 * - Advanced error handling and recovery
 * - Result processing and validation
 * - Caching and optimization
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');
const config = require('../../config/app.config');
const logger = require('../../utils/logger');
const { defineScript } = require('redis');
const { describe } = require('pm2');

class ToolExecutor extends EventEmitter {
    constructor() {
        super();
        this.activeProcesses = new Map();
        this.executionQueue = [];
        this.concurrentExecutions = 0;
        this.maxConcurrent = config.execution.maxConcurrent;
        this.processCleanupInterval = null;
        
        this.initializeExecutor();
    }

    async initializeExecutor() {
        // Ensure required directories exist
        await this.ensureDirectories();
        
        // Start process cleanup interval
        this.startProcessCleanup();
        
        logger.info('Tool executor initialized', {
            maxConcurrent: this.maxConcurrent,
            timeout: config.execution.timeout
        });
    }

    async ensureDirectories() {
        const dirs = [
            config.paths.results,
            config.paths.temp,
            config.paths.cache
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                logger.error(`Failed to create directory: ${dir}`, { error: error.message });
                throw error;
            }
        }
    }

    startProcessCleanup() {
        this.processCleanupInterval = setInterval(() => {
            this.cleanupStaleProcesses();
        }, 30000); // Every 30 seconds
    }

    cleanupStaleProcesses() {
        const now = Date.now();
        const staleThreshold = config.execution.timeout + 60000; // 1 minute buffer

        for (const [executionId, execution] of this.activeProcesses) {
            if (now - execution.startTime > staleThreshold) {
                logger.warn('Cleaning up stale process', { executionId, tool: execution.tool });
                this.killExecution(executionId);
            }
        }
    }

    generateExecutionId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async executeTools(tools, domain, options = {}) {
        const executionId = this.generateExecutionId();
        const startTime = Date.now();
        
        logger.info('Starting multi-tool execution', {
            executionId,
            tools,
            domain,
            options
        });

        try {
            const results = await this.executeMultipleTools(tools, domain, options, executionId);
            
            const duration = Date.now() - startTime;
            logger.info('Multi-tool execution completed', {
                executionId,
                duration: `${duration}ms`,
                toolCount: tools.length,
                totalResults: results.reduce((sum, r) => sum + (r.results?.length || 0), 0)
            });

            return {
                success: true,
                executionId,
                duration,
                results,
                metadata: {
                    domain,
                    tools,
                    timestamp: new Date().toISOString(),
                    totalResults: results.reduce((sum, r) => sum + (r.results?.length || 0), 0)
                }
            };
        } catch (error) {
            logger.error('Multi-tool execution failed', {
                executionId,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                executionId,
                error: error.message,
                results: []
            };
        }
    }

    async executeMultipleTools(tools, domain, options, parentExecutionId) {
        const results = [];
        const concurrentBatches = this.createConcurrentBatches(tools);

        for (const batch of concurrentBatches) {
            const batchPromises = batch.map(tool => 
                this.executeSingleTool(tool, domain, options, parentExecutionId)
            );

            const batchResults = await Promise.allSettled(batchPromises);
            
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    logger.error('Tool execution failed in batch', {
                        error: result.reason.message
                    });
                    results.push({
                        success: false,
                        error: result.reason.message,
                        results: []
                    });
                }
            }
        }

        return results;
    }

    createConcurrentBatches(tools) {
        const batches = [];
        const batchSize = Math.min(this.maxConcurrent, tools.length);
        
        for (let i = 0; i < tools.length; i += batchSize) {
            batches.push(tools.slice(i, i + batchSize));
        }
        
        return batches;
    }

    async executeSingleTool(tool, domain, options = {}, parentExecutionId = null) {
        const executionId = this.generateExecutionId();
        const timerId = logger.toolStart(tool, domain, options);
        
        try {
            // Wait for execution slot
            await this.waitForExecutionSlot();
            
            // Increment concurrent executions
            this.concurrentExecutions++;
            
            // Get tool configuration
            const toolConfig = await this.getToolConfiguration(tool);
            
            // Validate inputs
            this.validateInputs(tool, domain, options);
            
            // Create execution context
            const context = await this.createExecutionContext(tool, domain, options, executionId);
            
            // Execute tool
            const result = await this.runTool(toolConfig, context);
            
            // Process results
            const processedResult = await this.processResults(tool, result, context);
            
            logger.toolEnd(timerId, tool, domain, processedResult);
            
            return {
                success: true,
                tool,
                domain,
                executionId,
                parentExecutionId,
                ...processedResult
            };
            
        } catch (error) {
            logger.toolError(tool, domain, error, timerId);
            
            return {
                success: false,
                tool,
                domain,
                executionId,
                parentExecutionId,
                error: error.message,
                results: []
            };
        } finally {
            // Decrement concurrent executions
            this.concurrentExecutions--;
            
            // Clean up execution
            this.activeProcesses.delete(executionId);
        }
    }

    async waitForExecutionSlot() {
        while (this.concurrentExecutions >= this.maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    validateInputs(tool, domain, options) {
        if (!tool || typeof tool !== 'string') {
            throw new Error('Invalid tool name');
        }
        
        if (!domain || typeof domain !== 'string') {
            throw new Error('Invalid domain');
        }
        
        // Domain validation regex
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        if (!domainRegex.test(domain)) {
            throw new Error('Invalid domain format');
        }
        
        // Check for malicious inputs
        const maliciousPatterns = [
            /[;&|`$(){}[\]]/,  // Shell injection
            /\.\./,            // Path traversal
            /\x00/,            // Null bytes
        ];
        
        for (const pattern of maliciousPatterns) {
            if (pattern.test(domain) || pattern.test(tool)) {
                throw new Error('Potentially malicious input detected');
            }
        }
    }

    async getToolConfiguration(tool) {
        // Tool configurations with fallback implementations
        const toolConfigs = {
            // Subdomain Discovery Tools
            subfinder: {
                command: "subfinder",
                args: ["-d", "{domain}", "-all", "'-r","-o", "{outputFile}"],
                category: "subdomain",
                timeout: 180000,
                outputType: "domains",
                fallback: {
                    description: 'Not working'
                }
            },
            
            assetfinder: {
                command: 'assetfinder',
                args: ['--subs-only', '{domain}'],
                category: 'subdomain',
                timeout: 120000,
                outputType: 'domains'
            },
            
            amass: {
                command: 'amass',
                args: ['enum', '-passive', '-d', '{domain}', '-o', '{outputFile}'],
                category: 'subdomain',
                timeout: 300000,
                outputType: 'domains'
            },
            
            findomain: {
                command: 'findomain',
                args: ['-t', '{domain}', '-o'],
                category: 'subdomain',
                timeout: 120000,
                outputType: 'domains'
            },
            
            sublist3r: {
                command: 'sublist3r',
                args: ['-d', '{domain}', '-o', '{outputFile}'],
                category: 'subdomain',
                timeout: 180000,
                outputType: 'domains'
            },
            
            theharvester: {
                command: 'theHarvester',
                args: ['-d', '{domain}', '-b', 'all', '-f', '{outputFile}'],
                category: 'subdomain',
                timeout: 240000,
                outputType: 'domains'
            },
            
            crtsh: {
                command: 'curl',
                args: ['-s', 'https://crt.sh/?q=%.{domain}&output=json'],
                category: 'subdomain',
                timeout: 60000,
                outputType: 'domains'
            },
            
            // Active Discovery & Bruteforce Tools
            gobuster: {
                command: 'gobuster',
                args: ['dns', '-d', '{domain}', '-w', '/usr/share/wordlists/subdomains.txt', '-o', '{outputFile}'],
                category: 'active',
                timeout: 300000,
                outputType: 'domains'
            },
            
            ffuf: {
                command: 'ffuf',
                args: ['-w', '/usr/share/wordlists/subdomains.txt', '-u', 'http://FUZZ.{domain}', '-o', '{outputFile}'],
                category: 'active',
                timeout: 240000,
                outputType: 'domains'
            },
            
            // DNS Tools
            dig: {
                command: 'dig',
                args: ['{domain}', 'ANY', '+noall', '+answer'],
                category: 'dns',
                timeout: 30000,
                outputType: 'text'
            },
            
            whois: {
                command: 'whois',
                args: ['{domain}'],
                category: 'dns',
                timeout: 30000,
                outputType: 'text'
            },
            
            nslookup: {
                command: 'nslookup',
                args: ['{domain}'],
                fallback: {
                    command: 'sh',
                    args: ['-c', `dig +short {domain} A > {outputFile} && dig +short {domain} AAAA >> {outputFile} && dig +short {domain} MX >> {outputFile} && dig +short {domain} NS >> {outputFile} && dig +short {domain} TXT >> {outputFile}`]
                },
                category: 'dns',
                timeout: 30000,
                outputType: 'text'
            },
            
            host: {
                command: 'host',
                args: ['{domain}'],
                fallback: {
                    command: 'sh',
                    args: ['-c', `dig +short {domain} A | while read ip; do echo "{domain} has address $ip"; done > {outputFile} && dig +short {domain} MX | while read mx; do echo "{domain} mail is handled by $mx"; done >> {outputFile}`]
                },
                category: 'dns',
                timeout: 30000,
                outputType: 'text'
            },
            
            // JavaScript & API Mining Tools
            linkfinder: {
                command: 'linkfinder',
                args: ['-i', 'https://{domain}', '-o', 'cli'],
                fallback: {
                    command: 'sh',
                    args: ['-c', `curl -s "https://{domain}" | grep -oE 'https?://[^"\\s<>]+' | sort -u > {outputFile} && curl -s "https://{domain}/robots.txt" | grep -E '^(Allow|Disallow):' | cut -d':' -f2 | sed 's/^ *//' >> {outputFile} && curl -s "https://{domain}/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's/<[^>]*>//g' >> {outputFile}`]
                },
                category: 'javascript',
                timeout: 120000,
                outputType: 'text'
            },
            
            jsparser: {
                command: 'jsparser',
                args: ['-u', 'https://{domain}'],
                fallback: {
                    command: 'sh',
                    args: ['-c', `curl -s "https://{domain}" | grep -oE 'src="[^"]*\\.js[^"]*"' | cut -d'"' -f2 > {outputFile} && curl -s "https://{domain}" | grep -oE 'href="[^"]*\\.js[^"]*"' | cut -d'"' -f2 >> {outputFile} && curl -s "https://{domain}" | grep -oE 'https?://[^"\\s<>]+\\.js' >> {outputFile}`]
                },
                category: 'javascript',
                timeout: 90000,
                outputType: 'text'
            },
            
            // OSINT Tools
            shodan: {
                command: 'shodan',
                args: ['host', '{domain}'],
                fallback: {
                    command: 'sh',
                    args: ['-c', `curl -s "https://api.shodan.io/shodan/host/search?key=demo&query={domain}" | grep -oE '"ip_str":"[^"]*"' | cut -d'"' -f4 > {outputFile} && dig +short {domain} A >> {outputFile} && whois {domain} | grep -E '^(Organization|OrgName|org-name):' >> {outputFile}`]
                },
                category: 'osint',
                timeout: 60000,
                outputType: 'text'
            },
            
            spiderfoot: {
                command: 'spiderfoot',
                args: ['-s', '{domain}', '-t', 'SUBDOMAIN'],
                fallback: {
                    command: 'sh',
                    args: ['-c', `dig +short {domain} NS > {outputFile} && dig +short {domain} MX >> {outputFile} && dig +short {domain} A >> {outputFile} && whois {domain} | head -20 >> {outputFile} && curl -s "https://api.hackertarget.com/reverseiplookup/?q={domain}" >> {outputFile}`]
                },
                category: 'osint',
                timeout: 180000,
                outputType: 'text'
            }
        };
        
        const toolConfig = toolConfigs[tool];
        if (!toolConfig) {
            throw new Error(`Unknown tool: ${tool}`);
        }
        
        return toolConfig;
    }

    async createExecutionContext(tool, domain, options, executionId) {
        const timestamp = Date.now();
        const outputFile = path.join(
            config.paths.results,
            `${tool}_${domain}_${timestamp}_${executionId}.txt`
        );
        
        return {
            tool,
            domain,
            options,
            executionId,
            timestamp,
            outputFile,
            startTime: Date.now(),
            environment: {
                ...config.execution.environment,
                ADIYOGI_EXECUTION_ID: executionId,
                ADIYOGI_TOOL: tool,
                ADIYOGI_DOMAIN: domain
            }
        };
    }

    async runTool(toolConfig, context) {
        const { tool, domain, outputFile, executionId } = context;
        
        // Replace placeholders in command arguments
        const processedArgs = this.processCommandArgs(toolConfig.args, {
            domain,
            outputFile,
            executionId
        });
        
        return new Promise((resolve, reject) => {
            const timeout = toolConfig.timeout || config.execution.timeout;
            let process;
            let timeoutId;
            let stdout = '';
            let stderr = '';
            
            try {
                // Spawn process
                process = spawn(toolConfig.command, processedArgs, {
                    env: context.environment,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                    timeout: timeout
                });
                
                // Store process reference
                this.activeProcesses.set(executionId, {
                    process,
                    tool,
                    domain,
                    startTime: Date.now()
                });
                
                // Set timeout
                timeoutId = setTimeout(() => {
                    logger.warn('Tool execution timeout', { tool, domain, executionId });
                    this.killProcess(process);
                    reject(new Error(`Tool execution timeout after ${timeout}ms`));
                }, timeout);
                
                // Handle stdout
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                
                // Handle stderr
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                
                // Handle process completion
                process.on('close', async (code, signal) => {
                    clearTimeout(timeoutId);
                    
                    try {
                        // Try to read output file if it exists
                        let fileOutput = '';
                        try {
                            fileOutput = await fs.readFile(outputFile, 'utf8');
                        } catch (fileError) {
                            // File doesn't exist, use stdout
                            fileOutput = stdout;
                        }
                        
                        resolve({
                            code,
                            signal,
                            stdout,
                            stderr,
                            output: fileOutput,
                            outputFile
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
                
                // Handle process errors
                process.on('error', (error) => {
                    clearTimeout(timeoutId);
                    
                    // Try fallback if available
                    if (toolConfig.fallback && !context.fallbackAttempted) {
                        logger.info('Attempting fallback execution', { tool, domain });
                        context.fallbackAttempted = true;
                        this.runTool({ ...toolConfig, ...toolConfig.fallback }, context)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(error);
                    }
                });
                
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    processCommandArgs(args, replacements) {
        return args.map(arg => {
            let processedArg = arg;
            for (const [key, value] of Object.entries(replacements)) {
                processedArg = processedArg.replace(new RegExp(`{${key}}`, 'g'), value);
            }
            return processedArg;
        });
    }

    async processResults(tool, result, context) {
        const { output, outputFile } = result;
        
        try {
            // Parse results based on tool type
            const toolConfig = await this.getToolConfiguration(tool);
            let parsedResults = [];
            
            if (toolConfig.outputType === 'domains') {
                parsedResults = this.parseDomainsOutput(output, context.domain);
            } else {
                parsedResults = this.parseTextOutput(output);
            }
            
            // Clean up temporary files
            try {
                await fs.unlink(outputFile);
            } catch (cleanupError) {
                logger.warn('Failed to cleanup output file', { 
                    outputFile, 
                    error: cleanupError.message 
                });
            }
            
            return {
                results: parsedResults,
                count: parsedResults.length,
                rawOutput: output,
                metadata: {
                    tool,
                    domain: context.domain,
                    executionTime: Date.now() - context.startTime,
                    outputType: toolConfig.outputType
                }
            };
            
        } catch (error) {
            logger.error('Failed to process results', {
                tool,
                error: error.message
            });
            
            return {
                results: [],
                count: 0,
                rawOutput: output,
                error: error.message
            };
        }
    }

    parseDomainsOutput(output, baseDomain) {
        if (!output || typeof output !== 'string') {
            return [];
        }
        
        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) {
                    return false;
                }
                
                // Remove common non-domain patterns
                if (line.includes('Found') || line.includes('Error') || line.includes('timeout') || 
                    line.includes('connection') || line.includes('failed') || line.includes('not found')) {
                    return false;
                }
                
                // Extract domain from various formats
                let domain = line;
                if (line.includes('\t')) {
                    domain = line.split('\t')[0];
                }
                if (line.includes(' ')) {
                    const parts = line.split(' ');
                    domain = parts.find(part => part.includes('.') && part.includes(baseDomain)) || parts[0];
                }
                
                // Clean up domain
                domain = domain.replace(/[\[\](){}]/g, '').replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9.-]+$/, '');
                
                // Basic domain validation
                return domain.includes('.') && 
                       (domain.includes(baseDomain) || domain.endsWith('.' + baseDomain)) && 
                       domain.length > 3 &&
                       /^[a-zA-Z0-9.-]+$/.test(domain) &&
                       !domain.startsWith('.') &&
                       !domain.endsWith('.');
            })
            .map(line => {
                // Extract and clean domain
                let domain = line;
                if (line.includes('\t')) {
                    domain = line.split('\t')[0];
                }
                if (line.includes(' ')) {
                    const parts = line.split(' ');
                    domain = parts.find(part => part.includes('.') && part.includes(baseDomain)) || parts[0];
                }
                return domain.replace(/[\[\](){}]/g, '').replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9.-]+$/, '');
            })
            .filter((domain, index, arr) => arr.indexOf(domain) === index) // Remove duplicates
            .sort();
    }

    parseTextOutput(output) {
        if (!output || typeof output !== 'string') {
            return [];
        }
        
        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    killProcess(process) {
        if (!process || process.killed) {
            return;
        }
        
        try {
            // Try graceful termination first
            process.kill('SIGTERM');
            
            // Force kill after timeout
            setTimeout(() => {
                if (!process.killed) {
                    process.kill('SIGKILL');
                }
            }, config.execution.killTimeout);
        } catch (error) {
            logger.error('Failed to kill process', { error: error.message });
        }
    }

    killExecution(executionId) {
        const execution = this.activeProcesses.get(executionId);
        if (execution && execution.process) {
            this.killProcess(execution.process);
            this.activeProcesses.delete(executionId);
        }
    }

    async killAllProcesses() {
        logger.info('Killing all active processes', { 
            count: this.activeProcesses.size 
        });
        
        for (const [executionId, execution] of this.activeProcesses) {
            this.killProcess(execution.process);
        }
        
        this.activeProcesses.clear();
        
        if (this.processCleanupInterval) {
            clearInterval(this.processCleanupInterval);
        }
    }

    getStats() {
        return {
            activeProcesses: this.activeProcesses.size,
            concurrentExecutions: this.concurrentExecutions,
            maxConcurrent: this.maxConcurrent,
            queueLength: this.executionQueue.length
        };
    }
}

module.exports = ToolExecutor;
