/**
 * ========================================
 * ADIYOGI V2 - Tool Controller
 * ========================================
 * 
 * Controller for handling tool-related requests with
 * business logic separation from routes
 */

const { asyncHandler, createValidationError, createToolExecutionError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class ToolController {
    constructor() {
        this.bindMethods();
    }

    bindMethods() {
        this.getAvailableTools = this.getAvailableTools.bind(this);
        this.executeSingleTool = this.executeSingleTool.bind(this);
        this.executeMultipleTools = this.executeMultipleTools.bind(this);
        this.getExecutionStatus = this.getExecutionStatus.bind(this);
        this.getToolStatistics = this.getToolStatistics.bind(this);
        this.getToolCategories = this.getToolCategories.bind(this);
    }

    /**
     * Get all available tools and categories
     */
    async getAvailableTools(req, res) {
        const { config } = req;
        
        const tools = {
            categories: config.tools.categories,
            totalCategories: Object.keys(config.tools.categories).length,
            estimatedTools: '129+',
            version: config.app.version,
            environment: config.app.environment
        };
        
        logger.info('Available tools requested', {
            requestId: req.requestId,
            categoriesCount: tools.totalCategories
        });
        
        res.json({
            success: true,
            data: tools,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Execute a single tool
     */
    async executeSingleTool(req, res) {
        const { tool, domain, options = {} } = req.body;
        const { toolExecutor } = req;
        
        if (!tool || !domain) {
            throw createValidationError('Tool and domain are required');
        }
        
        logger.info('Single tool execution requested', {
            tool,
            domain,
            options,
            requestId: req.requestId,
            ip: req.ip
        });
        
        const startTime = Date.now();
        const result = await toolExecutor.executeTools([tool], domain, options);
        const executionTime = Date.now() - startTime;
        
        if (!result.success) {
            throw createToolExecutionError(tool, result.error);
        }
        
        const toolResult = result.results[0] || {};
        
        logger.info('Single tool execution completed', {
            tool,
            domain,
            executionTime,
            resultCount: toolResult.count || 0,
            success: toolResult.success,
            requestId: req.requestId
        });
        
        res.json({
            success: true,
            data: {
                executionId: result.executionId,
                tool,
                domain,
                results: toolResult.results || [],
                count: toolResult.count || 0,
                duration: result.duration,
                executionTime,
                metadata: {
                    ...result.metadata,
                    toolMetadata: toolResult.metadata
                }
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Execute multiple tools
     */
    async executeMultipleTools(req, res) {
        const { tools, domain, options = {} } = req.body;
        const { toolExecutor } = req;
        
        if (!tools || !Array.isArray(tools) || tools.length === 0) {
            throw createValidationError('Tools array is required and must not be empty');
        }
        
        if (!domain) {
            throw createValidationError('Domain is required');
        }
        
        logger.info('Multi-tool execution requested', {
            tools,
            toolCount: tools.length,
            domain,
            options,
            requestId: req.requestId,
            ip: req.ip
        });
        
        const startTime = Date.now();
        const result = await toolExecutor.executeTools(tools, domain, options);
        const executionTime = Date.now() - startTime;
        
        if (!result.success) {
            throw createToolExecutionError('multiple', result.error);
        }
        
        // Format results for frontend compatibility
        const formattedResults = this.formatMultiToolResults(result.results);
        const totalCount = result.results.reduce((sum, r) => sum + (r.count || 0), 0);
        const successfulTools = result.results.filter(r => r.success).length;
        
        logger.info('Multi-tool execution completed', {
            tools,
            toolCount: tools.length,
            successfulTools,
            domain,
            executionTime,
            totalResults: totalCount,
            requestId: req.requestId
        });
        
        res.json({
            success: true,
            data: {
                executionId: result.executionId,
                domain,
                tools,
                results: formattedResults.combined,
                count: totalCount,
                duration: result.duration,
                executionTime,
                summary: {
                    totalTools: tools.length,
                    successfulTools,
                    failedTools: tools.length - successfulTools,
                    totalResults: totalCount
                },
                toolResults: result.results,
                metadata: result.metadata
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get execution status (placeholder for future implementation)
     */
    async getExecutionStatus(req, res) {
        const { executionId } = req.params;
        
        logger.info('Execution status requested', {
            executionId,
            requestId: req.requestId
        });
        
        // This would require implementing execution tracking
        res.json({
            success: true,
            data: {
                executionId,
                status: 'completed',
                message: 'Execution tracking will be implemented in future versions',
                note: 'Current implementation executes tools synchronously'
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get tool execution statistics
     */
    async getToolStatistics(req, res) {
        const { toolExecutor } = req;
        
        const stats = toolExecutor.getStats();
        const metrics = logger.getMetrics();
        const systemInfo = this.getSystemInfo();
        
        logger.info('Tool statistics requested', {
            requestId: req.requestId,
            activeProcesses: stats.activeProcesses
        });
        
        res.json({
            success: true,
            data: {
                toolExecutor: stats,
                system: systemInfo,
                metrics,
                performance: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                }
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get tool categories with detailed information
     */
    async getToolCategories(req, res) {
        const { config } = req;
        
        const categories = Object.entries(config.tools.categories).map(([key, category]) => ({
            id: key,
            name: category.name,
            icon: category.icon,
            description: category.description,
            timeout: category.timeout,
            maxResults: category.maxResults,
            estimatedTools: this.getEstimatedToolCount(key)
        }));
        
        logger.info('Tool categories requested', {
            requestId: req.requestId,
            categoriesCount: categories.length
        });
        
        res.json({
            success: true,
            data: {
                categories,
                totalCategories: categories.length,
                totalEstimatedTools: categories.reduce((sum, cat) => sum + cat.estimatedTools, 0)
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Format multi-tool results for frontend compatibility
     */
    formatMultiToolResults(results) {
        const combined = [];
        const byTool = {};
        
        for (const toolResult of results) {
            const toolName = toolResult.tool.toUpperCase();
            
            if (toolResult.success && toolResult.results && toolResult.results.length > 0) {
                combined.push(`\n=== ${toolName} RESULTS (${toolResult.count} found) ===`);
                combined.push(...toolResult.results);
                byTool[toolResult.tool] = {
                    success: true,
                    count: toolResult.count,
                    results: toolResult.results
                };
            } else {
                combined.push(`\n=== ${toolName} RESULTS ===`);
                combined.push(toolResult.error || 'No results found');
                byTool[toolResult.tool] = {
                    success: false,
                    error: toolResult.error || 'No results found',
                    count: 0,
                    results: []
                };
            }
        }
        
        return { combined, byTool };
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        return {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid
        };
    }

    /**
     * Get estimated tool count for a category
     */
    getEstimatedToolCount(categoryKey) {
        const toolCounts = {
            subdomain: 15,
            dns: 15,
            active: 14,
            osint: 9,
            javascript: 13,
            code: 10,
            parameters: 6,
            webapp: 18,
            cloud: 15,
            mobile: 12
        };
        
        return toolCounts[categoryKey] || 5;
    }
}

// Create and export controller instance
const toolController = new ToolController();

module.exports = {
    ToolController,
    // Export bound methods for use in routes
    getAvailableTools: asyncHandler(toolController.getAvailableTools),
    executeSingleTool: asyncHandler(toolController.executeSingleTool),
    executeMultipleTools: asyncHandler(toolController.executeMultipleTools),
    getExecutionStatus: asyncHandler(toolController.getExecutionStatus),
    getToolStatistics: asyncHandler(toolController.getToolStatistics),
    getToolCategories: asyncHandler(toolController.getToolCategories)
};
