/**
 * ========================================
 * ADIYOGI V2 - API Routes
 * ========================================
 * 
 * RESTful API endpoints for tool execution and management
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Import controllers
const {
    getAvailableTools,
    executeSingleTool,
    executeMultipleTools,
    getExecutionStatus,
    getToolStatistics,
    getToolCategories
} = require('../controllers/ToolController');

const router = express.Router();

// Get available tools
router.get('/tools', getAvailableTools);

// Get tool categories
router.get('/categories', getToolCategories);

// Execute single tool
router.post('/execute/single', executeSingleTool);

// Execute multiple tools
router.post('/execute/multiple', executeMultipleTools);

// Get execution status
router.get('/execution/:executionId', getExecutionStatus);

// Get tool statistics
router.get('/stats', getToolStatistics);

// Get subdomain tools configuration
router.get('/subdomain-tools', asyncHandler(async (req, res) => {
    const { toolExecutor } = req;
    
    try {
        const subdomainTools = toolExecutor.getSubdomainTools();
        
        res.json({
            success: true,
            data: {
                tools: subdomainTools,
                totalCount: subdomainTools.length,
                withOutputFile: subdomainTools.filter(t => t.hasOutputFile).length,
                withSaveOutput: subdomainTools.filter(t => t.saveOutput).length
            }
        });
    } catch (error) {
        logger.error('Failed to get subdomain tools configuration', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get subdomain tools configuration'
        });
    }
}));

// Test assetfinder output saving
router.post('/test-assetfinder', asyncHandler(async (req, res) => {
    const { domain } = req.body;
    const { toolExecutor } = req;
    
    if (!domain) {
        return res.status(400).json({
            success: false,
            error: 'Domain is required'
        });
    }
    
    try {
        logger.info('Testing assetfinder output saving', { domain });
        
        const result = await toolExecutor.executeTool('assetfinder', domain, {});
        
        // Check if output file exists and has content
        const fs = require('fs');
        let fileExists = false;
        let fileSize = 0;
        let fileContent = '';
        
        if (result.outputFile) {
            try {
                const stats = fs.statSync(result.outputFile);
                fileExists = true;
                fileSize = stats.size;
                fileContent = fs.readFileSync(result.outputFile, 'utf8');
            } catch (fileError) {
                logger.warn('Output file not found', { outputFile: result.outputFile });
            }
        }
        
        res.json({
            success: true,
            data: {
                tool: 'assetfinder',
                domain,
                executionTime: result.executionTime,
                outputFile: result.outputFile,
                fileExists,
                fileSize,
                hasContent: fileContent.length > 0,
                resultCount: result.results ? result.results.length : 0,
                sampleOutput: fileContent.split('\n').slice(0, 5).join('\n')
            }
        });
        
    } catch (error) {
        logger.error('Assetfinder test failed', { domain, error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

// List recent output files
router.get('/output-files', asyncHandler(async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const config = require('../config/app.config');
    
    try {
        const resultsDir = config.paths.results;
        const files = fs.readdirSync(resultsDir);
        
        const outputFiles = files
            .filter(file => file.endsWith('.txt'))
            .map(file => {
                const filePath = path.join(resultsDir, file);
                const stats = fs.statSync(filePath);
                const parts = file.split('_');
                
                return {
                    filename: file,
                    tool: parts[0] || 'unknown',
                    domain: parts[1] || 'unknown',
                    timestamp: parts[2] || '0',
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    hasContent: stats.size > 0
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created))
            .slice(0, 20); // Last 20 files
        
        res.json({
            success: true,
            data: {
                files: outputFiles,
                totalCount: outputFiles.length,
                resultsDirectory: resultsDir
            }
        });
        
    } catch (error) {
        logger.error('Failed to list output files', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to list output files'
        });
    }
}));

// Bulk domain discovery endpoint
router.post('/bulk-discovery', asyncHandler(async (req, res) => {
    const { domains, tools, options = {} } = req.body;
    const { toolExecutor } = req;
    
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
    
    logger.info('Bulk domain discovery requested', {
        domainCount: domains.length,
        tools,
        options,
        requestId: req.requestId
    });
    
    try {
        const results = [];
        let totalSubdomains = 0;
        
        // Process each domain
        for (const domain of domains) {
            const domainTrimmed = domain.trim();
            if (!domainTrimmed) continue;
            
            logger.info('Processing domain in bulk discovery', { domain: domainTrimmed, tools });
            
            try {
                const domainResult = await toolExecutor.executeTools(tools, domainTrimmed, options);
                
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
            error: error.message,
            domains: domains.length,
            tools
        });
        
        res.status(500).json({
            success: false,
            error: 'Bulk domain discovery failed: ' + error.message
        });
    }
}));

// Legacy compatibility endpoint
router.post('/run-tools', asyncHandler(async (req, res) => {
    const { tools, domain, options = {} } = req.body;
    const { toolExecutor } = req;
    
    if (!tools || !domain) {
        return res.status(400).json({
            success: false,
            error: 'Tools array and domain are required'
        });
    }
    
    logger.info('Legacy multi-tool execution requested', {
        tools,
        domain,
        options,
        requestId: req.requestId
    });
    
    const result = await toolExecutor.executeTools(tools, domain, options);
    
    if (!result.success) {
        return res.status(500).json({
            success: false,
            error: 'Tool execution failed: ' + result.error
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
}));

module.exports = router;
