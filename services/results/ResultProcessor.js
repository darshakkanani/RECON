/**
 * ========================================
 * ADIYOGI V2 - Result Processing Service
 * ========================================
 * 
 * Advanced result processing, filtering, and formatting service
 * with intelligent parsing and validation
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');
const config = require('../../config/app.config');

class ResultProcessor {
    constructor() {
        this.domainRegex = /^[a-zA-Z0-9.-]+$/;
        this.ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        this.urlRegex = /https?:\/\/[^\s]+/g;
        this.emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    }

    /**
     * Process tool execution results
     */
    async processResults(tool, rawOutput, domain, options = {}) {
        const {
            outputType = 'domains',
            maxResults = 10000,
            deduplicate = true,
            validate = true,
            sort = true
        } = options;

        try {
            logger.debug('Processing results', {
                tool,
                domain,
                outputType,
                rawOutputLength: rawOutput?.length || 0
            });

            if (!rawOutput || typeof rawOutput !== 'string') {
                return this.createEmptyResult(tool, domain);
            }

            let results = [];

            switch (outputType) {
                case 'domains':
                    results = this.parseDomainsOutput(rawOutput, domain);
                    break;
                case 'urls':
                    results = this.parseUrlsOutput(rawOutput);
                    break;
                case 'emails':
                    results = this.parseEmailsOutput(rawOutput);
                    break;
                case 'ips':
                    results = this.parseIPsOutput(rawOutput);
                    break;
                case 'json':
                    results = this.parseJsonOutput(rawOutput);
                    break;
                case 'text':
                default:
                    results = this.parseTextOutput(rawOutput);
                    break;
            }

            // Apply processing options
            if (validate) {
                results = this.validateResults(results, outputType, domain);
            }

            if (deduplicate) {
                results = this.deduplicateResults(results);
            }

            if (sort) {
                results = this.sortResults(results, outputType);
            }

            if (maxResults && results.length > maxResults) {
                results = results.slice(0, maxResults);
            }

            const processedResult = {
                tool,
                domain,
                results,
                count: results.length,
                outputType,
                processed: true,
                metadata: {
                    originalLength: rawOutput.length,
                    processedCount: results.length,
                    processingTime: Date.now()
                }
            };

            logger.debug('Results processed successfully', {
                tool,
                domain,
                originalLength: rawOutput.length,
                processedCount: results.length
            });

            return processedResult;

        } catch (error) {
            logger.error('Failed to process results', {
                tool,
                domain,
                error: error.message,
                stack: error.stack
            });

            return {
                tool,
                domain,
                results: [],
                count: 0,
                error: error.message,
                processed: false
            };
        }
    }

    /**
     * Parse domains output
     */
    parseDomainsOutput(output, baseDomain) {
        if (!output || typeof output !== 'string') {
            return [];
        }

        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('=')) {
                    return false;
                }

                // Basic domain validation
                return line.includes('.') && 
                       line.includes(baseDomain) && 
                       !line.includes(' ') && 
                       line.length > 3 &&
                       line.length < 253 &&
                       this.domainRegex.test(line);
            })
            .map(domain => domain.toLowerCase());
    }

    /**
     * Parse URLs output
     */
    parseUrlsOutput(output) {
        if (!output || typeof output !== 'string') {
            return [];
        }

        const urls = output.match(this.urlRegex) || [];
        return urls
            .map(url => url.trim())
            .filter(url => url.length > 0 && url.length < 2048);
    }

    /**
     * Parse emails output
     */
    parseEmailsOutput(output) {
        if (!output || typeof output !== 'string') {
            return [];
        }

        const emails = output.match(this.emailRegex) || [];
        return emails
            .map(email => email.toLowerCase().trim())
            .filter(email => email.length > 0 && email.length < 320);
    }

    /**
     * Parse IP addresses output
     */
    parseIPsOutput(output) {
        if (!output || typeof output !== 'string') {
            return [];
        }

        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                return line && this.ipRegex.test(line);
            });
    }

    /**
     * Parse JSON output
     */
    parseJsonOutput(output) {
        if (!output || typeof output !== 'string') {
            return [];
        }

        try {
            const parsed = JSON.parse(output);
            if (Array.isArray(parsed)) {
                return parsed;
            } else if (typeof parsed === 'object') {
                return [parsed];
            }
            return [];
        } catch (error) {
            // If JSON parsing fails, fall back to text parsing
            return this.parseTextOutput(output);
        }
    }

    /**
     * Parse text output
     */
    parseTextOutput(output) {
        if (!output || typeof output !== 'string') {
            return [];
        }

        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    /**
     * Validate results based on output type
     */
    validateResults(results, outputType, domain) {
        if (!Array.isArray(results)) {
            return [];
        }

        switch (outputType) {
            case 'domains':
                return results.filter(result => {
                    return typeof result === 'string' &&
                           result.includes('.') &&
                           result.includes(domain) &&
                           this.domainRegex.test(result);
                });

            case 'urls':
                return results.filter(result => {
                    return typeof result === 'string' &&
                           (result.startsWith('http://') || result.startsWith('https://'));
                });

            case 'emails':
                return results.filter(result => {
                    return typeof result === 'string' &&
                           result.includes('@') &&
                           result.includes('.');
                });

            case 'ips':
                return results.filter(result => {
                    return typeof result === 'string' &&
                           this.ipRegex.test(result);
                });

            default:
                return results.filter(result => {
                    return typeof result === 'string' && result.length > 0;
                });
        }
    }

    /**
     * Remove duplicate results
     */
    deduplicateResults(results) {
        if (!Array.isArray(results)) {
            return [];
        }

        return [...new Set(results)];
    }

    /**
     * Sort results based on output type
     */
    sortResults(results, outputType) {
        if (!Array.isArray(results)) {
            return [];
        }

        switch (outputType) {
            case 'domains':
                return results.sort((a, b) => {
                    // Sort by domain length first, then alphabetically
                    if (a.length !== b.length) {
                        return a.length - b.length;
                    }
                    return a.localeCompare(b);
                });

            case 'ips':
                return results.sort((a, b) => {
                    // Sort IPs numerically
                    const aNum = a.split('.').map(num => parseInt(num, 10).toString().padStart(3, '0')).join('');
                    const bNum = b.split('.').map(num => parseInt(num, 10).toString().padStart(3, '0')).join('');
                    return aNum.localeCompare(bNum);
                });

            default:
                return results.sort();
        }
    }

    /**
     * Filter results by criteria
     */
    filterResults(results, criteria = {}) {
        if (!Array.isArray(results)) {
            return [];
        }

        let filtered = results;

        // Filter by pattern
        if (criteria.pattern) {
            const regex = new RegExp(criteria.pattern, 'i');
            filtered = filtered.filter(result => regex.test(result));
        }

        // Filter by minimum length
        if (criteria.minLength) {
            filtered = filtered.filter(result => result.length >= criteria.minLength);
        }

        // Filter by maximum length
        if (criteria.maxLength) {
            filtered = filtered.filter(result => result.length <= criteria.maxLength);
        }

        // Filter by exclusion patterns
        if (criteria.exclude && Array.isArray(criteria.exclude)) {
            for (const excludePattern of criteria.exclude) {
                const regex = new RegExp(excludePattern, 'i');
                filtered = filtered.filter(result => !regex.test(result));
            }
        }

        // Filter by inclusion patterns
        if (criteria.include && Array.isArray(criteria.include)) {
            filtered = filtered.filter(result => {
                return criteria.include.some(includePattern => {
                    const regex = new RegExp(includePattern, 'i');
                    return regex.test(result);
                });
            });
        }

        return filtered;
    }

    /**
     * Format results for different output formats
     */
    formatResults(results, format = 'json') {
        if (!Array.isArray(results)) {
            return '';
        }

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(results, null, 2);

            case 'csv':
                return results.join(',');

            case 'txt':
            case 'text':
                return results.join('\n');

            case 'html':
                return `<ul>\n${results.map(result => `  <li>${result}</li>`).join('\n')}\n</ul>`;

            default:
                return results.join('\n');
        }
    }

    /**
     * Analyze results and provide statistics
     */
    analyzeResults(results, outputType = 'text') {
        if (!Array.isArray(results)) {
            return this.createEmptyAnalysis();
        }

        const analysis = {
            totalCount: results.length,
            uniqueCount: [...new Set(results)].length,
            duplicateCount: results.length - [...new Set(results)].length,
            averageLength: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.length, 0) / results.length) : 0,
            minLength: results.length > 0 ? Math.min(...results.map(r => r.length)) : 0,
            maxLength: results.length > 0 ? Math.max(...results.map(r => r.length)) : 0,
            patterns: this.analyzePatterns(results, outputType)
        };

        return analysis;
    }

    /**
     * Analyze patterns in results
     */
    analyzePatterns(results, outputType) {
        if (!Array.isArray(results) || results.length === 0) {
            return {};
        }

        const patterns = {};

        switch (outputType) {
            case 'domains':
                patterns.topLevelDomains = this.getTopLevelDomains(results);
                patterns.subdomainLevels = this.getSubdomainLevels(results);
                break;

            case 'urls':
                patterns.protocols = this.getProtocols(results);
                patterns.ports = this.getPorts(results);
                break;

            case 'ips':
                patterns.subnets = this.getSubnets(results);
                break;
        }

        return patterns;
    }

    /**
     * Get top level domains from domain results
     */
    getTopLevelDomains(domains) {
        const tlds = {};
        domains.forEach(domain => {
            const parts = domain.split('.');
            if (parts.length > 0) {
                const tld = parts[parts.length - 1];
                tlds[tld] = (tlds[tld] || 0) + 1;
            }
        });
        return Object.entries(tlds)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    }

    /**
     * Get subdomain levels
     */
    getSubdomainLevels(domains) {
        const levels = {};
        domains.forEach(domain => {
            const level = domain.split('.').length;
            levels[level] = (levels[level] || 0) + 1;
        });
        return levels;
    }

    /**
     * Get protocols from URLs
     */
    getProtocols(urls) {
        const protocols = {};
        urls.forEach(url => {
            const protocol = url.split(':')[0];
            protocols[protocol] = (protocols[protocol] || 0) + 1;
        });
        return protocols;
    }

    /**
     * Get ports from URLs
     */
    getPorts(urls) {
        const ports = {};
        urls.forEach(url => {
            const match = url.match(/:(\d+)/);
            if (match) {
                const port = match[1];
                ports[port] = (ports[port] || 0) + 1;
            }
        });
        return ports;
    }

    /**
     * Get subnets from IP addresses
     */
    getSubnets(ips) {
        const subnets = {};
        ips.forEach(ip => {
            const subnet = ip.split('.').slice(0, 3).join('.');
            subnets[subnet] = (subnets[subnet] || 0) + 1;
        });
        return Object.entries(subnets)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    }

    /**
     * Create empty result
     */
    createEmptyResult(tool, domain) {
        return {
            tool,
            domain,
            results: [],
            count: 0,
            processed: true,
            metadata: {
                originalLength: 0,
                processedCount: 0,
                processingTime: Date.now()
            }
        };
    }

    /**
     * Create empty analysis
     */
    createEmptyAnalysis() {
        return {
            totalCount: 0,
            uniqueCount: 0,
            duplicateCount: 0,
            averageLength: 0,
            minLength: 0,
            maxLength: 0,
            patterns: {}
        };
    }

    /**
     * Save results to file
     */
    async saveResults(results, filename, format = 'json') {
        try {
            const outputPath = path.join(config.paths.results, filename);
            const formattedResults = this.formatResults(results, format);
            
            await fs.writeFile(outputPath, formattedResults, 'utf8');
            
            logger.info('Results saved to file', {
                filename,
                format,
                resultCount: Array.isArray(results) ? results.length : 0,
                outputPath
            });

            return outputPath;
        } catch (error) {
            logger.error('Failed to save results', {
                filename,
                format,
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = ResultProcessor;
