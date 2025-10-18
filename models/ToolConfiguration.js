/**
 * ========================================
 * ADIYOGI V2 - Tool Configuration Model
 * ========================================
 * 
 * Data model for tool configurations with
 * validation and utility methods
 */

class ToolConfiguration {
    constructor(data = {}) {
        this.name = data.name || '';
        this.command = data.command || '';
        this.args = data.args || [];
        this.category = data.category || '';
        this.timeout = data.timeout || 30000;
        this.outputType = data.outputType || 'text';
        this.description = data.description || '';
        this.fallback = data.fallback || null;
        this.requirements = data.requirements || [];
        this.platforms = data.platforms || ['linux', 'darwin', 'win32'];
        this.version = data.version || '1.0.0';
        this.author = data.author || 'ADIYOGI Team';
        this.tags = data.tags || [];
        this.enabled = data.enabled !== false;
        this.priority = data.priority || 'normal';
        this.rateLimit = data.rateLimit || null;
        this.metadata = data.metadata || {};
    }

    /**
     * Validate tool configuration
     */
    validate() {
        const errors = [];

        if (!this.name || typeof this.name !== 'string') {
            errors.push('Tool name is required and must be a string');
        }

        if (!this.command || typeof this.command !== 'string') {
            errors.push('Command is required and must be a string');
        }

        if (!Array.isArray(this.args)) {
            errors.push('Args must be an array');
        }

        if (!this.category || typeof this.category !== 'string') {
            errors.push('Category is required and must be a string');
        }

        if (typeof this.timeout !== 'number' || this.timeout <= 0) {
            errors.push('Timeout must be a positive number');
        }

        const validOutputTypes = ['text', 'domains', 'json', 'xml'];
        if (!validOutputTypes.includes(this.outputType)) {
            errors.push(`Output type must be one of: ${validOutputTypes.join(', ')}`);
        }

        const validPriorities = ['low', 'normal', 'high', 'critical'];
        if (!validPriorities.includes(this.priority)) {
            errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if tool is supported on current platform
     */
    isSupportedPlatform() {
        return this.platforms.includes(process.platform);
    }

    /**
     * Check if tool has fallback implementation
     */
    hasFallback() {
        return this.fallback !== null && typeof this.fallback === 'object';
    }

    /**
     * Get fallback configuration
     */
    getFallbackConfig() {
        if (!this.hasFallback()) {
            return null;
        }

        return new ToolConfiguration({
            ...this,
            ...this.fallback,
            name: `${this.name}_fallback`,
            fallback: null // Prevent infinite fallback chain
        });
    }

    /**
     * Process command arguments with variable substitution
     */
    processArgs(variables = {}) {
        return this.args.map(arg => {
            let processedArg = arg;
            for (const [key, value] of Object.entries(variables)) {
                const regex = new RegExp(`{${key}}`, 'g');
                processedArg = processedArg.replace(regex, value);
            }
            return processedArg;
        });
    }

    /**
     * Get execution timeout based on priority
     */
    getExecutionTimeout() {
        const priorityMultipliers = {
            low: 0.5,
            normal: 1.0,
            high: 1.5,
            critical: 2.0
        };

        const multiplier = priorityMultipliers[this.priority] || 1.0;
        return Math.round(this.timeout * multiplier);
    }

    /**
     * Check if rate limiting is enabled
     */
    hasRateLimit() {
        return this.rateLimit !== null && typeof this.rateLimit === 'object';
    }

    /**
     * Get rate limit configuration
     */
    getRateLimit() {
        if (!this.hasRateLimit()) {
            return null;
        }

        return {
            requests: this.rateLimit.requests || 10,
            window: this.rateLimit.window || 60000, // 1 minute
            ...this.rateLimit
        };
    }

    /**
     * Convert to JSON representation
     */
    toJSON() {
        return {
            name: this.name,
            command: this.command,
            args: this.args,
            category: this.category,
            timeout: this.timeout,
            outputType: this.outputType,
            description: this.description,
            fallback: this.fallback,
            requirements: this.requirements,
            platforms: this.platforms,
            version: this.version,
            author: this.author,
            tags: this.tags,
            enabled: this.enabled,
            priority: this.priority,
            rateLimit: this.rateLimit,
            metadata: this.metadata
        };
    }

    /**
     * Convert to API response format
     */
    toApiResponse() {
        return {
            name: this.name,
            category: this.category,
            description: this.description,
            outputType: this.outputType,
            timeout: this.timeout,
            platforms: this.platforms,
            tags: this.tags,
            enabled: this.enabled,
            priority: this.priority,
            hasFallback: this.hasFallback(),
            supportedPlatform: this.isSupportedPlatform(),
            version: this.version
        };
    }

    /**
     * Create from predefined tool configurations
     */
    static fromPredefined(toolName) {
        const predefinedTools = {
            subfinder: {
                name: 'subfinder',
                command: 'subfinder',
                args: ['-d', '{domain}', '-all', '-o', '{outputFile}', '-silent'],
                category: 'subdomain',
                timeout: 180000,
                outputType: 'domains',
                description: 'Fast passive subdomain enumeration tool',
                fallback: {
                    description: 'Not working'
                },
                requirements: ['subfinder'],
                tags: ['passive', 'fast', 'reliable'],
                priority: 'high'
            },
            amass: {
                name: 'amass',
                command: 'amass',
                args: ['enum', '-passive', '-d', '{domain}', '-o', '{outputFile}'],
                category: 'subdomain',
                timeout: 300000,
                outputType: 'domains',
                description: 'Advanced network reconnaissance tool',
                fallback: {
                    command: 'sh',
                    args: ['-c', `curl -s "https://api.securitytrails.com/v1/domain/{domain}/subdomains" -H "APIKEY: demo" | jq -r '.subdomains[]' 2>/dev/null | sed 's/$/\\.{domain}/' | sort -u > {outputFile} || echo "{domain}" > {outputFile}`]
                },
                requirements: ['amass'],
                tags: ['advanced', 'comprehensive', 'owasp'],
                priority: 'high'
            },
            dig: {
                name: 'dig',
                command: 'dig',
                args: ['{domain}', 'ANY', '+noall', '+answer'],
                category: 'dns',
                timeout: 30000,
                outputType: 'text',
                description: 'DNS lookup utility',
                requirements: ['dig'],
                tags: ['dns', 'system', 'fast'],
                priority: 'normal'
            },
            whois: {
                name: 'whois',
                command: 'whois',
                args: ['{domain}'],
                category: 'dns',
                timeout: 30000,
                outputType: 'text',
                description: 'Domain registration information lookup',
                requirements: ['whois'],
                tags: ['whois', 'system', 'information'],
                priority: 'normal'
            }
        };

        const toolConfig = predefinedTools[toolName];
        if (!toolConfig) {
            throw new Error(`Unknown predefined tool: ${toolName}`);
        }

        return new ToolConfiguration(toolConfig);
    }

    /**
     * Get all predefined tool names
     */
    static getPredefinedToolNames() {
        return [
            'subfinder', 'assetfinder', 'amass', 'findomain', 'sublist3r',
            'theharvester', 'crtsh', 'censys', 'chaos', 'altdns', 'dnsgen',
            'subdomainizer', 'sublert', 'subover', 'dig', 'whois', 'nslookup',
            'host', 'fierce', 'dnsmap', 'dnsenum', 'dnstwist', 'dmitry'
        ];
    }

    /**
     * Create multiple configurations from array
     */
    static createMultiple(configArray) {
        return configArray.map(config => new ToolConfiguration(config));
    }
}

module.exports = ToolConfiguration;
