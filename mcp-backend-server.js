import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync, appendFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { toolFilterManager } from './mcp-backend-tool-filter.js';

const app = express();
const PORT = process.env.PORT || 8008;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8009';

// Generate session token for authentication
// This provides protection against unauthorized localhost access
const SESSION_TOKEN = process.env.HOOT_SESSION_TOKEN || randomBytes(32).toString('hex');

// Enable CORS for browser app
// In production, FRONTEND_URL should be set to your deployed frontend URL
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8009',
    ...(FRONTEND_URL !== 'http://localhost:8009' ? [FRONTEND_URL] : [])
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(express.json());

// Initialize SQLite database in user's home directory
// This ensures persistence across npx runs and npm cache clears
const hootDir = join(homedir(), '.hoot');
if (!existsSync(hootDir)) {
    mkdirSync(hootDir, { recursive: true });
}
const dbPath = join(hootDir, 'hoot-mcp.db');
const auditLogPath = join(hootDir, 'audit.log');
console.log(`📁 Database location: ${dbPath}`);
console.log(`📝 Audit log: ${auditLogPath}`);
const db = new Database(dbPath);

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
    
    CREATE TABLE IF NOT EXISTS favicon_cache (
        server_url TEXT PRIMARY KEY,
        favicon_url TEXT,
        oauth_logo_uri TEXT,
        cached_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
`);

// Clean up old verifiers (older than 10 minutes)
db.prepare('DELETE FROM oauth_verifiers WHERE created_at < ?')
    .run(Math.floor(Date.now() / 1000) - 600);

// Checkpoint WAL to ensure data is written
db.pragma('wal_checkpoint(TRUNCATE)');

console.log('✓ SQLite database initialized');

// Security: Audit logging
function logAuditEvent(event, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        ...details
    };
    try {
        appendFileSync(auditLogPath, JSON.stringify(entry) + '\n');
    } catch (err) {
        console.error('Failed to write audit log:', err.message);
    }
}

// Security: Rate limiting state
const rateLimitMap = new Map(); // clientId -> { count, resetTime }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(clientId) {
    const now = Date.now();
    const clientLimit = rateLimitMap.get(clientId);

    if (!clientLimit || now > clientLimit.resetTime) {
        rateLimitMap.set(clientId, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW
        });
        return { allowed: true };
    }

    if (clientLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return {
            allowed: false,
            resetIn: Math.ceil((clientLimit.resetTime - now) / 1000)
        };
    }

    clientLimit.count++;
    return { allowed: true };
}

// In-memory storage for active connections (transports can't be serialized)
const clients = new Map();
const transports = new Map();

// Security: Authentication middleware
function authenticateRequest(req, res, next) {
    // Allow health check and token endpoint without auth
    if (req.path === '/health' || req.path === '/auth/token') {
        return next();
    }

    const token = req.headers['x-hoot-token'];
    if (!token || token !== SESSION_TOKEN) {
        logAuditEvent('auth_failed', {
            path: req.path,
            ip: req.ip,
            origin: req.headers.origin
        });
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Missing or invalid authentication token'
        });
    }

    next();
}

// Apply authentication to all routes
app.use(authenticateRequest);

/**
 * Get authentication token
 * GET /auth/token
 * This allows the frontend to retrieve the session token
 */
app.get('/auth/token', (req, res) => {
    // Only allow requests from configured CORS origins
    const origin = req.headers.origin;
    const allowedOriginsForToken = [
        'http://localhost:3000',
        'http://localhost:8009',
        ...(FRONTEND_URL !== 'http://localhost:8009' ? [FRONTEND_URL] : [])
    ];

    if (!origin || !allowedOriginsForToken.includes(origin)) {
        logAuditEvent('token_request_denied', {
            origin,
            ip: req.ip
        });
        return res.status(403).json({
            success: false,
            error: 'Forbidden'
        });
    }

    logAuditEvent('token_retrieved', { origin });
    res.json({
        success: true,
        token: SESSION_TOKEN
    });
});

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
 * Auto-detect server configuration
 * POST /mcp/auto-detect
 * Body: { url: string }
 * Returns: { success: boolean, serverInfo?: { name: string, version: string, authMethods?: string[] }, transport?: 'http' | 'sse', requiresOAuth?: boolean, requiresClientCredentials?: boolean, error?: string }
 */
app.post('/mcp/auto-detect', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        console.log(`🔍 Auto-detecting configuration for: ${url}`);

        // Step 1: Make a direct HTTP POST to check WWW-Authenticate header
        // This is the MCP-spec-compliant way to detect OAuth (RFC 9728)
        let requiresOAuthFromHeader = false;
        let resourceMetadata = null;
        let scope = null;

        try {
            console.log(`🔍 Probing for WWW-Authenticate header...`);
            const probeResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'initialize',
                    id: 1,
                    params: {
                        protocolVersion: '2024-11-05',
                        capabilities: {},
                        clientInfo: { name: 'hoot-backend', version: '0.2.0' }
                    }
                })
            });

            if (probeResponse.status === 401) {
                const wwwAuth = probeResponse.headers.get('www-authenticate');
                console.log(`🔍 WWW-Authenticate:`, wwwAuth);

                if (wwwAuth && wwwAuth.toLowerCase().includes('bearer')) {
                    requiresOAuthFromHeader = true;
                    console.log(`🔐 OAuth detected via WWW-Authenticate header (MCP spec compliant)`);

                    // Extract resource_metadata URL (RFC 9728)
                    const resourceMatch = wwwAuth.match(/resource_metadata="([^"]+)"/);
                    if (resourceMatch) {
                        resourceMetadata = resourceMatch[1];
                        console.log(`📋 Resource metadata URL:`, resourceMetadata);
                    }

                    // Extract scope (RFC 6750)
                    const scopeMatch = wwwAuth.match(/scope="([^"]+)"/);
                    if (scopeMatch) {
                        scope = scopeMatch[1];
                        console.log(`🔑 Required scope:`, scope);
                    }
                }
            }
        } catch (probeError) {
            console.log(`⚠️  WWW-Authenticate probe failed:`, probeError.message);
        }

        // Try transports in order: HTTP first, then SSE
        const transportsToTry = ['http', 'sse'];
        let detectedTransport = null;
        let serverInfo = null;
        let requiresOAuth = requiresOAuthFromHeader; // Start with header detection
        let requiresClientCredentials = false;
        let requiresHeaderAuth = false;
        let lastError = null;

        for (const transport of transportsToTry) {
            console.log(`🔌 Trying ${transport.toUpperCase()} transport...`);

            try {
                // Create a temporary transport
                let mcpTransport;
                if (transport === 'http') {
                    mcpTransport = new StreamableHTTPClientTransport(new URL(url));
                } else {
                    mcpTransport = new SSEClientTransport(new URL(url));
                }

                // Create a temporary client
                const client = new Client(
                    {
                        name: 'hoot-backend',
                        version: '0.2.0',
                    },
                    {
                        capabilities: {},
                    }
                );

                // Try to connect
                await client.connect(mcpTransport);

                // If we get here, connection succeeded!
                // Extract server info from the connection
                // The MCP SDK stores server info in the client after initialization
                const serverVersion = client.getServerVersion();
                if (serverVersion) {
                    serverInfo = {
                        name: serverVersion.name || 'Unknown Server',
                        version: serverVersion.version || '1.0.0',
                    };

                    // Check if server advertises auth methods in metadata
                    // This is a potential future extension to the MCP protocol
                    if (serverVersion.authMethods && Array.isArray(serverVersion.authMethods)) {
                        serverInfo.authMethods = serverVersion.authMethods;

                        // Check for specific auth methods
                        if (serverVersion.authMethods.includes('client_credentials')) {
                            requiresClientCredentials = true;
                            console.log(`🔑 Server advertises client_credentials auth`);
                        }
                        if (serverVersion.authMethods.includes('oauth') || serverVersion.authMethods.includes('oauth2')) {
                            requiresOAuth = true;
                            console.log(`🔐 Server advertises OAuth auth`);
                        }
                    }
                }

                detectedTransport = transport;
                // Only set requiresOAuth to false if not already detected from metadata
                if (!requiresOAuth && !requiresClientCredentials) {
                    requiresOAuth = false;
                }

                console.log(`✅ Successfully connected with ${transport.toUpperCase()}`);
                console.log(`📋 Server info:`, serverInfo);

                // Clean up
                await client.close();
                break;
            } catch (error) {
                console.log(`❌ ${transport.toUpperCase()} failed:`, error.message);

                // Log full error for debugging OAuth detection
                console.log(`🔍 Error details:`, {
                    name: error.name,
                    hasAuthorizationUrl: !!error.authorizationUrl,
                    authorizationUrl: error.authorizationUrl,
                    errorMessage: error.message
                });

                // Check if it's an OAuth error (SDK throws UnauthorizedError with authorizationUrl)
                const isOAuthError = error.name === 'UnauthorizedError' && error.authorizationUrl;

                // Check if it's a generic auth error (401/403 but no OAuth detected)
                const is401or403 = error.message && (error.message.includes('401') || error.message.includes('403'));
                const isHeaderAuthError = is401or403 && !isOAuthError && !requiresOAuthFromHeader;

                if (isOAuthError) {
                    console.log(`🔐 OAuth detected for ${transport.toUpperCase()} (SDK UnauthorizedError)`);
                    detectedTransport = transport;
                    requiresOAuth = true;

                    // For OAuth servers, we need to at least get the server info
                    // The MCP SDK should provide this even if auth fails
                    // Try to create a client and attempt connection to get metadata
                    try {
                        const authTransport = transport === 'http'
                            ? new StreamableHTTPClientTransport(new URL(url))
                            : new SSEClientTransport(new URL(url));

                        const authClient = new Client(
                            { name: 'hoot-backend', version: '0.2.0' },
                            { capabilities: {} }
                        );

                        // This will fail with OAuth, but might give us server info
                        try {
                            await authClient.connect(authTransport);
                        } catch (authError) {
                            // Expected to fail, try to extract info
                            const serverVersion = authClient.getServerVersion();
                            if (serverVersion) {
                                serverInfo = {
                                    name: serverVersion.name || 'Unknown Server',
                                    version: serverVersion.version || '1.0.0',
                                };

                                // Check for auth methods even in OAuth scenario
                                if (serverVersion.authMethods && Array.isArray(serverVersion.authMethods)) {
                                    serverInfo.authMethods = serverVersion.authMethods;

                                    if (serverVersion.authMethods.includes('client_credentials')) {
                                        requiresClientCredentials = true;
                                        console.log(`🔑 Server advertises client_credentials auth (even with OAuth)`);
                                    }
                                }
                            }
                        }
                    } catch (metadataError) {
                        console.log(`Could not extract server metadata:`, metadataError.message);
                    }

                    break;
                }

                // Handle header-based auth (401/403 but not OAuth)
                if (isHeaderAuthError) {
                    console.log(`🔑 Custom auth detected for ${transport.toUpperCase()} (401/403 without OAuth)`);
                    detectedTransport = transport;
                    requiresOAuth = false; // Explicitly not OAuth
                    requiresHeaderAuth = true; // Mark that custom auth is needed

                    // Try to extract server name from URL since we can't connect
                    try {
                        const urlObj = new URL(url);
                        const hostname = urlObj.hostname;
                        const parts = hostname.split('.');
                        let extractedName = 'MCP Server';

                        if (parts.length >= 2) {
                            const namePart = parts[parts.length - 2];
                            extractedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                        }

                        serverInfo = {
                            name: extractedName,
                            version: '1.0.0',
                        };

                        console.log(`ℹ️  Custom auth detected, extracted name from URL: ${extractedName}`);
                    } catch (urlError) {
                        serverInfo = { name: 'MCP Server', version: '1.0.0' };
                    }

                    break;
                }

                // If OAuth was detected from WWW-Authenticate header but SDK didn't recognize it
                if (requiresOAuthFromHeader && is401or403) {
                    console.log(`🔐 Using OAuth from WWW-Authenticate header for ${transport.toUpperCase()}`);
                    detectedTransport = transport;
                    requiresOAuth = true;

                    // Try to extract server name from URL
                    try {
                        const urlObj = new URL(url);
                        const hostname = urlObj.hostname;
                        const parts = hostname.split('.');
                        let extractedName = 'MCP Server';

                        if (parts.length >= 2) {
                            const namePart = parts[parts.length - 2];
                            extractedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                        }

                        serverInfo = {
                            name: extractedName,
                            version: '1.0.0',
                        };

                        console.log(`ℹ️  OAuth server, extracted name from URL: ${extractedName}`);
                    } catch (urlError) {
                        serverInfo = { name: 'MCP Server', version: '1.0.0' };
                    }

                    break;
                }

                lastError = error;

                // Continue to next transport if this one failed
                continue;
            }
        }

        if (!detectedTransport) {
            return res.status(400).json({
                success: false,
                error: lastError?.message || 'Could not connect with any transport method',
            });
        }

        // If we couldn't get server info (e.g., OAuth blocked it), extract a name from the URL
        if (!serverInfo) {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;

                // Extract a reasonable name from the hostname
                // e.g., "mcp.notion.com" -> "Notion"
                // e.g., "mcp.portkey.ai" -> "Portkey"
                const parts = hostname.split('.');
                let extractedName = 'MCP Server';

                if (parts.length >= 2) {
                    // Get the second-to-last part (usually the company name)
                    const namePart = parts[parts.length - 2];
                    // Capitalize first letter
                    extractedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                }

                serverInfo = {
                    name: extractedName,
                    version: '1.0.0',
                };

                console.log(`ℹ️  Could not get server metadata, extracted name from URL: ${extractedName}`);
            } catch (urlError) {
                serverInfo = { name: 'MCP Server', version: '1.0.0' };
            }
        }

        res.json({
            success: true,
            transport: detectedTransport,
            serverInfo,
            requiresOAuth,
            requiresClientCredentials,
            requiresHeaderAuth, // NEW: indicates custom auth needed (generic 401/403)
        });

        console.log('📤 Auto-detect response:', {
            success: true,
            transport: detectedTransport,
            serverName: serverInfo?.name,
            requiresOAuth,
            requiresClientCredentials,
            requiresHeaderAuth,
        });
    } catch (error) {
        console.error('Auto-detect error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Auto-detection failed',
        });
    }
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

        logAuditEvent('mcp_connect_attempt', {
            serverId,
            serverName,
            url,
            transport,
            authType: auth?.type
        });

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
            const callbackUrl = `${FRONTEND_URL}/oauth/callback`;

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
                        client_uri: FRONTEND_URL,
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
                    const tokens = row ? JSON.parse(row.tokens) : undefined;

                    if (tokens) {
                        // Log token status for debugging
                        const hasRefresh = !!tokens.refresh_token;
                        const expiresIn = tokens.expires_in || 'unknown';
                        console.log(`🔐 Loading tokens for ${serverId}: expires_in=${expiresIn}s, has_refresh=${hasRefresh}`);
                    } else {
                        console.log(`🔐 No stored tokens found for ${serverId}`);
                    }

                    return tokens;
                },

                saveTokens: async (tokens) => {
                    const hasRefresh = !!tokens.refresh_token;
                    const expiresIn = tokens.expires_in || 'unknown';
                    console.log(`🔐 Saving tokens for ${serverId}: expires_in=${expiresIn}s, has_refresh=${hasRefresh}`);
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
                    console.log(`🔐 Saving code verifier for ${serverId} (length: ${verifier.length})`);
                    db.prepare('INSERT OR REPLACE INTO oauth_verifiers (server_id, verifier, created_at) VALUES (?, ?, ?)')
                        .run(serverId, verifier, Math.floor(Date.now() / 1000));
                    // Force write to disk immediately
                    db.pragma('wal_checkpoint(PASSIVE)');
                    console.log(`✅ Code verifier saved successfully for ${serverId}`);
                },

                codeVerifier: async () => {
                    const row = db.prepare('SELECT verifier FROM oauth_verifiers WHERE server_id = ?').get(serverId);
                    if (!row) {
                        console.error(`❌ Code verifier not found for ${serverId}`);
                        console.error(`   This may indicate:
   1. The OAuth session was not initiated from this backend instance
   2. The verifier was cleaned up (older than 10 minutes)
   3. Database write failed during initial OAuth flow`);

                        // Log all verifiers for debugging
                        const allVerifiers = db.prepare('SELECT server_id, created_at FROM oauth_verifiers').all();
                        console.error(`   Current verifiers in DB:`, allVerifiers);

                        throw new Error('Code verifier not found for this OAuth session. Please try reconnecting.');
                    }
                    console.log(`🔐 Retrieved code verifier for ${serverId}`);
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

        logAuditEvent('mcp_connect_success', {
            serverId,
            serverName
        });

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
 * Get server information (name, version) from a connected server
 * GET /mcp/server-info/:serverId
 */
app.get('/mcp/server-info/:serverId', async (req, res) => {
    try {
        const { serverId } = req.params;

        const client = clients.get(serverId);
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Server not connected'
            });
        }

        // Get server version info from the connected client
        const serverVersion = client.getServerVersion();

        if (serverVersion) {
            console.log(`📋 Retrieved server info for ${serverId}:`, {
                name: serverVersion.name,
                version: serverVersion.version
            });

            res.json({
                success: true,
                serverInfo: {
                    name: serverVersion.name,
                    version: serverVersion.version
                }
            });
        } else {
            res.json({
                success: true,
                serverInfo: null
            });
        }
    } catch (error) {
        console.error('Get server info error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get server info'
        });
    }
});

/**
 * Get OAuth metadata for a connected server
 * GET /mcp/oauth-metadata/:serverId
 * Returns: { success: boolean, metadata?: object }
 */
app.get('/mcp/oauth-metadata/:serverId', async (req, res) => {
    try {
        const { serverId } = req.params;

        const transport = transports.get(serverId);
        if (!transport) {
            return res.status(404).json({
                success: false,
                error: 'Server not connected'
            });
        }

        // Check if transport has authServerMetadata (available in SDK)
        const metadata = transport.authServerMetadata || null;

        if (metadata) {
            console.log(`📋 Retrieved OAuth metadata for ${serverId}:`, {
                issuer: metadata.issuer,
                hasLogoUri: !!metadata.logo_uri
            });
        }

        res.json({
            success: true,
            metadata: metadata
        });
    } catch (error) {
        console.error('Get OAuth metadata error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get OAuth metadata'
        });
    }
});

// Get favicon for a server URL
app.post('/mcp/favicon', async (req, res) => {
    try {
        const { serverUrl, oauthLogoUri } = req.body;

        if (!serverUrl) {
            return res.status(400).json({
                success: false,
                error: 'Server URL is required'
            });
        }

        // Check database cache first (24 hour TTL)
        const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
        const cached = db.prepare(`
            SELECT favicon_url, cached_at 
            FROM favicon_cache 
            WHERE server_url = ? 
            AND (oauth_logo_uri IS NULL OR oauth_logo_uri = ?)
            AND cached_at > ?
        `).get(serverUrl, oauthLogoUri || null, Math.floor(Date.now() / 1000) - CACHE_TTL_SECONDS);

        if (cached) {
            console.log(`✓ Favicon cache hit for: ${serverUrl}`);
            return res
                .set('Cache-Control', 'public, max-age=86400') // 24 hours
                .json({
                    success: true,
                    faviconUrl: cached.favicon_url
                });
        }

        console.log(`⟳ Fetching favicon for: ${serverUrl}`);

        const faviconPaths = ['/favicon.ico', '/favicon.png', '/favicon.svg', '/favicon'];

        // Helper to check if a URL is accessible
        const checkUrl = async (url) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Hoot-MCP-Client/1.0'
                    }
                });
                clearTimeout(timeout);

                return response.ok;
            } catch (error) {
                return false;
            }
        };

        // Helper to extract favicon URL from HTML
        const extractFaviconFromHtml = async (pageUrl) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

                const response = await fetch(pageUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Hoot-MCP-Client/1.0'
                    }
                });
                clearTimeout(timeout);

                if (!response.ok) return null;

                const html = await response.text();

                // Match various favicon link formats
                const patterns = [
                    /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i,
                    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i
                ];

                for (const pattern of patterns) {
                    const match = html.match(pattern);
                    if (match && match[1]) {
                        let faviconUrl = match[1];

                        // Handle relative URLs
                        if (faviconUrl.startsWith('//')) {
                            faviconUrl = new URL(pageUrl).protocol + faviconUrl;
                        } else if (faviconUrl.startsWith('/')) {
                            faviconUrl = new URL(pageUrl).origin + faviconUrl;
                        } else if (!faviconUrl.startsWith('http')) {
                            faviconUrl = new URL(faviconUrl, pageUrl).href;
                        }

                        // Verify the URL is accessible
                        if (await checkUrl(faviconUrl)) {
                            return faviconUrl;
                        }
                    }
                }

                return null;
            } catch (error) {
                return null;
            }
        };

        let foundFaviconUrl = null;

        // 1. Try OAuth logo_uri first
        if (oauthLogoUri) {
            try {
                new URL(oauthLogoUri); // Validate URL
                if (await checkUrl(oauthLogoUri)) {
                    foundFaviconUrl = oauthLogoUri;
                }
            } catch {
                // Invalid URL, skip
            }
        }

        // 2. Extract domain and try standard paths (if not found yet)
        if (!foundFaviconUrl) {
            let urlObj;
            try {
                urlObj = new URL(serverUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid server URL'
                });
            }

            const domain = urlObj.origin;

            // Try specific domain
            for (const path of faviconPaths) {
                const url = `${domain}${path}`;
                if (await checkUrl(url)) {
                    foundFaviconUrl = url;
                    break;
                }
            }

            // 3. Try primary domain if subdomain (and still not found)
            if (!foundFaviconUrl) {
                const parts = urlObj.hostname.split('.');
                if (parts.length > 2) {
                    const primaryDomain = parts.slice(-2).join('.');
                    const primaryOrigin = `${urlObj.protocol}//${primaryDomain}`;

                    if (primaryOrigin !== domain) {
                        for (const path of faviconPaths) {
                            const url = `${primaryOrigin}${path}`;
                            if (await checkUrl(url)) {
                                foundFaviconUrl = url;
                                break;
                            }
                        }

                        // 4. Parse HTML from primary domain as final fallback
                        if (!foundFaviconUrl) {
                            foundFaviconUrl = await extractFaviconFromHtml(primaryOrigin);
                        }
                    }
                }
            }

            // 5. Parse HTML from subdomain as final fallback (if not a primary domain)
            if (!foundFaviconUrl && urlObj.hostname.split('.').length > 2) {
                foundFaviconUrl = await extractFaviconFromHtml(domain);
            }
        }

        // Cache the result in database (including null)
        db.prepare(`
            INSERT OR REPLACE INTO favicon_cache (server_url, favicon_url, oauth_logo_uri, cached_at)
            VALUES (?, ?, ?, ?)
        `).run(serverUrl, foundFaviconUrl, oauthLogoUri || null, Math.floor(Date.now() / 1000));

        console.log(`✓ Favicon result for ${serverUrl}: ${foundFaviconUrl || 'none'}`);

        res
            .set('Cache-Control', 'public, max-age=86400') // 24 hours
            .json({
                success: true,
                faviconUrl: foundFaviconUrl
            });
    } catch (error) {
        console.error('Favicon fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch favicon'
        });
    }
});

// Proxy favicon images to avoid CORS/COEP issues
app.get('/mcp/favicon-proxy', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).send('URL parameter is required');
        }

        // Fetch the favicon
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Hoot-MCP-Client/1.0'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return res.status(404).send('Favicon not found');
        }

        // Get the image data
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/x-icon';

        // Send with proper cache headers
        res
            .set('Content-Type', contentType)
            .set('Cache-Control', 'public, max-age=86400') // 24 hours
            .set('Cross-Origin-Resource-Policy', 'cross-origin')
            .send(Buffer.from(buffer));
    } catch (error) {
        console.error('Favicon proxy error:', error);
        res.status(500).send('Failed to fetch favicon');
    }
});

/**
 * Discover if a server requires OAuth
 * POST /mcp/discover-oauth
 * Body: {
 *   url: string,
 *   transport: 'sse' | 'http'
 * }
 */
app.post('/mcp/discover-oauth', async (req, res) => {
    try {
        const { url, transport } = req.body;

        console.log(`🔍 Discovering OAuth for: ${url} (${transport})`);

        // Create a temporary transport with OAuth provider
        const tempServerId = `temp-${Date.now()}`;
        const callbackUrl = `${FRONTEND_URL}/oauth/callback`;

        const transportOptions = {
            authProvider: {
                get redirectUrl() {
                    return callbackUrl;
                },

                get clientMetadata() {
                    return {
                        client_name: 'Hoot MCP Testing Tool',
                        client_uri: FRONTEND_URL,
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

                clientInformation: async () => undefined,
                saveClientInformation: async () => { },
                tokens: async () => undefined,
                saveTokens: async () => { },

                redirectToAuthorization: async (authUrl) => {
                    // Don't actually redirect, just capture the URL
                    const error = new Error('OAuth authorization required');
                    error.name = 'UnauthorizedError';
                    error.authorizationUrl = authUrl.toString();
                    throw error;
                },

                saveCodeVerifier: async () => { },
                codeVerifier: async () => {
                    throw new Error('Code verifier not needed for discovery');
                },
                invalidateCredentials: async () => { },
            }
        };

        // Create transport
        let mcpTransport;
        if (transport === 'sse') {
            mcpTransport = new SSEClientTransport(new URL(url), transportOptions);
        } else if (transport === 'http') {
            mcpTransport = new StreamableHTTPClientTransport(new URL(url), transportOptions);
        } else {
            throw new Error(`Unsupported transport: ${transport}`);
        }

        // Create temporary MCP client
        const client = new Client(
            {
                name: 'hoot-discovery',
                version: '0.2.0',
            },
            {
                capabilities: {},
            }
        );

        // Try to connect - this will trigger OAuth discovery if needed
        try {
            await client.connect(mcpTransport);
            // Connection succeeded without OAuth
            await client.close();

            return res.json({
                success: true,
                requiresOAuth: false,
            });
        } catch (connectError) {
            // Check if it's an OAuth UnauthorizedError
            const isUnauthorizedError = connectError.name === 'UnauthorizedError' ||
                (connectError.message && connectError.message.includes('401'));

            if (isUnauthorizedError) {
                console.log(`✅ OAuth detected for ${url}`);
                return res.json({
                    success: true,
                    requiresOAuth: true,
                });
            }

            // Some other error - might be network issue, invalid URL, etc.
            // Return success=false so we don't auto-select OAuth
            console.log(`⚠️  Could not determine OAuth requirement: ${connectError.message}`);
            return res.json({
                success: false,
                error: connectError.message || 'Discovery failed',
            });
        }
    } catch (error) {
        console.error('❌ OAuth discovery error:', error);
        res.json({
            success: false,
            error: error.message || 'Discovery failed',
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
 * Clear OAuth tokens from backend database
 * POST /mcp/clear-oauth-tokens
 * Body: { serverId: string }
 */
app.post('/mcp/clear-oauth-tokens', authenticateRequest, async (req, res) => {
    try {
        const { serverId } = req.body;

        if (!serverId) {
            return res.status(400).json({
                success: false,
                error: 'serverId is required',
            });
        }

        console.log(`🔐 Clearing OAuth tokens for server: ${serverId}`);

        // Clear tokens, client info, and verifier from database
        db.prepare('DELETE FROM oauth_tokens WHERE server_id = ?').run(serverId);
        db.prepare('DELETE FROM oauth_client_info WHERE server_id = ?').run(serverId);
        db.prepare('DELETE FROM oauth_verifiers WHERE server_id = ?').run(serverId);

        // Force write to disk
        db.pragma('wal_checkpoint(PASSIVE)');

        console.log(`✅ OAuth credentials cleared for ${serverId}`);

        res.json({
            success: true,
            serverId,
        });
    } catch (error) {
        console.error('❌ Clear OAuth tokens error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to clear OAuth tokens',
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

        // Rate limiting
        const rateLimit = checkRateLimit(serverId);
        if (!rateLimit.allowed) {
            logAuditEvent('rate_limit_exceeded', {
                serverId,
                toolName,
                resetIn: rateLimit.resetIn
            });
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                message: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`
            });
        }

        const client = clients.get(serverId);
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Server not connected',
            });
        }

        // Security: Log tool execution
        logAuditEvent('tool_execution', {
            serverId,
            toolName,
            argsPreview: JSON.stringify(args).substring(0, 200)
        });

        console.log(`⚡ Executing tool: ${toolName} on server: ${serverId}`, args);
        const response = await client.callTool({
            name: toolName,
            arguments: args,
        });

        logAuditEvent('tool_execution_success', {
            serverId,
            toolName
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

// ==============================================
// Tool Filter Endpoints
// ==============================================

/**
 * Initialize the tool filter with connected servers and their tools
 * POST /mcp/tool-filter/initialize
 */
app.post('/mcp/tool-filter/initialize', async (req, res) => {
    try {
        const { servers: serversWithTools } = req.body;

        if (!serversWithTools || !Array.isArray(serversWithTools)) {
            return res.status(400).json({
                error: 'Invalid request: servers array required'
            });
        }

        const result = await toolFilterManager.initialize(serversWithTools);

        if (result.success) {
            res.json({
                success: true,
                message: 'Tool filter initialized successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Tool filter initialization error:', error);
        res.status(500).json({
            error: 'Failed to initialize tool filter',
            details: error.message
        });
    }
});

/**
 * Filter tools based on conversation context
 * POST /mcp/tool-filter/filter
 */
app.post('/mcp/tool-filter/filter', async (req, res) => {
    try {
        const { messages, options = {} } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'Invalid request: messages array required'
            });
        }

        const result = await toolFilterManager.filterTools(messages, options);

        if (result.success) {
            res.json({
                success: true,
                tools: result.tools,
                metrics: result.metrics
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Tool filtering error:', error);
        res.status(500).json({
            error: 'Failed to filter tools',
            details: error.message
        });
    }
});

/**
 * Get tool filter stats
 * GET /mcp/tool-filter/stats
 */
app.get('/mcp/tool-filter/stats', (req, res) => {
    try {
        const stats = toolFilterManager.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get filter stats error:', error);
        res.status(500).json({
            error: 'Failed to get filter stats',
            details: error.message
        });
    }
});

/**
 * Clear tool filter cache
 * POST /mcp/tool-filter/clear-cache
 */
app.post('/mcp/tool-filter/clear-cache', (req, res) => {
    try {
        toolFilterManager.clearCache();
        res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({
            error: 'Failed to clear cache',
            details: error.message
        });
    }
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
✓ Database: ${dbPath}
✓ Audit log: ${auditLogPath}

🔒 Security Features Enabled:
✓ Session token authentication
✓ Rate limiting (30 req/min per server)
✓ Audit logging
✓ CORS protection (localhost only)

📋 API endpoints:
  - GET  /auth/token (get session token)
  - POST /mcp/connect
  - POST /mcp/disconnect
  - POST /mcp/discover-oauth
  - GET  /mcp/tools/:serverId
  - POST /mcp/execute
  - GET  /mcp/status/:serverId
  - GET  /mcp/connections

This backend server acts as the MCP client,
eliminating CORS issues when connecting to
MCP servers from the browser.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

    logAuditEvent('server_started', {
        port: PORT,
        pid: process.pid
    });
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

