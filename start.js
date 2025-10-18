#!/usr/bin/env node

/**
 * ========================================
 * ADIYOGI V2 - Production Startup Script
 * ========================================
 * 
 * Simple startup script for the perfect ADIYOGI backend
 */

// Load environment variables (optional)
try {
    require('dotenv').config();
} catch (error) {
    // dotenv not installed, that's okay
}

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
}

// Start the perfect server
console.log('🚀 Starting ADIYOGI V2 Perfect Backend...');
console.log(`📦 Node.js: ${process.version}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`💻 Platform: ${process.platform} ${process.arch}`);

// Import and start the server
require('./server');
