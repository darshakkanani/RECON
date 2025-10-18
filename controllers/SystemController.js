/**
 * ========================================
 * ADIYOGI V2 - System Controller
 * ========================================
 * 
 * Controller for system-level operations, health checks,
 * and administrative functions
 */

const fs = require('fs').promises;
const path = require('path');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config/app.config');

class SystemController {
    constructor() {
        this.bindMethods();
    }

    bindMethods() {
        this.getSystemHealth = this.getSystemHealth.bind(this);
        this.getDetailedHealth = this.getDetailedHealth.bind(this);
        this.getSystemInfo = this.getSystemInfo.bind(this);
        this.getSystemMetrics = this.getSystemMetrics.bind(this);
        this.getSystemLogs = this.getSystemLogs.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.getConfiguration = this.getConfiguration.bind(this);
    }

    /**
     * Get basic system health
     */
    async getSystemHealth(req, res) {
        const health = await this.performHealthChecks();
        
        logger.info('System health check requested', {
            requestId: req.requestId,
            status: health.status
        });
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            data: health,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get detailed system health
     */
    async getDetailedHealth(req, res) {
        const health = await this.performDetailedHealthChecks();
        
        logger.info('Detailed health check requested', {
            requestId: req.requestId,
            status: health.status
        });
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            data: health,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get comprehensive system information
     */
    async getSystemInfo(req, res) {
        const systemInfo = {
            application: {
                name: config.app.name,
                version: config.app.version,
                environment: config.app.environment,
                uptime: process.uptime(),
                startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
            },
            runtime: {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                pid: process.pid,
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            },
            system: {
                hostname: require('os').hostname(),
                type: require('os').type(),
                release: require('os').release(),
                totalMemory: require('os').totalmem(),
                freeMemory: require('os').freemem(),
                loadAverage: require('os').loadavg(),
                cpuCount: require('os').cpus().length
            },
            configuration: {
                port: config.server.port,
                environment: config.app.environment,
                logLevel: config.logging.level,
                maxConcurrent: config.execution.maxConcurrent,
                timeout: config.execution.timeout
            }
        };
        
        logger.info('System info requested', {
            requestId: req.requestId
        });
        
        res.json({
            success: true,
            data: systemInfo,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get system metrics
     */
    async getSystemMetrics(req, res) {
        const metrics = logger.getMetrics();
        const { toolExecutor } = req;
        const toolStats = toolExecutor?.getStats() || {};
        
        const systemMetrics = {
            application: metrics,
            toolExecutor: toolStats,
            runtime: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            },
            system: {
                loadAverage: require('os').loadavg(),
                freeMemory: require('os').freemem(),
                totalMemory: require('os').totalmem()
            }
        };
        
        logger.info('System metrics requested', {
            requestId: req.requestId
        });
        
        res.json({
            success: true,
            data: systemMetrics,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get recent system logs
     */
    async getSystemLogs(req, res) {
        const { lines = 100, level = 'info' } = req.query;
        
        try {
            const logFile = path.join(config.paths.logs, 'adiyogi.log');
            const logContent = await fs.readFile(logFile, 'utf8');
            const logLines = logContent.split('\n')
                .filter(line => line.trim())
                .slice(-parseInt(lines))
                .filter(line => {
                    if (level === 'all') return true;
                    return line.toLowerCase().includes(level.toLowerCase());
                });
            
            logger.info('System logs requested', {
                requestId: req.requestId,
                lines: parseInt(lines),
                level,
                returnedLines: logLines.length
            });
            
            res.json({
                success: true,
                data: {
                    logs: logLines,
                    totalLines: logLines.length,
                    level,
                    requestedLines: parseInt(lines)
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Failed to read system logs', {
                error: error.message,
                requestId: req.requestId
            });
            
            res.json({
                success: false,
                error: 'Failed to read system logs',
                data: {
                    logs: [],
                    totalLines: 0
                },
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Clear system cache
     */
    async clearCache(req, res) {
        try {
            const cacheDir = config.paths.cache;
            
            // Clear cache directory if it exists
            try {
                const files = await fs.readdir(cacheDir);
                for (const file of files) {
                    await fs.unlink(path.join(cacheDir, file));
                }
            } catch (error) {
                // Cache directory might not exist, that's okay
            }
            
            logger.info('System cache cleared', {
                requestId: req.requestId
            });
            
            res.json({
                success: true,
                data: {
                    message: 'Cache cleared successfully',
                    cacheDir
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Failed to clear cache', {
                error: error.message,
                requestId: req.requestId
            });
            
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get system configuration (sanitized)
     */
    async getConfiguration(req, res) {
        // Return sanitized configuration (no sensitive data)
        const sanitizedConfig = {
            app: {
                name: config.app.name,
                version: config.app.version,
                environment: config.app.environment
            },
            server: {
                port: config.server.port,
                timeout: config.server.timeout
            },
            execution: {
                timeout: config.execution.timeout,
                maxConcurrent: config.execution.maxConcurrent
            },
            logging: {
                level: config.logging.level
            },
            tools: {
                categories: Object.keys(config.tools.categories)
            }
        };
        
        logger.info('Configuration requested', {
            requestId: req.requestId
        });
        
        res.json({
            success: true,
            data: sanitizedConfig,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Perform basic health checks
     */
    async performHealthChecks() {
        const checks = {
            filesystem: await this.checkFilesystem(),
            memory: this.checkMemory(),
            uptime: process.uptime()
        };
        
        const isHealthy = Object.values(checks).every(check => 
            typeof check === 'object' ? check.status === 'ok' : true
        );
        
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            version: config.app.version,
            environment: config.app.environment,
            checks
        };
    }

    /**
     * Perform detailed health checks
     */
    async performDetailedHealthChecks() {
        const checks = {
            filesystem: await this.checkFilesystem(),
            memory: this.checkMemory(),
            cpu: process.cpuUsage(),
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
            loadAverage: require('os').loadavg()
        };
        
        const isHealthy = checks.filesystem.status === 'ok' && checks.memory.status === 'ok';
        
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            version: config.app.version,
            environment: config.app.environment,
            checks
        };
    }

    /**
     * Check filesystem health
     */
    async checkFilesystem() {
        try {
            const directories = [
                config.paths.results,
                config.paths.logs,
                config.paths.temp
            ];
            
            for (const dir of directories) {
                await fs.access(dir);
            }
            
            return {
                status: 'ok',
                message: 'All required directories accessible'
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Filesystem check failed: ${error.message}`
            };
        }
    }

    /**
     * Check memory usage
     */
    checkMemory() {
        const usage = process.memoryUsage();
        const totalMB = Math.round(usage.rss / 1024 / 1024);
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        
        // Consider unhealthy if using more than 1GB
        const isHealthy = totalMB < 1024;
        
        return {
            status: isHealthy ? 'ok' : 'warning',
            totalMB,
            heapUsedMB,
            heapTotalMB,
            message: isHealthy ? 'Memory usage normal' : 'High memory usage detected'
        };
    }
}

// Create and export controller instance
const systemController = new SystemController();

module.exports = {
    SystemController,
    // Export bound methods for use in routes
    getSystemHealth: asyncHandler(systemController.getSystemHealth),
    getDetailedHealth: asyncHandler(systemController.getDetailedHealth),
    getSystemInfo: asyncHandler(systemController.getSystemInfo),
    getSystemMetrics: asyncHandler(systemController.getSystemMetrics),
    getSystemLogs: asyncHandler(systemController.getSystemLogs),
    clearCache: asyncHandler(systemController.clearCache),
    getConfiguration: asyncHandler(systemController.getConfiguration)
};
