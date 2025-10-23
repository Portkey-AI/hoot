import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3002;

// Enable CORS for browser app
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Vite dev server ports
    credentials: true,
}));

app.use(express.json());

// Initialize SQLite database
const db = new Database('.hoot-mcp.db');

// Use WAL mode for better concurrency
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
        server_id TEXT PRIMARY KEY,
        tokens TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS oauth_client_info (
        server_id TEXT PRIMARY KEY,
        client_info TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS oauth_verifiers (
        server_id TEXT PRIMARY KEY,
        verifier TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
`);

// Clean up old verifiers (older than 10 minutes)
db.prepare('DELETE FROM oauth_verifiers WHERE created_at < ?')
    .run(Math.floor(Date.now() / 1000) - 600);

// Checkpoint WAL to ensure data is written
db.pragma('wal_checkpoint(TRUNCATE)');

console.log('✓ SQLite database initialized');

// In-memory storage for active connections (transports can't be serialized)
const clients = new Map();
const transports = new Map();

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({
        status: 'ok',
        message: 'MCP Backend Server is running',
        port: PORT,
        activeConnections: clients.size,
    });
});

/**
 * Connect to an MCP server
 * POST /mcp/connect
 * Body: {
 *   serverId: string,
 *   serverName: string,
 *   url: string,
 *   transport: 'sse' | 'http',
 *   auth?: { type: 'none' | 'headers' | 'oauth', headers?: Record<string, string> },
 *   authorizationCode?: string
 * }
 */
app.post('/mcp/connect', async (req, res) => {
    try {
        const { serverId, serverName, url, transport, auth, authorizationCode } = req.body;

        console.log(`🔌 Connecting to MCP server: ${serverName}`, {
            serverId,
            url,
            transport,
            hasAuth: !!auth,
            authType: auth?.type,
            hasAuthCode: !!authorizationCode
        });

        // Disconnect existing connection if any
        if (clients.has(serverId)) {
            console.log(`♻️ Disconnecting existing connection for ${serverId}`);
            await disconnectServer(serverId);
        }

        // Create transport options with authentication
        const transportOptions = {};

        if (auth && auth.type === 'headers' && auth.headers) {
            transportOptions.requestInit = {
                headers: auth.headers,
            };
        } else if (auth && auth.type === 'oauth') {
            // Create OAuth provider that works in Node.js (no localStorage)
            // Uses in-memory Maps instead
            const callbackUrl = 'http://localhost:5173/oauth/callback';

            // Load existing client info if available to reuse client_id
            const existingClientInfo = (() => {
                const row = db.prepare('SELECT client_info FROM oauth_client_info WHERE server_id = ?').get(serverId);
                return row ? JSON.parse(row.client_info) : undefined;
            })();

            if (existingClientInfo) {
                console.log(`🔐 Reusing existing OAuth client for ${serverId}`);
            }

            transportOptions.authProvider = {
                get redirectUrl() {
                    return callbackUrl;
                },

                get clientMetadata() {
                    return {
                        client_name: 'Hoot MCP Testing Tool',
                        client_uri: 'http://localhost:5173',
                        redirect_uris: [callbackUrl],
                        grant_types: ['authorization_code', 'refresh_token'],
                        response_types: ['code'],
                        token_endpoint_auth_method: 'none',
                    };
                },

                state: async () => {
                    const crypto = await import('crypto');
                    return crypto.randomBytes(32).toString('hex');
                },

                clientInformation: async () => {
                    // Return pre-loaded client info if available
                    if (existingClientInfo) {
                        return existingClientInfo;
                    }
                    // Otherwise check database
                    const row = db.prepare('SELECT client_info FROM oauth_client_info WHERE server_id = ?').get(serverId);
                    return row ? JSON.parse(row.client_info) : undefined;
                },

                saveClientInformation: async (clientInfo) => {
                    console.log(`🔐 Saving client info for ${serverId}`);
                    db.prepare('INSERT OR REPLACE INTO oauth_client_info (server_id, client_info) VALUES (?, ?)')
                        .run(serverId, JSON.stringify(clientInfo));
                },

                tokens: async () => {
                    const row = db.prepare('SELECT tokens FROM oauth_tokens WHERE server_id = ?').get(serverId);
                    return row ? JSON.parse(row.tokens) : undefined;
                },

                saveTokens: async (tokens) => {
                    console.log(`🔐 Saving tokens for ${serverId}`);
                    db.prepare('INSERT OR REPLACE INTO oauth_tokens (server_id, tokens) VALUES (?, ?)')
                        .run(serverId, JSON.stringify(tokens));
                    // Force write to disk
                    db.pragma('wal_checkpoint(PASSIVE)');
                },

                redirectToAuthorization: async (authUrl) => {
                    // Backend can't redirect - throw UnauthorizedError to signal browser
                    console.log(`🔐 OAuth needed: ${authUrl.toString()}`);
                    const error = new Error('OAuth authorization required');
                    error.name = 'UnauthorizedError';
                    error.authorizationUrl = authUrl.toString();
                    throw error;
                },

                saveCodeVerifier: async (verifier) => {
                    db.prepare('INSERT OR REPLACE INTO oauth_verifiers (server_id, verifier, created_at) VALUES (?, ?, ?)')
                        .run(serverId, verifier, Math.floor(Date.now() / 1000));
                },

                codeVerifier: async () => {
                    const row = db.prepare('SELECT verifier FROM oauth_verifiers WHERE server_id = ?').get(serverId);
                    if (!row) {
                        throw new Error('Code verifier not found');
                    }
                    return row.verifier;
                },

                invalidateCredentials: async (scope) => {
                    console.log(`🔐 Invalidating ${scope} for ${serverId}`);
                    if (scope === 'all' || scope === 'client') {
                        db.prepare('DELETE FROM oauth_client_info WHERE server_id = ?').run(serverId);
                    }
                    if (scope === 'all' || scope === 'tokens') {
                        db.prepare('DELETE FROM oauth_tokens WHERE server_id = ?').run(serverId);
                    }
                    if (scope === 'all' || scope === 'verifier') {
                        db.prepare('DELETE FROM oauth_verifiers WHERE server_id = ?').run(serverId);
                    }
                },
            };
        }

        // Create transport
        let mcpTransport;
        if (transport === 'sse') {
            mcpTransport = new SSEClientTransport(new URL(url), transportOptions);
        } else if (transport === 'http') {
            mcpTransport = new StreamableHTTPClientTransport(new URL(url), transportOptions);
        } else {
            throw new Error(`Unsupported transport: ${transport}`);
        }

        // Store transport
        transports.set(serverId, mcpTransport);

        // Handle OAuth authorization code if provided
        if (authorizationCode && (mcpTransport instanceof SSEClientTransport || mcpTransport instanceof StreamableHTTPClientTransport)) {
            console.log(`🔐 Completing OAuth flow for ${serverName} with code...`);
            try {
                await mcpTransport.finishAuth(authorizationCode);
                console.log(`✅ OAuth finishAuth completed for ${serverName}`);
            } catch (authError) {
                console.error(`❌ OAuth finishAuth failed:`, authError);
                throw authError;
            }
        }

        // Create MCP client
        const client = new Client(
            {
                name: 'hoot-backend',
                version: '0.2.0',
            },
            {
                capabilities: {},
            }
        );

        // Connect to the server
        console.log(`🔌 Calling client.connect() for ${serverName}...`);
        try {
            await client.connect(mcpTransport);
        } catch (connectError) {
            console.error(`❌ client.connect() failed for ${serverName}:`, connectError);
            console.error(`   Error details: ${connectError.message}`);
            console.error(`   Error code: ${connectError.code}`);
            throw connectError;
        }

        // Store client
        clients.set(serverId, client);

        console.log(`✅ Successfully connected to ${serverName}`);

        res.json({
            success: true,
            serverId,
            message: `Connected to ${serverName}`,
        });
    } catch (error) {
        console.error('❌ Connection error:', error);

        // Check if it's an OAuth UnauthorizedError
        const isUnauthorizedError = error.name === 'UnauthorizedError' ||
            (error.message && error.message.includes('401'));

        if (isUnauthorizedError) {
            // This is expected for OAuth flow - include the authorization URL
            console.log(`✅ OAuth flow initiated - returning auth URL to frontend`);
            return res.status(401).json({
                success: false,
                error: 'UnauthorizedError',
                message: 'OAuth authorization required',
                needsAuth: true,
                authorizationUrl: error.authorizationUrl || null,
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Connection failed',
            needsAuth: false,
        });
    }
});

/**
 * Disconnect from an MCP server
 * POST /mcp/disconnect
 * Body: { serverId: string }
 */
app.post('/mcp/disconnect', async (req, res) => {
    try {
        const { serverId } = req.body;
        console.log(`🔌 Disconnecting from server: ${serverId}`);

        await disconnectServer(serverId);

        res.json({
            success: true,
            serverId,
        });
    } catch (error) {
        console.error('❌ Disconnect error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Disconnect failed',
        });
    }
});

/**
 * List tools from a connected MCP server
 * GET /mcp/tools/:serverId
 */
app.get('/mcp/tools/:serverId', async (req, res) => {
    try {
        const { serverId } = req.params;

        const client = clients.get(serverId);
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Server not connected',
            });
        }

        console.log(`🔧 Listing tools for server: ${serverId}`);
        const response = await client.listTools();

        const tools = response.tools.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema,
        }));

        res.json({
            success: true,
            tools,
        });
    } catch (error) {
        console.error('❌ List tools error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to list tools',
        });
    }
});

/**
 * Execute a tool on a connected MCP server
 * POST /mcp/execute
 * Body: {
 *   serverId: string,
 *   toolName: string,
 *   arguments: Record<string, unknown>
 * }
 */
app.post('/mcp/execute', async (req, res) => {
    try {
        const { serverId, toolName, arguments: args } = req.body;

        const client = clients.get(serverId);
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Server not connected',
            });
        }

        console.log(`⚡ Executing tool: ${toolName} on server: ${serverId}`, args);
        const response = await client.callTool({
            name: toolName,
            arguments: args,
        });

        res.json({
            success: true,
            result: response.content,
        });
    } catch (error) {
        console.error('❌ Tool execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Tool execution failed',
        });
    }
});

/**
 * Get connection status for a server
 * GET /mcp/status/:serverId
 */
app.get('/mcp/status/:serverId', (req, res) => {
    const { serverId } = req.params;
    const isConnected = clients.has(serverId);

    res.json({
        success: true,
        serverId,
        connected: isConnected,
    });
});

/**
 * List all connected servers
 * GET /mcp/connections
 */
app.get('/mcp/connections', (req, res) => {
    const connections = Array.from(clients.keys());

    res.json({
        success: true,
        connections,
        count: connections.length,
    });
});

/**
 * Helper function to disconnect a server
 */
async function disconnectServer(serverId) {
    const client = clients.get(serverId);
    if (client) {
        await client.close();
        clients.delete(serverId);
    }

    transports.delete(serverId);

    // Keep OAuth credentials (tokens, client_info) for reconnection
    // Only clean up temporary verifiers (they expire anyway)
    db.prepare('DELETE FROM oauth_verifiers WHERE server_id = ?').run(serverId);

    console.log(`🔐 OAuth credentials preserved for ${serverId} (for future reconnection)`);
}

/**
 * Disconnect all servers on shutdown
 */
async function disconnectAll() {
    console.log('🔌 Disconnecting all servers...');
    const disconnectPromises = Array.from(clients.keys()).map(serverId =>
        disconnectServer(serverId).catch(err =>
            console.error(`Failed to disconnect ${serverId}:`, err)
        )
    );
    await Promise.all(disconnectPromises);
    console.log('✅ All servers disconnected');
}

// 404 handler
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Express Error]', err);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: err.message,
        });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
🦉 Hoot MCP Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Running on: http://localhost:${PORT}
✓ Health check: http://localhost:${PORT}/health
✓ API endpoints:
  - POST /mcp/connect
  - POST /mcp/disconnect
  - GET  /mcp/tools/:serverId
  - POST /mcp/execute
  - GET  /mcp/status/:serverId
  - GET  /mcp/connections

This backend server acts as the MCP client,
eliminating CORS issues when connecting to
MCP servers from the browser.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Kill the process using: lsof -ti:${PORT} | xargs kill -9`);
        process.exit(1);
    } else {
        console.error('\n❌ Server error:', err);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\n🦉 Shutting down MCP backend server...');
    await disconnectAll();
    db.close();
    server.close(() => {
        console.log('✓ MCP backend server stopped');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\n🦉 Shutting down MCP backend server...');
    await disconnectAll();
    db.close();
    server.close(() => {
        console.log('✓ MCP backend server stopped');
        process.exit(0);
    });
});

