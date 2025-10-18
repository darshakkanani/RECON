/**
 * ========================================
 * ADIYOGI V2 - Advanced Configuration
 * ========================================
 * 
 * Comprehensive configuration management for the ADIYOGI platform
 * with environment-based settings, security configurations, and
 * tool-specific parameters.
 */

const path = require('path');
const os = require('os');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';

// Base configuration
const config = {
    // Application settings
    app: {
        name: 'ADIYOGI',
        version: '2.0.0',
        description: 'Advanced Information Gathering Platform',
        environment: NODE_ENV,
        debug: IS_DEVELOPMENT
    },

    // Server configuration
    server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || 'localhost',
        timeout: 300000, // 5 minutes
        keepAliveTimeout: 65000,
        headersTimeout: 66000,
        maxConnections: 1000,
        cors: {
            origin: IS_PRODUCTION ? ['https://adiyogi.com'] : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }
    },

    // Security settings
    security: {
        rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: IS_PRODUCTION ? 100 : 1000, // requests per window
            message: 'Too many requests from this IP',
            standardHeaders: true,
            legacyHeaders: false
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        },
        apiKeys: {
            required: IS_PRODUCTION,
            header: 'X-API-Key',
            validKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',') : []
        }
    },

    // Database configuration (for future use)
    database: {
        type: 'sqlite',
        path: path.join(__dirname, '../../../data/adiyogi.db'),
        options: {
            enableWAL: true,
            timeout: 10000,
            verbose: IS_DEVELOPMENT ? console.log : null
        }
    },

    // Logging configuration
    logging: {
        level: IS_DEVELOPMENT ? 'debug' : 'info',
        format: IS_DEVELOPMENT ? 'dev' : 'combined',
        file: {
            enabled: true,
            path: path.join(__dirname, '../../../logs'),
            maxSize: '10m',
            maxFiles: 10,
            datePattern: 'YYYY-MM-DD'
        },
        console: {
            enabled: true,
            colorize: IS_DEVELOPMENT,
            timestamp: true
        }
    },

    // File system paths
    paths: {
        root: path.join(__dirname, '..'),
        backend: path.join(__dirname, '..'),
        frontend: path.join(__dirname, '../public'),
        results: path.join(__dirname, '../storage/results'),
        logs: path.join(__dirname, '../storage/logs'),
        cache: path.join(__dirname, '../storage/cache'),
        temp: path.join(os.tmpdir(), 'adiyogi'),
        tools: path.join(__dirname, '../scripts')
    },

    // Tool execution settings
    execution: {
        timeout: 300000, // 5 minutes per tool
        maxConcurrent: 5, // Maximum concurrent tool executions
        retries: 2, // Number of retries on failure
        killSignal: 'SIGTERM',
        killTimeout: 10000, // 10 seconds before SIGKILL
        environment: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            USER: process.env.USER
        },
        limits: {
            memory: '512m',
            cpu: '1',
            time: 300 // seconds
        }
    },

    // Caching configuration
    cache: {
        enabled: true,
        ttl: 3600, // 1 hour default TTL
        maxSize: 1000, // Maximum number of cached items
        checkPeriod: 600, // Check for expired items every 10 minutes
        redis: {
            enabled: false,
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: 0
        }
    },

    // Tool categories and configurations
    tools: {
        categories: {
            subdomain: {
                name: 'Subdomain Discovery',
                icon: '🎯',
                description: 'Passive & Active Enumeration',
                timeout: 180000, // 3 minutes
                maxResults: 10000
            },
            dns: {
                name: 'DNS & WHOIS Analysis',
                icon: '🌐',
                description: 'Domain Intelligence',
                timeout: 120000, // 2 minutes
                maxResults: 1000
            },
            active: {
                name: 'Active Discovery',
                icon: '💥',
                description: 'Directory & File Bruteforce',
                timeout: 300000, // 5 minutes
                maxResults: 5000
            },
            osint: {
                name: 'OSINT & Intelligence',
                icon: '🕵️',
                description: 'Information Gathering',
                timeout: 240000, // 4 minutes
                maxResults: 2000
            },
            javascript: {
                name: 'JavaScript & API',
                icon: '📜',
                description: 'Web App Surface Mining',
                timeout: 180000, // 3 minutes
                maxResults: 3000
            },
            code: {
                name: 'Code & Repository',
                icon: '🐙',
                description: 'Source Code Intelligence',
                timeout: 300000, // 5 minutes
                maxResults: 5000
            },
            parameters: {
                name: 'Parameter Fuzzing',
                icon: '🎯',
                description: 'Hidden Parameter Discovery',
                timeout: 240000, // 4 minutes
                maxResults: 2000
            },
            webapp: {
                name: 'Web App Security',
                icon: '🔒',
                description: 'Security Testing',
                timeout: 600000, // 10 minutes
                maxResults: 1000
            },
            cloud: {
                name: 'Cloud & Infrastructure',
                icon: '☁️',
                description: 'Cloud Reconnaissance',
                timeout: 300000, // 5 minutes
                maxResults: 2000
            },
            mobile: {
                name: 'Mobile & API',
                icon: '📱',
                description: 'Mobile Security Testing',
                timeout: 300000, // 5 minutes
                maxResults: 1000
            }
        }
    },

    // API configuration
    api: {
        version: 'v2',
        prefix: '/api/v2',
        documentation: {
            enabled: IS_DEVELOPMENT,
            path: '/docs',
            title: 'ADIYOGI API Documentation',
            version: '2.0.0'
        },
        validation: {
            stripUnknown: true,
            abortEarly: false,
            allowUnknown: false
        }
    },

    // Monitoring and metrics
    monitoring: {
        enabled: true,
        metrics: {
            enabled: true,
            path: '/metrics',
            defaultLabels: {
                app: 'adiyogi',
                version: '2.0.0'
            }
        },
        health: {
            enabled: true,
            path: '/health',
            checks: ['database', 'filesystem', 'tools']
        }
    }
};

// Environment-specific overrides
const environments = {
    development: {
        logging: {
            level: 'debug'
        },
        security: {
            rateLimiting: {
                max: 1000
            }
        }
    },
    production: {
        logging: {
            level: 'warn',
            console: {
                enabled: false
            }
        },
        security: {
            rateLimiting: {
                max: 100
            }
        },
        cache: {
            redis: {
                enabled: true
            }
        }
    },
    test: {
        server: {
            port: 3002
        },
        logging: {
            level: 'error',
            console: {
                enabled: false
            },
            file: {
                enabled: false
            }
        },
        execution: {
            timeout: 10000
        }
    }
};

// Merge environment-specific configuration
if (environments[NODE_ENV]) {
    Object.assign(config, environments[NODE_ENV]);
}

// Validation function
function validateConfig() {
    const required = [
        'server.port',
        'paths.results',
        'paths.logs'
    ];

    for (const path of required) {
        const keys = path.split('.');
        let value = config;
        
        for (const key of keys) {
            value = value[key];
            if (value === undefined) {
                throw new Error(`Missing required configuration: ${path}`);
            }
        }
    }

    return true;
}

// Export configuration
module.exports = {
    ...config,
    validate: validateConfig,
    isDevelopment: IS_DEVELOPMENT,
    isProduction: IS_PRODUCTION,
    nodeEnv: NODE_ENV
};
