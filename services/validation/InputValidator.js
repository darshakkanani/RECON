/**
 * ========================================
 * ADIYOGI V2 - Input Validation Service
 * ========================================
 * 
 * Comprehensive input validation and sanitization service
 * with security-focused validation rules
 */

const { createValidationError } = require('../../middleware/errorHandler');

class InputValidator {
    constructor() {
        this.domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        this.toolNameRegex = /^[a-zA-Z0-9_-]+$/;
        this.ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        this.urlRegex = /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/;
        
        this.maliciousPatterns = [
            /[;&|`$(){}[\]]/,  // Shell injection
            /\.\./,            // Path traversal
            /\x00/,            // Null bytes
            /<script/i,        // XSS
            /javascript:/i,    // JavaScript protocol
            /data:/i,          // Data protocol
            /vbscript:/i,      // VBScript protocol
        ];
    }

    /**
     * Validate domain name
     */
    validateDomain(domain, options = {}) {
        const {
            required = true,
            maxLength = 253,
            allowWildcard = false,
            allowIP = false
        } = options;

        if (!domain) {
            if (required) {
                throw createValidationError('Domain is required');
            }
            return null;
        }

        if (typeof domain !== 'string') {
            throw createValidationError('Domain must be a string');
        }

        const trimmedDomain = domain.trim().toLowerCase();

        if (trimmedDomain.length === 0) {
            if (required) {
                throw createValidationError('Domain cannot be empty');
            }
            return null;
        }

        if (trimmedDomain.length > maxLength) {
            throw createValidationError(`Domain name too long (max ${maxLength} characters)`);
        }

        // Check for malicious patterns
        this.checkMaliciousPatterns(trimmedDomain, 'domain');

        // Allow IP addresses if specified
        if (allowIP && this.ipRegex.test(trimmedDomain)) {
            return trimmedDomain;
        }

        // Handle wildcard domains
        if (allowWildcard && trimmedDomain.startsWith('*.')) {
            const domainWithoutWildcard = trimmedDomain.substring(2);
            if (!this.domainRegex.test(domainWithoutWildcard)) {
                throw createValidationError('Invalid wildcard domain format');
            }
            return trimmedDomain;
        }

        // Validate domain format
        if (!this.domainRegex.test(trimmedDomain)) {
            throw createValidationError('Invalid domain format');
        }

        // Additional domain validation
        this.validateDomainStructure(trimmedDomain);

        return trimmedDomain;
    }

    /**
     * Validate tool name
     */
    validateToolName(tool, options = {}) {
        const {
            required = true,
            maxLength = 50,
            allowedTools = null
        } = options;

        if (!tool) {
            if (required) {
                throw createValidationError('Tool name is required');
            }
            return null;
        }

        if (typeof tool !== 'string') {
            throw createValidationError('Tool name must be a string');
        }

        const trimmedTool = tool.trim().toLowerCase();

        if (trimmedTool.length === 0) {
            if (required) {
                throw createValidationError('Tool name cannot be empty');
            }
            return null;
        }

        if (trimmedTool.length > maxLength) {
            throw createValidationError(`Tool name too long (max ${maxLength} characters)`);
        }

        // Check for malicious patterns
        this.checkMaliciousPatterns(trimmedTool, 'tool name');

        // Validate tool name format
        if (!this.toolNameRegex.test(trimmedTool)) {
            throw createValidationError('Invalid tool name format (only alphanumeric, underscore, and hyphen allowed)');
        }

        // Check against allowed tools list
        if (allowedTools && Array.isArray(allowedTools)) {
            if (!allowedTools.includes(trimmedTool)) {
                throw createValidationError(`Tool '${trimmedTool}' is not allowed`);
            }
        }

        return trimmedTool;
    }

    /**
     * Validate array of tools
     */
    validateToolArray(tools, options = {}) {
        const {
            required = true,
            maxLength = 20,
            minLength = 1,
            allowedTools = null
        } = options;

        if (!tools) {
            if (required) {
                throw createValidationError('Tools array is required');
            }
            return null;
        }

        if (!Array.isArray(tools)) {
            throw createValidationError('Tools must be an array');
        }

        if (tools.length === 0) {
            if (minLength > 0) {
                throw createValidationError(`At least ${minLength} tool must be specified`);
            }
            return [];
        }

        if (tools.length > maxLength) {
            throw createValidationError(`Too many tools specified (max ${maxLength})`);
        }

        if (tools.length < minLength) {
            throw createValidationError(`At least ${minLength} tool(s) must be specified`);
        }

        // Validate each tool
        const validatedTools = tools.map(tool => 
            this.validateToolName(tool, { allowedTools })
        );

        // Check for duplicates
        const uniqueTools = [...new Set(validatedTools)];
        if (uniqueTools.length !== validatedTools.length) {
            throw createValidationError('Duplicate tools are not allowed');
        }

        return validatedTools;
    }

    /**
     * Validate URL
     */
    validateUrl(url, options = {}) {
        const {
            required = true,
            maxLength = 2048,
            allowedProtocols = ['http', 'https']
        } = options;

        if (!url) {
            if (required) {
                throw createValidationError('URL is required');
            }
            return null;
        }

        if (typeof url !== 'string') {
            throw createValidationError('URL must be a string');
        }

        const trimmedUrl = url.trim();

        if (trimmedUrl.length === 0) {
            if (required) {
                throw createValidationError('URL cannot be empty');
            }
            return null;
        }

        if (trimmedUrl.length > maxLength) {
            throw createValidationError(`URL too long (max ${maxLength} characters)`);
        }

        // Check for malicious patterns
        this.checkMaliciousPatterns(trimmedUrl, 'URL');

        // Validate URL format
        if (!this.urlRegex.test(trimmedUrl)) {
            throw createValidationError('Invalid URL format');
        }

        // Check protocol
        const protocol = trimmedUrl.split(':')[0].toLowerCase();
        if (!allowedProtocols.includes(protocol)) {
            throw createValidationError(`Protocol '${protocol}' is not allowed`);
        }

        return trimmedUrl;
    }

    /**
     * Validate IP address
     */
    validateIP(ip, options = {}) {
        const { required = true } = options;

        if (!ip) {
            if (required) {
                throw createValidationError('IP address is required');
            }
            return null;
        }

        if (typeof ip !== 'string') {
            throw createValidationError('IP address must be a string');
        }

        const trimmedIP = ip.trim();

        if (trimmedIP.length === 0) {
            if (required) {
                throw createValidationError('IP address cannot be empty');
            }
            return null;
        }

        // Check for malicious patterns
        this.checkMaliciousPatterns(trimmedIP, 'IP address');

        // Validate IP format
        if (!this.ipRegex.test(trimmedIP)) {
            throw createValidationError('Invalid IP address format');
        }

        return trimmedIP;
    }

    /**
     * Validate execution options
     */
    validateExecutionOptions(options = {}) {
        const validatedOptions = {};

        // Validate timeout
        if (options.timeout !== undefined) {
            if (typeof options.timeout !== 'number' || options.timeout <= 0) {
                throw createValidationError('Timeout must be a positive number');
            }
            if (options.timeout > 600000) { // 10 minutes max
                throw createValidationError('Timeout cannot exceed 10 minutes');
            }
            validatedOptions.timeout = options.timeout;
        }

        // Validate concurrent limit
        if (options.concurrent !== undefined) {
            if (typeof options.concurrent !== 'number' || options.concurrent <= 0) {
                throw createValidationError('Concurrent limit must be a positive number');
            }
            if (options.concurrent > 10) {
                throw createValidationError('Concurrent limit cannot exceed 10');
            }
            validatedOptions.concurrent = options.concurrent;
        }

        // Validate output format
        if (options.outputFormat !== undefined) {
            const allowedFormats = ['json', 'text', 'csv'];
            if (!allowedFormats.includes(options.outputFormat)) {
                throw createValidationError(`Output format must be one of: ${allowedFormats.join(', ')}`);
            }
            validatedOptions.outputFormat = options.outputFormat;
        }

        // Validate custom parameters
        if (options.customParams !== undefined) {
            if (typeof options.customParams !== 'object' || Array.isArray(options.customParams)) {
                throw createValidationError('Custom parameters must be an object');
            }
            
            // Validate each custom parameter
            for (const [key, value] of Object.entries(options.customParams)) {
                this.checkMaliciousPatterns(key, 'parameter key');
                if (typeof value === 'string') {
                    this.checkMaliciousPatterns(value, 'parameter value');
                }
            }
            
            validatedOptions.customParams = options.customParams;
        }

        return validatedOptions;
    }

    /**
     * Check for malicious patterns
     */
    checkMaliciousPatterns(input, fieldName = 'input') {
        for (const pattern of this.maliciousPatterns) {
            if (pattern.test(input)) {
                throw createValidationError(`Potentially malicious ${fieldName} detected`);
            }
        }
    }

    /**
     * Validate domain structure
     */
    validateDomainStructure(domain) {
        const parts = domain.split('.');
        
        // Must have at least 2 parts (domain.tld)
        if (parts.length < 2) {
            throw createValidationError('Domain must have at least two parts (domain.tld)');
        }

        // Each part validation
        for (const part of parts) {
            if (part.length === 0) {
                throw createValidationError('Domain parts cannot be empty');
            }
            
            if (part.length > 63) {
                throw createValidationError('Domain part cannot exceed 63 characters');
            }
            
            if (part.startsWith('-') || part.endsWith('-')) {
                throw createValidationError('Domain parts cannot start or end with hyphen');
            }
        }

        // TLD validation (last part)
        const tld = parts[parts.length - 1];
        if (!/^[a-zA-Z]{2,}$/.test(tld)) {
            throw createValidationError('Invalid top-level domain');
        }
    }

    /**
     * Sanitize string input
     */
    sanitizeString(input, options = {}) {
        const {
            maxLength = 1000,
            allowHTML = false,
            trim = true
        } = options;

        if (typeof input !== 'string') {
            return input;
        }

        let sanitized = input;

        if (trim) {
            sanitized = sanitized.trim();
        }

        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        if (!allowHTML) {
            // Remove HTML tags
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }

        return sanitized;
    }

    /**
     * Validate pagination parameters
     */
    validatePagination(params = {}) {
        const validated = {};

        if (params.page !== undefined) {
            const page = parseInt(params.page, 10);
            if (isNaN(page) || page < 1) {
                throw createValidationError('Page must be a positive integer');
            }
            if (page > 1000) {
                throw createValidationError('Page number too large (max 1000)');
            }
            validated.page = page;
        }

        if (params.limit !== undefined) {
            const limit = parseInt(params.limit, 10);
            if (isNaN(limit) || limit < 1) {
                throw createValidationError('Limit must be a positive integer');
            }
            if (limit > 1000) {
                throw createValidationError('Limit too large (max 1000)');
            }
            validated.limit = limit;
        }

        if (params.sort !== undefined) {
            const allowedSortFields = ['name', 'date', 'count', 'duration'];
            if (!allowedSortFields.includes(params.sort)) {
                throw createValidationError(`Sort field must be one of: ${allowedSortFields.join(', ')}`);
            }
            validated.sort = params.sort;
        }

        if (params.order !== undefined) {
            const allowedOrders = ['asc', 'desc'];
            if (!allowedOrders.includes(params.order.toLowerCase())) {
                throw createValidationError('Order must be either "asc" or "desc"');
            }
            validated.order = params.order.toLowerCase();
        }

        return validated;
    }
}

module.exports = InputValidator;
