import { MCPToolFilter } from '@portkey-ai/mcp-tool-filter';
import { createLogger } from './logger.js';

const log = createLogger('ToolFilter');

/**
 * Backend tool filter manager
 * Handles semantic tool filtering for connected MCP servers
 */
class BackendToolFilterManager {
    constructor() {
        this.filter = null;
        this.initialized = false;
        this.currentServers = [];
    }

    /**
     * Initialize or reinitialize the filter with current servers and tools
     */
    async initialize(serversWithTools) {
        try {
            log.verbose('Initializing with', serversWithTools.length, 'servers');

            // Convert to MCP server format
            const mcpServers = serversWithTools.map(server => ({
                id: server.id,
                name: server.name,
                description: `MCP Server: ${server.name}`,
                tools: server.tools.map(tool => ({
                    name: tool.name,
                    description: tool.description || `Tool: ${tool.name}`,
                    inputSchema: tool.inputSchema,
                })),
            }));

            // Create filter if needed
            if (!this.filter) {
                this.filter = new MCPToolFilter({
                    embedding: {
                        provider: 'local',
                        model: 'Xenova/all-MiniLM-L6-v2',
                        quantized: true,
                    },
                    defaultOptions: {
                        topK: 22,
                        minScore: 0.30,
                        contextMessages: 3,
                        maxContextTokens: 500,
                    },
                    debug: false, // Disabled to reduce log noise
                });
            }

            // Initialize with servers
            await this.filter.initialize(mcpServers);
            this.initialized = true;
            this.currentServers = serversWithTools;

            log.info('Initialization complete');
            return { success: true };
        } catch (error) {
            log.error('Initialization failed with error:', error);
            log.debug('Error stack:', error.stack);
            log.debug('Error name:', error.name);
            log.debug('Error message:', error.message);
            this.initialized = false;
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Filter tools based on conversation context
     */
    async filterTools(messages, options = {}) {
        if (!this.initialized || !this.filter) {
            return {
                success: false,
                error: 'Filter not initialized',
            };
        }

        try {
            const result = await this.filter.filter(messages, options);

            log.verbose(
                `Filtered to ${result.tools.length} tools in ${result.metrics.totalTime.toFixed(2)}ms`
            );

            return {
                success: true,
                tools: result.tools,
                metrics: result.metrics,
            };
        } catch (error) {
            log.error('Filtering failed:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get filter stats
     */
    getStats() {
        if (!this.filter) {
            return { initialized: false };
        }

        return {
            initialized: this.initialized,
            stats: this.filter.getStats(),
            serverCount: this.currentServers.length,
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        if (this.filter) {
            this.filter.clearCache();
            log.info('Cache cleared');
        }
    }
}

// Singleton instance
export const toolFilterManager = new BackendToolFilterManager();

