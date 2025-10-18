/**
 * ========================================
 * ADIYOGI V2 - Request Logging Middleware
 * ========================================
 * 
 * Advanced request logging with performance monitoring
 */

const logger = require('../utils/logger');

function requestLogger(req, res, next) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Log request start
    logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - startTime;
        
        logger.httpRequest(req, res, duration);
        
        originalEnd.apply(this, args);
    };
    
    next();
}

module.exports = requestLogger;
