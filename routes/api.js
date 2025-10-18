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

// Legacy compatibility endpoint
router.post('/run-tools', asyncHandler(async (req, res) => {
    const { tools, domain, options = {} } = req.body;
    const { toolExecutor } = req;
    
    if (!tools || !domain) {
        throw createValidationError('Tools array and domain are required');
    }
    
    logger.info('Legacy multi-tool execution requested', {
        tools,
        domain,
        options,
        requestId: req.requestId
    });
    
    const result = await toolExecutor.executeTools(tools, domain, options);
    
    if (!result.success) {
        throw createToolExecutionError('multiple', result.error);
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
