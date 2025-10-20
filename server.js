/**
 * ========================================
 * ADIYOGI V2 - Perfect Production Server
 * ========================================
 * 
 * Complete enterprise-grade backend with all features:
 * - Advanced security and monitoring
 * - Tool execution engine
 * - Comprehensive API
 * - Production-ready architecture
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import configuration and utilities
const config = require('./config/app.config');
const logger = require('./utils/logger');

// Import services
const ToolExecutor = require('./services/execution/ToolExecutor');
const ResultProcessor = require('./services/results/ResultProcessor');
const InputValidator = require('./services/validation/InputValidator');

// Import controllers
const {
    getAvailableTools,
    executeSingleTool,
    executeMultipleTools,
    getExecutionStatus,
    getToolStatistics,
    getToolCategories
} = require('./controllers/ToolController');

const {
    getSystemHealth,
    getDetailedHealth,
    getSystemInfo,
    getSystemMetrics,
    getSystemLogs,
    clearCache,
    getConfiguration
} = require('./controllers/SystemController');

class PerfectADIYOGIServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.toolExecutor = null;
        this.resultProcessor = null;
        this.inputValidator = null;
        this.isShuttingDown = false;
        
        this.initializeServer();
    }

    async initializeServer() {
        try {
            logger.info('🚀 Starting ADIYOGI V2 Perfect Server...');
            
            // Initialize services
            await this.initializeServices();
            
            // Setup middleware
            this.setupMiddleware();
            
            // Setup routes
            this.setupRoutes();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            
            logger.info('✅ ADIYOGI V2 Perfect Server initialized successfully');
            
        } catch (error) {
            logger.error('❌ Failed to initialize perfect server', { error: error.message });
            process.exit(1);
        }
    }

    async initializeServices() {
        // Initialize tool executor
        this.toolExecutor = new ToolExecutor();
        
        // Initialize result processor
        this.resultProcessor = new ResultProcessor();
        
        // Initialize input validator
        this.inputValidator = new InputValidator();
        
        // Ensure required directories exist
        await this.ensureDirectories();
        
        logger.info('🔧 All services initialized successfully');
    }

    async ensureDirectories() {
        const directories = [
            config.paths.results,
            config.paths.logs,
            config.paths.cache,
            config.paths.temp
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                logger.debug(`📁 Directory ensured: ${dir}`);
            } catch (error) {
                logger.error(`❌ Failed to create directory: ${dir}`, { error: error.message });
                throw error;
            }
        }
    }

    setupMiddleware() {
        // Trust proxy for production
        this.app.set('trust proxy', 1);
        
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    // Allow inline scripts and inline handlers for simple navigation/buttons
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    // Allow inline handlers like onclick
                    'script-src-attr': ["'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: config.isProduction ? 100 : 1000, // requests per window
            message: {
                success: false,
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.securityEvent('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path
                });
                res.status(429).json({
                    success: false,
                    error: 'Too many requests from this IP, please try again later.',
                    retryAfter: '15 minutes'
                });
            }
        });
        this.app.use(limiter);
        
        // CORS
        this.app.use(cors({
            origin: config.isProduction ? ['https://adiyogi.com'] : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        
        // Compression
        this.app.use(compression());
        
        // Body parsing with limits
        this.app.use(express.json({ 
            limit: '10mb',
            strict: true
        }));
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: '10mb' 
        }));
        
        // Request logging middleware
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            req.requestId = requestId;
            req.startTime = startTime;
            
            // Log request
            logger.info('📥 Request received', {
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
                logger.info('📤 Request completed', {
                    requestId,
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip
                });
                originalEnd.apply(this, args);
            };
            
            next();
        });
        
        // Input validation middleware
        this.app.use((req, res, next) => {
            try {
                // Validate API endpoints
                if (req.path.startsWith('/api/v2/')) {
                    // Validate common parameters
                    if (req.body.domain) {
                        req.body.domain = this.inputValidator.validateDomain(req.body.domain);
                    }
                    
                    if (req.body.tool) {
                        req.body.tool = this.inputValidator.validateToolName(req.body.tool);
                    }
                    
                    if (req.body.tools) {
                        req.body.tools = this.inputValidator.validateToolArray(req.body.tools);
                    }
                    
                    // Validate query parameters
                    if (req.query.domain) {
                        req.query.domain = this.inputValidator.validateDomain(req.query.domain);
                    }
                    
                    if (req.query.tool) {
                        req.query.tool = this.inputValidator.validateToolName(req.query.tool);
                    }
                }
                
                next();
            } catch (error) {
                logger.securityEvent('Input validation failed', {
                    error: error.message,
                    path: req.path,
                    body: req.body,
                    query: req.query,
                    ip: req.ip
                });
                res.status(400).json({
                    success: false,
                    error: error.message,
                    code: 'VALIDATION_ERROR'
                });
            }
        });
        
        // Add services to request context
        this.app.use((req, res, next) => {
            req.toolExecutor = this.toolExecutor;
            req.resultProcessor = this.resultProcessor;
            req.inputValidator = this.inputValidator;
            req.config = config;
            next();
        });
        
        logger.info('🛡️ All middleware configured successfully');
    }

    setupRoutes() {
        // Health check routes
        this.app.get('/health', getSystemHealth);
        this.app.get('/health/detailed', getDetailedHealth);
        this.app.get('/health/info', getSystemInfo);
        this.app.get('/health/metrics', getSystemMetrics);
        this.app.get('/health/logs', getSystemLogs);
        this.app.post('/health/cache/clear', clearCache);
        this.app.get('/health/config', getConfiguration);
        
        // Kubernetes probes
        this.app.get('/health/ready', (req, res) => {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
        
        this.app.get('/health/live', (req, res) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                pid: process.pid
            });
        });
        
        // API v2 routes
        this.app.get('/api/v2/tools', getAvailableTools);
        this.app.get('/api/v2/categories', getToolCategories);
        this.app.post('/api/v2/execute/single', executeSingleTool);
        this.app.post('/api/v2/execute/multiple', executeMultipleTools);
        this.app.get('/api/v2/execution/:executionId', getExecutionStatus);
        this.app.get('/api/v2/stats', getToolStatistics);
        
        // Bulk domain discovery endpoint
        this.app.post('/api/v2/bulk-discovery', async (req, res) => {
            try {
                const { domains, tools, options = {} } = req.body;
                
                if (!domains || !Array.isArray(domains) || domains.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Domains array is required and must not be empty'
                    });
                }
                
                if (!tools || !Array.isArray(tools) || tools.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Tools array is required and must not be empty'
                    });
                }
                
                logger.info('🔄 Bulk domain discovery requested', {
                    domainCount: domains.length,
                    tools,
                    options,
                    requestId: req.requestId
                });
                
                const results = [];
                let totalSubdomains = 0;
                
                // Process each domain
                for (const domain of domains) {
                    const domainTrimmed = domain.trim();
                    if (!domainTrimmed) continue;
                    
                    logger.info('Processing domain in bulk discovery', { domain: domainTrimmed, tools });
                    
                    try {
                        const domainResult = await this.toolExecutor.executeTools(tools, domainTrimmed, options);
                        
                        if (domainResult.success) {
                            const domainSubdomains = domainResult.results.reduce((sum, toolResult) => {
                                return sum + (toolResult.count || 0);
                            }, 0);
                            
                            totalSubdomains += domainSubdomains;
                            
                            results.push({
                                domain: domainTrimmed,
                                success: true,
                                results: domainResult.results,
                                totalSubdomains: domainSubdomains,
                                executionId: domainResult.executionId,
                                duration: domainResult.duration
                            });
                        } else {
                            results.push({
                                domain: domainTrimmed,
                                success: false,
                                error: domainResult.error,
                                results: []
                            });
                        }
                    } catch (domainError) {
                        logger.error('Error processing domain in bulk discovery', {
                            domain: domainTrimmed,
                            error: domainError.message
                        });
                        
                        results.push({
                            domain: domainTrimmed,
                            success: false,
                            error: domainError.message,
                            results: []
                        });
                    }
                }
                
                logger.info('Bulk domain discovery completed', {
                    processedDomains: results.length,
                    totalSubdomains,
                    successfulDomains: results.filter(r => r.success).length
                });
                
                res.json({
                    success: true,
                    results,
                    summary: {
                        totalDomains: domains.length,
                        processedDomains: results.length,
                        successfulDomains: results.filter(r => r.success).length,
                        totalSubdomains,
                        tools
                    },
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('Bulk domain discovery failed', {
                    error: error.message
                });
                
                res.status(500).json({
                    success: false,
                    error: 'Bulk domain discovery failed: ' + error.message
                });
            }
        });
        
        // Legacy compatibility endpoint
        this.app.post('/api/v2/run-tools', async (req, res) => {
            try {
                const { tools, domain, options = {} } = req.body;
                
                if (!tools || !domain) {
                    return res.status(400).json({
                        success: false,
                        error: 'Tools array and domain are required'
                    });
                }
                
                logger.info('🔄 Legacy multi-tool execution requested', {
                    tools,
                    domain,
                    options,
                    requestId: req.requestId
                });
                
                const result = await this.toolExecutor.executeTools(tools, domain, options);
                
                if (!result.success) {
                    return res.status(500).json({
                        success: false,
                        error: result.error
                    });
                }
                
                // Format results for legacy frontend compatibility
                const formattedResults = [];
                
                for (const toolResult of result.results) {
                    if (toolResult.success && toolResult.results) {
                        formattedResults.push(`\n=== ${toolResult.tool.toUpperCase()} RESULTS (${toolResult.count} found) ===`);
                        formattedResults.push(...toolResult.results);
                    } else {
                        formattedResults.push(`\n=== ${toolResult.tool.toUpperCase()} RESULTS ===`);
                        formattedResults.push(toolResult.error || 'No results found');
                    }
                }
                
                res.json({
                    success: true,
                    domain,
                    tools,
                    results: formattedResults,
                    count: formattedResults.length,
                    timestamp: result.metadata.timestamp
                });
                
            } catch (error) {
                logger.error('Legacy API error', { error: error.message, requestId: req.requestId });
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Serve frontend files with safe caching (no-store for HTML to avoid stale UI)
        this.app.use(express.static(config.paths.frontend, {
            etag: true,
            lastModified: true,
            index: false,
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    // Ensure HTML is always fresh (prevents navbar JS from being cached)
                    res.setHeader('Cache-Control', 'no-store');
                } else {
                    // Cache static assets differently for dev/prod
                    if (config.isProduction) {
                        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
                    } else {
                        res.setHeader('Cache-Control', 'no-cache');
                    }
                }
            }
        }));

        // Extra safety: force no-store on root and HTML routes
        this.app.use((req, res, next) => {
            if (req.path === '/' || req.path.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-store');
            }
            next();
        });
        
        // Frontend routes - Clean and essential only
        const frontendRoutes = {
            '/': 'pages/dashboard.html',
            '/dashboard': 'pages/dashboard.html',
            '/home': 'pages/home.html',
            '/recon': 'pages/recon-hub.html',
            '/subdomain-discovery': 'pages/hubs/subdomain-discovery-hub.html',
            '/active-discovery': 'pages/hubs/active-discovery-hub.html',
            '/dns': 'pages/hubs/dns-whois-hub.html',
            '/osint': 'pages/hubs/osint-intelligence-hub.html',
            '/javascript-mining': 'pages/hubs/javascript-api-hub.html',
            '/code-repository': 'pages/hubs/code-repository-hub.html',
            '/subdomain': 'pages/tools/subdomain-enumeration.html',
            '/active': 'pages/tools/active-discovery.html',
            '/javascript': 'pages/tools/javascript-mining.html',
            '/code': 'pages/tools/code-search.html',
            '/parameters': 'pages/tools/parameter-fuzzing.html',
            '/webapp': 'pages/tools/web-application-security.html',
            '/cloud': 'pages/tools/cloud-infrastructure.html',
            '/mobile': 'pages/tools/mobile-api-security.html'
        };
        
        Object.entries(frontendRoutes).forEach(([route, file]) => {
            this.app.get(route, (req, res) => {
                res.sendFile(path.join(config.paths.frontend, file));
            });
        });
        
        
        // 404 handler
        this.app.use('*', (req, res) => {
            logger.warn('404 - Route not found', {
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });
        
        logger.info('🛣️ All routes configured successfully');
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            logger.error('🚨 Unhandled error', {
                errorId,
                error: error.message,
                stack: error.stack,
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
                requestId: req.requestId
            });
            
            const statusCode = error.statusCode || 500;
            const response = {
                success: false,
                error: {
                    id: errorId,
                    message: config.isProduction ? 'Internal server error' : error.message,
                    timestamp: new Date().toISOString()
                }
            };
            
            if (config.isDevelopment) {
                response.debug = {
                    stack: error.stack,
                    path: req.originalUrl,
                    method: req.method
                };
            }
            
            res.status(statusCode).json(response);
        });
        
        logger.info('🛡️ Error handling configured successfully');
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                logger.warn('Shutdown already in progress');
                return;
            }
            
            this.isShuttingDown = true;
            logger.info(`🔄 Starting graceful shutdown due to ${signal}`);
            
            try {
                // Stop accepting new connections
                if (this.server) {
                    this.server.close(() => {
                        logger.info('🔌 HTTP server closed');
                    });
                }
                
                // Kill all active tool processes
                if (this.toolExecutor) {
                    await this.toolExecutor.killAllProcesses();
                    logger.info('🔧 All tool processes terminated');
                }
                
                // Close logger
                await logger.close();
                
                logger.info('✅ Graceful shutdown completed');
                process.exit(0);
                
            } catch (error) {
                logger.error('❌ Error during graceful shutdown', { error: error.message });
                process.exit(1);
            }
        };
        
        // Graceful shutdown handlers
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('💥 Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            shutdown('UNCAUGHT_EXCEPTION');
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 Unhandled Promise Rejection', {
                reason: reason?.message || reason,
                stack: reason?.stack
            });
            shutdown('UNHANDLED_REJECTION');
        });
        
        logger.info('🛡️ Graceful shutdown handlers configured');
    }

    async start() {
        return new Promise((resolve, reject) => {
            try {
                const PORT = process.env.PORT || config.server.port;
                const HOST = process.env.HOST || config.server.host;
                
                this.server = this.app.listen(PORT, HOST, () => {
                    const { address, port } = this.server.address();
                    const host = address === '::' ? 'localhost' : address;
                    
                    logger.info('🚀 ADIYOGI V2 Perfect Server Started', {
                        version: config.app.version,
                        environment: config.app.environment,
                        host,
                        port,
                        url: `http://${host}:${port}`,
                        pid: process.pid,
                        nodeVersion: process.version,
                        platform: process.platform
                    });
                    
                    // Log available endpoints
                    console.log(`\n🎯 ADIYOGI V2 Perfect Server Running!`);
                    console.log(`📋 Available Endpoints:`);
                    console.log(`   🏠 Frontend: http://${host}:${port}/`);
                    console.log(`   ❤️  Health: http://${host}:${port}/health`);
                    console.log(`   🔧 API: http://${host}:${port}/api/v2/tools`);
                    console.log(`   📊 Stats: http://${host}:${port}/api/v2/stats`);
                    console.log(`   🎯 Subdomain Discovery: http://${host}:${port}/subdomain-discovery`);
                    console.log(`   🔍 Recon Hub: http://${host}:${port}/recon`);
                    console.log(`\n🛡️ Security Features: Rate limiting, Input validation, CORS, Helmet`);
                    console.log(`🔧 Tool Executor: ${this.toolExecutor.maxConcurrent} concurrent executions`);
                    console.log(`📝 Logging: Structured logging with performance monitoring`);
                    console.log(`\n✅ Perfect Backend Ready for Production! 🎉\n`);
                    
                    resolve(this.server);
                });
                
                // Configure server settings
                this.server.timeout = config.server.timeout;
                this.server.keepAliveTimeout = config.server.keepAliveTimeout;
                this.server.headersTimeout = config.server.headersTimeout;
                this.server.maxConnections = config.server.maxConnections;
                
                // Handle server errors
                this.server.on('error', (error) => {
                    logger.error('Server error', { error: error.message });
                    reject(error);
                });
                
            } catch (error) {
                logger.error('Failed to start perfect server', { error: error.message });
                reject(error);
            }
        });
    }

    async stop() {
        logger.info('Stopping ADIYOGI V2 Perfect Server...');
        await this.gracefulShutdown('MANUAL_STOP');
    }
}

// Create and export server instance
const perfectServer = new PerfectADIYOGIServer();

// Start server if this file is run directly
if (require.main === module) {
    perfectServer.start().catch((error) => {
        console.error('❌ Failed to start perfect server:', error.message);
        process.exit(1);
    });
}

module.exports = perfectServer;
