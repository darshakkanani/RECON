/**
 * ========================================
 * ADIYOGI V2 - Static File Routes
 * ========================================
 * 
 * Frontend file serving with proper caching and security
 */

const express = require('express');
const path = require('path');
const config = require('../config/app.config');

const router = express.Router();

// Serve static files from frontend directory
router.use(express.static(config.paths.frontend, {
    maxAge: config.isProduction ? '1d' : '0',
    etag: true,
    lastModified: true,
    index: false // Don't serve index.html automatically
}));

// Main page routes
router.get('/', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'dashboard.html'));
});

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'dashboard.html'));
});

router.get('/home', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'home.html'));
});

router.get('/recon', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'recon-hub.html'));
});

// Hub pages
router.get('/subdomain-discovery', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'hubs/subdomain-discovery-hub.html'));
});

router.get('/active-discovery', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'hubs/active-discovery-hub.html'));
});

router.get('/dns', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'hubs/dns-whois-hub.html'));
});

router.get('/osint', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'hubs/osint-intelligence-hub.html'));
});

router.get('/javascript-mining', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'hubs/javascript-api-hub.html'));
});

router.get('/code-repository', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'hubs/code-repository-hub.html'));
});

// Tool pages
router.get('/subdomain', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/subdomain-enumeration.html'));
});

router.get('/active', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/active-discovery.html'));
});

router.get('/javascript', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/javascript-mining.html'));
});

router.get('/code', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/code-search.html'));
});

router.get('/parameters', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/parameter-fuzzing.html'));
});

router.get('/webapp', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/web-application-security.html'));
});

router.get('/cloud', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/cloud-infrastructure.html'));
});

router.get('/mobile', (req, res) => {
    res.sendFile(path.join(config.paths.frontend, 'tools/mobile-api-security.html'));
});

module.exports = router;
