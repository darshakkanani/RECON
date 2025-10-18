/**
 * ========================================
 * ADIYOGI V2 - Execution Result Model
 * ========================================
 * 
 * Data model for tool execution results with
 * validation, serialization, and utility methods
 */

class ExecutionResult {
    constructor(data = {}) {
        this.executionId = data.executionId || null;
        this.tool = data.tool || null;
        this.domain = data.domain || null;
        this.success = data.success || false;
        this.results = data.results || [];
        this.count = data.count || 0;
        this.duration = data.duration || 0;
        this.startTime = data.startTime || null;
        this.endTime = data.endTime || null;
        this.error = data.error || null;
        this.metadata = data.metadata || {};
        this.rawOutput = data.rawOutput || '';
        this.outputFile = data.outputFile || null;
        this.timestamp = data.timestamp || new Date().toISOString();
    }

    /**
     * Validate the execution result
     */
    validate() {
        const errors = [];

        if (!this.executionId) {
            errors.push('Execution ID is required');
        }

        if (!this.tool) {
            errors.push('Tool name is required');
        }

        if (!this.domain) {
            errors.push('Domain is required');
        }

        if (!Array.isArray(this.results)) {
            errors.push('Results must be an array');
        }

        if (typeof this.count !== 'number' || this.count < 0) {
            errors.push('Count must be a non-negative number');
        }

        if (typeof this.duration !== 'number' || this.duration < 0) {
            errors.push('Duration must be a non-negative number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to JSON representation
     */
    toJSON() {
        return {
            executionId: this.executionId,
            tool: this.tool,
            domain: this.domain,
            success: this.success,
            results: this.results,
            count: this.count,
            duration: this.duration,
            startTime: this.startTime,
            endTime: this.endTime,
            error: this.error,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Convert to API response format
     */
    toApiResponse() {
        const response = {
            success: this.success,
            data: {
                executionId: this.executionId,
                tool: this.tool,
                domain: this.domain,
                results: this.results,
                count: this.count,
                duration: this.duration,
                metadata: this.metadata
            },
            timestamp: this.timestamp
        };

        if (!this.success && this.error) {
            response.error = this.error;
        }

        return response;
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        return {
            tool: this.tool,
            domain: this.domain,
            success: this.success,
            resultCount: this.count,
            duration: this.duration,
            timestamp: this.timestamp,
            hasError: !!this.error
        };
    }

    /**
     * Check if execution was successful
     */
    isSuccessful() {
        return this.success && this.count > 0;
    }

    /**
     * Check if execution failed
     */
    isFailed() {
        return !this.success || !!this.error;
    }

    /**
     * Get execution time in human readable format
     */
    getFormattedDuration() {
        if (this.duration < 1000) {
            return `${this.duration}ms`;
        } else if (this.duration < 60000) {
            return `${(this.duration / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(this.duration / 60000);
            const seconds = ((this.duration % 60000) / 1000).toFixed(0);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Get results preview (first few results)
     */
    getResultsPreview(limit = 5) {
        if (!Array.isArray(this.results)) {
            return [];
        }
        return this.results.slice(0, limit);
    }

    /**
     * Create from tool executor result
     */
    static fromToolExecutorResult(executorResult, tool, domain) {
        return new ExecutionResult({
            executionId: executorResult.executionId,
            tool,
            domain,
            success: executorResult.success,
            results: executorResult.results || [],
            count: executorResult.count || 0,
            duration: executorResult.duration || 0,
            error: executorResult.error,
            metadata: executorResult.metadata || {},
            rawOutput: executorResult.rawOutput || '',
            outputFile: executorResult.outputFile,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Create error result
     */
    static createErrorResult(executionId, tool, domain, error) {
        return new ExecutionResult({
            executionId,
            tool,
            domain,
            success: false,
            results: [],
            count: 0,
            duration: 0,
            error: error.message || error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Merge multiple execution results
     */
    static mergeResults(results) {
        if (!Array.isArray(results) || results.length === 0) {
            return new ExecutionResult();
        }

        const merged = new ExecutionResult({
            executionId: `merged_${Date.now()}`,
            tool: 'multiple',
            domain: results[0].domain,
            success: results.some(r => r.success),
            results: [],
            count: 0,
            duration: 0,
            metadata: {
                toolCount: results.length,
                successfulTools: results.filter(r => r.success).length,
                failedTools: results.filter(r => !r.success).length
            },
            timestamp: new Date().toISOString()
        });

        // Combine all results
        for (const result of results) {
            if (result.results && Array.isArray(result.results)) {
                merged.results.push(`\n=== ${result.tool.toUpperCase()} RESULTS (${result.count} found) ===`);
                merged.results.push(...result.results);
                merged.count += result.count;
            }
            merged.duration += result.duration;
        }

        return merged;
    }
}

module.exports = ExecutionResult;
