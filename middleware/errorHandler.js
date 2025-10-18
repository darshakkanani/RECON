/**
 * ========================================
 * ADIYOGI V2 - Advanced Error Handler
 * ========================================
 * 
 * Comprehensive error handling middleware with:
 * - Structured error responses
 * - Security-aware error messages
 * - Performance monitoring
 * - Automatic error reporting
 */

const logger = require('../utils/logger');
const config = require('../config/app.config');

class ADIYOGIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
        super(message);
        this.name = 'ADIYOGIError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace
        Error.captureStackTrace(this, ADIYOGIError);
    }
}

// Predefined error types
const ErrorTypes = {
    VALIDATION_ERROR: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided'
    },
    AUTHENTICATION_ERROR: {
        statusCode: 401,
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required'
    },
    AUTHORIZATION_ERROR: {
        statusCode: 403,
        code: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions'
    },
    NOT_FOUND_ERROR: {
        statusCode: 404,
        code: 'NOT_FOUND_ERROR',
        message: 'Resource not found'
    },
    RATE_LIMIT_ERROR: {
        statusCode: 429,
        code: 'RATE_LIMIT_ERROR',
        message: 'Rate limit exceeded'
    },
    TOOL_EXECUTION_ERROR: {
        statusCode: 500,
        code: 'TOOL_EXECUTION_ERROR',
        message: 'Tool execution failed'
    },
    SYSTEM_ERROR: {
        statusCode: 500,
        code: 'SYSTEM_ERROR',
        message: 'Internal system error'
    }
};

// Error handler middleware
function errorHandler(error, req, res, next) {
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }
    
    // Generate error ID for tracking
    const errorId = generateErrorId();
    
    // Determine error details
    const errorDetails = processError(error, req, errorId);
    
    // Log error
    logError(error, req, errorDetails);
    
    // Send error response
    sendErrorResponse(res, errorDetails);
}

function processError(error, req, errorId) {
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details = {};
    
    // Handle different error types
    if (error instanceof ADIYOGIError) {
        // Custom ADIYOGI errors
        statusCode = error.statusCode;
        code = error.code;
        message = error.message;
        details = error.details;
    } else if (error.name === 'ValidationError') {
        // Validation errors (from Joi or similar)
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Invalid input provided';
        details = {
            validationErrors: error.details || error.message
        };
    } else if (error.name === 'MongoError' || error.name === 'CastError') {
        // Database errors
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = config.isProduction ? 'Database operation failed' : error.message;
    } else if (error.code === 'ENOENT') {
        // File not found errors
        statusCode = 404;
        code = 'FILE_NOT_FOUND';
        message = 'Requested file not found';
    } else if (error.code === 'EACCES') {
        // Permission errors
        statusCode = 403;
        code = 'PERMISSION_DENIED';
        message = 'Permission denied';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        // Network/timeout errors
        statusCode = 504;
        code = 'TIMEOUT_ERROR';
        message = 'Operation timed out';
    } else if (error.type === 'entity.parse.failed') {
        // JSON parsing errors
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
    } else if (error.type === 'entity.too.large') {
        // Payload too large
        statusCode = 413;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'Request payload too large';
    }
    
    // In production, don't expose internal error details
    if (config.isProduction && statusCode >= 500) {
        message = 'Internal server error';
        details = {};
    }
    
    return {
        errorId,
        statusCode,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        stack: config.isDevelopment ? error.stack : undefined
    };
}

function logError(error, req, errorDetails) {
    const logData = {
        errorId: errorDetails.errorId,
        statusCode: errorDetails.statusCode,
        code: errorDetails.code,
        message: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params,
        headers: sanitizeHeaders(req.headers)
    };
    
    // Log based on severity
    if (errorDetails.statusCode >= 500) {
        logger.error('Server error occurred', logData);
    } else if (errorDetails.statusCode >= 400) {
        logger.warn('Client error occurred', logData);
    } else {
        logger.info('Error handled', logData);
    }
}

function sendErrorResponse(res, errorDetails) {
    const response = {
        success: false,
        error: {
            id: errorDetails.errorId,
            code: errorDetails.code,
            message: errorDetails.message,
            timestamp: errorDetails.timestamp
        }
    };
    
    // Add details if available
    if (Object.keys(errorDetails.details).length > 0) {
        response.error.details = errorDetails.details;
    }
    
    // Add debug info in development
    if (config.isDevelopment) {
        response.debug = {
            path: errorDetails.path,
            method: errorDetails.method,
            stack: errorDetails.stack
        };
    }
    
    res.status(errorDetails.statusCode).json(response);
}

function generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeHeaders(headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

// Async error wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Error factory functions
function createValidationError(message, details = {}) {
    return new ADIYOGIError(
        message,
        ErrorTypes.VALIDATION_ERROR.statusCode,
        ErrorTypes.VALIDATION_ERROR.code,
        details
    );
}

function createNotFoundError(resource = 'Resource') {
    return new ADIYOGIError(
        `${resource} not found`,
        ErrorTypes.NOT_FOUND_ERROR.statusCode,
        ErrorTypes.NOT_FOUND_ERROR.code
    );
}

function createToolExecutionError(tool, message, details = {}) {
    return new ADIYOGIError(
        `Tool execution failed: ${message}`,
        ErrorTypes.TOOL_EXECUTION_ERROR.statusCode,
        ErrorTypes.TOOL_EXECUTION_ERROR.code,
        { tool, ...details }
    );
}

function createSystemError(message, details = {}) {
    return new ADIYOGIError(
        message,
        ErrorTypes.SYSTEM_ERROR.statusCode,
        ErrorTypes.SYSTEM_ERROR.code,
        details
    );
}

module.exports = {
    errorHandler,
    asyncHandler,
    ADIYOGIError,
    ErrorTypes,
    createValidationError,
    createNotFoundError,
    createToolExecutionError,
    createSystemError
};
