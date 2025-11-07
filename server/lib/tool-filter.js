import { MCPToolFilter } from '@portkey-ai/mcp-tool-filter';
import { createLogger } from './logger.js';

const log = createLogger('ToolFilter');

/**
 * Backend tool filter manager
 * Handles semantic tool filtering for connected MCP servers
 */
class BackendToolFilterManager {
    constructor(env = null) {
        this.filter = null;
        this.initialized = false;
        this.currentServers = [];
        this.env = env; // Cloudflare Workers environment (for Workers AI)
        this.usingWorkersAI = false;
    }

    /**
     * Check if Workers AI is available
     */
    isWorkersAIAvailable() {
        return this.env && this.env.AI !== undefined;
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

            // Log tool count per server
            mcpServers.forEach(server => {
                log.info(`Server "${server.name}": ${server.tools.length} tools`);
            });

            const totalTools = mcpServers.reduce((sum, s) => sum + s.tools.length, 0);
            log.info(`Total tools to initialize: ${totalTools}`);

            if (totalTools === 0) {
                log.error('❌ No tools to initialize! Cannot set up semantic filtering.');
                return {
                    success: false,
                    error: 'No tools available for initialization'
                };
            }

            if (totalTools < 10) {
                log.warn(`⚠️  Only ${totalTools} tools to initialize. This seems low - make sure all servers are connected.`);
            }

            // Create filter if needed
            if (!this.filter) {
                // Check if Workers AI is available
                if (this.isWorkersAIAvailable()) {
                    log.info('Workers AI detected - using Workers AI for embeddings');

                    // Get account ID from environment
                    const accountId = this.env.CLOUDFLARE_ACCOUNT_ID;
                    if (!accountId) {
                        log.warn('CLOUDFLARE_ACCOUNT_ID not set, Workers AI embedding will fail');
                    }

                    // Use OpenAI provider with Workers AI endpoint
                    const model = this.env.WORKERS_AI_EMBEDDING_MODEL || '@cf/baai/bge-base-en-v1.5';

                    // Map Workers AI models to their dimensions
                    const modelDimensions = {
                        '@cf/baai/bge-small-en-v1.5': 384,
                        '@cf/baai/bge-base-en-v1.5': 768,
                        '@cf/baai/bge-large-en-v1.5': 1024,
                        '@cf/baai/bge-m3': 1024,
                        '@cf/google/embeddinggemma-300m': 768,
                    };

                    const dimensions = modelDimensions[model] || 768;
                    const apiKey = this.env.CLOUDFLARE_API_TOKEN || 'dummy-key-not-needed-in-workers';
                    const baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;

                    log.info(`Using Workers AI model: ${model} (${dimensions} dimensions)`);

                    this.filter = new MCPToolFilter({
                        embedding: {
                            provider: 'openai',
                            apiKey: apiKey,
                            baseURL: baseURL,
                            model: model,
                            dimensions: dimensions,
                        },
                        defaultOptions: {
                            topK: 22,
                            minScore: 0.30,
                            contextMessages: 3,
                            maxContextTokens: 500,
                        },
                        debug: false,
                    });
                    this.usingWorkersAI = true;
                } else {
                    // Fall back to local embeddings (Node.js only)
                    log.info('Using local embeddings (Transformers.js)');
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
                        debug: false,
                    });
                    this.usingWorkersAI = false;
                }
            }

            // Initialize with servers
            const initStartTime = Date.now();
            await this.filter.initialize(mcpServers);
            const initDuration = Date.now() - initStartTime;

            this.initialized = true;
            this.currentServers = serversWithTools;

            const embeddingType = this.usingWorkersAI ? 'Workers AI' : 'Local (Transformers.js)';
            log.info(`✅ Initialized ${totalTools} tools using ${embeddingType} in ${initDuration}ms`);

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
            log.error('Filter not initialized - cannot filter tools');
            return {
                success: false,
                error: 'Filter not initialized',
            };
        }

        try {
            const startTime = Date.now();
            const result = await this.filter.filter(messages, options);
            const duration = Date.now() - startTime;

            // Deduplicate tools by name (keep first occurrence with highest score)
            const seenTools = new Set();
            const uniqueTools = [];
            let duplicatesRemoved = 0;

            for (const tool of result.tools) {
                if (seenTools.has(tool.toolName)) {
                    duplicatesRemoved++;
                    log.debug(`Skipping duplicate tool: ${tool.toolName}`);
                    continue;
                }
                seenTools.add(tool.toolName);
                uniqueTools.push(tool);
            }

            if (duplicatesRemoved > 0) {
                log.warn(`⚠️  Removed ${duplicatesRemoved} duplicate tool(s) from filter results`);
            }

            log.info(`Filtered ${uniqueTools.length} unique tools in ${duration}ms`);

            if (uniqueTools.length === 0) {
                log.warn('⚠️  No tools passed the filter threshold');
            }

            return {
                success: true,
                tools: uniqueTools,
                metrics: result.metrics,
            };
        } catch (error) {
            log.error('❌ Filtering failed:', error.message);
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

// Singleton instance - will be initialized with env in Workers
let toolFilterManagerInstance = null;

/**
 * Get or create the tool filter manager instance
 * @param {Object} env - Cloudflare Workers environment (optional, for Workers AI support)
 * @returns {BackendToolFilterManager}
 */
export function getToolFilterManager(env = null) {
    if (!toolFilterManagerInstance) {
        toolFilterManagerInstance = new BackendToolFilterManager(env);
    } else if (env && !toolFilterManagerInstance.env) {
        // Update env if it wasn't set initially
        toolFilterManagerInstance.env = env;
    }
    return toolFilterManagerInstance;
}

// Export default instance for backward compatibility (Node.js)
export const toolFilterManager = new BackendToolFilterManager();

