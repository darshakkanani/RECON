/**
 * ========================================
 * ADIYOGI V2 - Advanced Logging System
 * ========================================
 * 
 * Comprehensive logging solution with multiple transports,
 * structured logging, performance monitoring, and error tracking.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Load config with fallback
let config;
try {
    config = require('../config/app.config');
} catch (error) {
    // Fallback configuration if config loading fails
    config = {
        paths: {
            logs: path.join(__dirname, '../logs')
        },
        logging: {
            level: 'info',
            console: { enabled: true },
            file: { enabled: true }
        },
        isDevelopment: process.env.NODE_ENV !== 'production'
    };
}

// Ensure log directory exists
const logDir = config.paths.logs;
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            log += ` | ${JSON.stringify(meta)}`;
        }
        
        // Add stack trace for errors
        if (stack) {
            log += `\n${stack}`;
        }
        
        return log;
    })
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `[${timestamp}] ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Create transports array
const transports = [];

// Always add console transport for debugging
transports.push(new winston.transports.Console({
    format: config.isDevelopment ? consoleFormat : logFormat,
    level: config.logging.level || 'info'
}));

// File transports
if (config.logging && config.logging.file && config.logging.file.enabled) {
    // General log file
    transports.push(new winston.transports.File({
        filename: path.join(logDir, 'adiyogi.log'),
        format: logFormat,
        level: config.logging.level,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
    }));

    // Error log file
    transports.push(new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        format: logFormat,
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
    }));

    // Tool execution log file
    transports.push(new winston.transports.File({
        filename: path.join(logDir, 'tools.log'),
        format: logFormat,
        level: 'info',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        tailable: true
    }));
}

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports,
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test'
});

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.timers = new Map();
        this.metrics = {
            requests: 0,
            errors: 0,
            toolExecutions: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }

    startTimer(id) {
        this.timers.set(id, {
            start: process.hrtime.bigint(),
            timestamp: new Date()
        });
        return id;
    }

    endTimer(id, context = {}) {
        const timer = this.timers.get(id);
        if (!timer) {
            logger.warn('Timer not found', { timerId: id });
            return null;
        }

        const end = process.hrtime.bigint();
        const duration = Number(end - timer.start) / 1000000; // Convert to milliseconds
        
        this.timers.delete(id);
        
        // Update metrics
        this.metrics.requests++;
        this.metrics.totalResponseTime += duration;
        this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requests;

        logger.info('Performance metric', {
            timerId: id,
            duration: `${duration.toFixed(2)}ms`,
            context
        });

        return duration;
    }

    recordError(error, context = {}) {
        this.metrics.errors++;
        logger.error('Error recorded', {
            error: error.message,
            stack: error.stack,
            context
        });
    }

    recordToolExecution(tool, domain, duration, success) {
        this.metrics.toolExecutions++;
        logger.info('Tool execution completed', {
            tool,
            domain,
            duration: `${duration}ms`,
            success,
            timestamp: new Date().toISOString()
        });
    }

    getMetrics() {
        return {
            ...this.metrics,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };
    }
}

// Create performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Enhanced logger with additional methods
class EnhancedLogger {
    constructor(winstonLogger, perfMonitor) {
        this.winston = winstonLogger;
        this.perf = perfMonitor;
    }

    // Standard logging methods
    debug(message, meta = {}) {
        this.winston.debug(message, meta);
    }

    info(message, meta = {}) {
        this.winston.info(message, meta);
    }

    warn(message, meta = {}) {
        this.winston.warn(message, meta);
    }

    error(message, meta = {}) {
        this.winston.error(message, meta);
        if (message instanceof Error) {
            this.perf.recordError(message, meta);
        }
    }

    // Tool-specific logging
    toolStart(tool, domain, options = {}) {
        const timerId = `tool_${tool}_${domain}_${Date.now()}`;
        this.perf.startTimer(timerId);
        
        this.info('Tool execution started', {
            tool,
            domain,
            options,
            timerId
        });
        
        return timerId;
    }

    toolEnd(timerId, tool, domain, results = {}) {
        const duration = this.perf.endTimer(timerId, { tool, domain });
        
        this.perf.recordToolExecution(
            tool,
            domain,
            duration,
            results.success !== false
        );

        this.info('Tool execution completed', {
            tool,
            domain,
            duration: `${duration?.toFixed(2)}ms`,
            resultCount: results.count || 0,
            success: results.success !== false
        });
    }

    toolError(tool, domain, error, timerId = null) {
        if (timerId) {
            this.perf.endTimer(timerId, { tool, domain, error: true });
        }

        this.error('Tool execution failed', {
            tool,
            domain,
            error: error.message,
            stack: error.stack
        });
    }

    // HTTP request logging
    httpRequest(req, res, duration) {
        const { method, url, ip, headers } = req;
        const { statusCode } = res;
        
        this.info('HTTP request', {
            method,
            url,
            ip,
            statusCode,
            duration: `${duration}ms`,
            userAgent: headers['user-agent'],
            referer: headers.referer
        });
    }

    // Security logging
    securityEvent(event, details = {}) {
        this.warn('Security event', {
            event,
            timestamp: new Date().toISOString(),
            ...details
        });
    }

    // System health logging
    systemHealth(metrics) {
        this.info('System health check', metrics);
    }

    // Performance metrics
    getMetrics() {
        return this.perf.getMetrics();
    }

    // Graceful shutdown
    async close() {
        return new Promise((resolve) => {
            this.winston.end(() => {
                resolve();
            });
        });
    }
}

// Create enhanced logger instance
const enhancedLogger = new EnhancedLogger(logger, performanceMonitor);

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    enhancedLogger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    enhancedLogger.error('Unhandled Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
    });
});

// Export logger
module.exports = enhancedLogger;
