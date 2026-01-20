/**
 * Test Server Manager
 * 
 * Utilities for starting/stopping the test MCP server for integration tests
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class TestServerManager extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            mcpPort: config.mcpPort || 9000,
            oauthPort: config.oauthPort || 9001,
            autoStart: config.autoStart !== false,
            verbose: config.verbose || false,
            ...config
        };

        this.process = null;
        this.ready = false;
        this.startTime = null;
    }

    get mcpUrl() {
        return `http://localhost:${this.config.mcpPort}/mcp`;
    }

    get oauthUrl() {
        return `http://localhost:${this.config.oauthPort}`;
    }

    get healthUrl() {
        return `http://localhost:${this.config.mcpPort}/health`;
    }

    get discoveryUrl() {
        return `${this.oauthUrl}/.well-known/oauth-authorization-server`;
    }

    /**
     * Start the test server
     */
    async start() {
        if (this.process) {
            throw new Error('Server is already running');
        }

        console.log('🚀 Starting test MCP server...');
        console.log(`   MCP: http://localhost:${this.config.mcpPort}`);
        console.log(`   OAuth: http://localhost:${this.config.oauthPort}`);

        // Start the server process
        this.process = spawn('node', ['tests/mock-servers/test-mcp-server.js'], {
            env: {
                ...process.env,
                TEST_MCP_PORT: this.config.mcpPort.toString(),
                TEST_OAUTH_PORT: this.config.oauthPort.toString()
            },
            stdio: this.config.verbose ? 'inherit' : 'pipe'
        });

        // Capture output if not verbose
        if (!this.config.verbose) {
            this.process.stdout?.on('data', (data) => {
                this.emit('stdout', data.toString());
            });

            this.process.stderr?.on('data', (data) => {
                this.emit('stderr', data.toString());
            });
        }

        // Handle process events
        this.process.on('error', (error) => {
            console.error('❌ Failed to start server:', error);
            this.emit('error', error);
        });

        this.process.on('exit', (code, signal) => {
            console.log(`🛑 Server process exited (code: ${code}, signal: ${signal})`);
            this.process = null;
            this.ready = false;
            this.emit('exit', { code, signal });
        });

        // Wait for server to be ready
        this.startTime = Date.now();
        await this.waitForReady();

        const duration = Date.now() - this.startTime;
        console.log(`✅ Test server ready in ${duration}ms`);

        return this;
    }

    /**
     * Wait for the server to be ready by polling the health endpoint
     */
    async waitForReady(timeoutMs = 30000) {
        const startTime = Date.now();
        const pollInterval = 200;

        while (Date.now() - startTime < timeoutMs) {
            try {
                const response = await fetch(this.healthUrl, {
                    signal: AbortSignal.timeout(1000)
                });

                if (response.ok) {
                    const health = await response.json();
                    if (health.status === 'healthy') {
                        this.ready = true;
                        this.emit('ready');
                        return true;
                    }
                }
            } catch (error) {
                // Server not ready yet, continue polling
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error(`Server failed to start within ${timeoutMs}ms`);
    }

    /**
     * Stop the test server
     */
    async stop() {
        if (!this.process) {
            return;
        }

        console.log('🛑 Stopping test server...');

        return new Promise((resolve) => {
            if (!this.process) {
                resolve();
                return;
            }

            this.process.once('exit', () => {
                this.process = null;
                this.ready = false;
                console.log('✅ Server stopped');
                resolve();
            });

            // Try graceful shutdown first
            this.process.kill('SIGTERM');

            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.process) {
                    console.log('⚠️  Forcing server shutdown...');
                    this.process.kill('SIGKILL');
                }
            }, 5000);
        });
    }

    /**
     * Check if server is running
     */
    isRunning() {
        return this.process !== null && this.ready;
    }

    /**
     * Get server statistics
     */
    async getStats() {
        if (!this.ready) {
            throw new Error('Server is not running');
        }

        const response = await fetch(`http://localhost:${this.config.mcpPort}/stats`);
        return response.json();
    }

    /**
     * Reset server state (clear tokens, sessions, etc.)
     */
    async reset() {
        // Restart the server to clear all state
        await this.stop();
        await this.start();
    }

    /**
     * Get pre-configured test credentials
     */
    getTestCredentials() {
        return {
            oauth: {
                public: {
                    clientId: 'test-client-public',
                    clientSecret: null
                },
                confidential: {
                    clientId: 'test-client-confidential',
                    clientSecret: 'test-secret-123'
                }
            },
            apiKey: {
                valid: 'test-api-key-valid',
                invalid: 'invalid-key-123'
            }
        };
    }

    /**
     * Get OAuth endpoints for configuration
     */
    getOAuthEndpoints() {
        return {
            authorization_endpoint: `${this.oauthUrl}/oauth/authorize`,
            token_endpoint: `${this.oauthUrl}/oauth/token`,
            issuer: this.oauthUrl
        };
    }
}

/**
 * Global server instance for test suites
 */
let globalServer = null;

/**
 * Get or create a global server instance
 */
export async function getGlobalServer(config) {
    if (!globalServer) {
        globalServer = new TestServerManager(config);
        await globalServer.start();

        // Clean up on process exit
        process.on('exit', () => {
            if (globalServer) {
                globalServer.stop();
            }
        });

        process.on('SIGINT', () => {
            if (globalServer) {
                globalServer.stop();
            }
            process.exit();
        });
    }

    return globalServer;
}

/**
 * Stop the global server
 */
export async function stopGlobalServer() {
    if (globalServer) {
        await globalServer.stop();
        globalServer = null;
    }
}

/**
 * Vitest/Playwright setup helpers
 */
export async function setupTestServer(config) {
    const server = await getGlobalServer(config);
    return server;
}

export async function teardownTestServer() {
    await stopGlobalServer();
}



