/**
 * ========================================
 * ADIYOGI V2 - Input Validation Middleware
 * ========================================
 * 
 * Comprehensive input validation and sanitization
 */

const { createValidationError } = require('./errorHandler');

// Domain validation regex
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

// Tool name validation regex
const TOOL_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
        throw createValidationError('Domain is required and must be a string');
    }
    
    if (domain.length > 253) {
        throw createValidationError('Domain name too long (max 253 characters)');
    }
    
    if (!DOMAIN_REGEX.test(domain)) {
        throw createValidationError('Invalid domain format');
    }
    
    // Check for malicious patterns
    const maliciousPatterns = [
        /[;&|`$(){}[\]]/,  // Shell injection
        /\.\./,            // Path traversal
        /\x00/,            // Null bytes
    ];
    
    for (const pattern of maliciousPatterns) {
        if (pattern.test(domain)) {
            throw createValidationError('Potentially malicious domain detected');
        }
    }
    
    return domain.toLowerCase().trim();
}

function validateToolName(tool) {
    if (!tool || typeof tool !== 'string') {
        throw createValidationError('Tool name is required and must be a string');
    }
    
    if (tool.length > 50) {
        throw createValidationError('Tool name too long (max 50 characters)');
    }
    
    if (!TOOL_NAME_REGEX.test(tool)) {
        throw createValidationError('Invalid tool name format');
    }
    
    return tool.toLowerCase().trim();
}

function validateToolArray(tools) {
    if (!Array.isArray(tools)) {
        throw createValidationError('Tools must be an array');
    }
    
    if (tools.length === 0) {
        throw createValidationError('At least one tool must be specified');
    }
    
    if (tools.length > 20) {
        throw createValidationError('Too many tools specified (max 20)');
    }
    
    return tools.map(validateToolName);
}

function validator(req, res, next) {
    try {
        // Validate API endpoints
        if (req.path.startsWith('/api/v2/')) {
            // Validate common parameters
            if (req.body.domain) {
                req.body.domain = validateDomain(req.body.domain);
            }
            
            if (req.body.tool) {
                req.body.tool = validateToolName(req.body.tool);
            }
            
            if (req.body.tools) {
                req.body.tools = validateToolArray(req.body.tools);
            }
            
            // Validate query parameters
            if (req.query.domain) {
                req.query.domain = validateDomain(req.query.domain);
            }
            
            if (req.query.tool) {
                req.query.tool = validateToolName(req.query.tool);
            }
        }
        
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = validator;
