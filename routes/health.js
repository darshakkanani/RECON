/**
 * ========================================
 * ADIYOGI V2 - Health Check Routes
 * ========================================
 * 
 * System health monitoring and diagnostics
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

// Import system controller
const {
    getSystemHealth,
    getDetailedHealth,
    getSystemInfo,
    getSystemMetrics,
    getSystemLogs,
    clearCache,
    getConfiguration
} = require('../controllers/SystemController');

const router = express.Router();

// Basic health check
router.get('/', getSystemHealth);

// Detailed health check
router.get('/detailed', getDetailedHealth);

// System information
router.get('/info', getSystemInfo);

// System metrics
router.get('/metrics', getSystemMetrics);

// System logs
router.get('/logs', getSystemLogs);

// Clear cache
router.post('/cache/clear', clearCache);

// Get configuration
router.get('/config', getConfiguration);

// Readiness probe (for Kubernetes)
router.get('/ready', asyncHandler(async (req, res) => {
    // Use the system health check for readiness
    const health = await req.app.locals.systemController?.performHealthChecks() || { status: 'healthy' };
    
    if (health.status === 'healthy') {
        res.status(200).json({ status: 'ready', health });
    } else {
        res.status(503).json({ status: 'not ready', health });
    }
}));

// Liveness probe (for Kubernetes)
router.get('/live', asyncHandler(async (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid
    });
}));

module.exports = router;
