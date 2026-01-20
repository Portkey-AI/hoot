#!/usr/bin/env node

/**
 * Comprehensive Test MCP Server
 * 
 * A production-ready test server that implements:
 * - Full MCP protocol via StreamableHTTP transport
 * - OAuth 2.1 with PKCE (including client credentials support)
 * - Custom OAuth endpoints
 * - API key authentication
 * - All tools from the "everything" MCP server
 * - Configurable error scenarios
 * - Rate limiting
 * - Comprehensive logging
 * 
 * This server acts as a real-world MCP server for testing all Hoot features.
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.TEST_MCP_PORT || 9000;
const OAUTH_PORT = process.env.TEST_OAUTH_PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// In-Memory Storage (simulating a database)
// ============================================================================

const storage = {
    // OAuth state
    authCodes: new Map(), // code -> { clientId, codeChallenge, redirectUri, userId }
    accessTokens: new Map(), // token -> { clientId, userId, scope, expiresAt }
    refreshTokens: new Map(), // token -> { clientId, userId, scope }
    clients: new Map(), // clientId -> { clientSecret, redirectUris }

    // API keys
    apiKeys: new Map(), // key -> { name, created }

    // MCP session state
    sessions: new Map(), // sessionId -> { initialized, capabilities }

    // Rate limiting
    rateLimits: new Map(), // ip -> { requests: [], limit: 100 }
};

// Pre-register some test clients
storage.clients.set('test-client-public', {
    clientSecret: null, // Public client
    redirectUris: ['http://localhost:5173/oauth/callback', 'http://localhost:8009/oauth/callback'],
    name: 'Test Public Client'
});

storage.clients.set('test-client-confidential', {
    clientSecret: 'test-secret-123',
    redirectUris: ['http://localhost:5173/oauth/callback', 'http://localhost:8009/oauth/callback'],
    name: 'Test Confidential Client'
});

// Pre-register API keys
storage.apiKeys.set('test-api-key-valid', { name: 'Test Key', created: Date.now() });

// ============================================================================
// MCP Tools (from "everything" server)
// ============================================================================

const MCP_TOOLS = [
    {
        name: 'echo',
        description: 'Echoes back the input message',
        inputSchema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'The message to echo back'
                }
            },
            required: ['message']
        }
    },
    {
        name: 'add',
        description: 'Adds two numbers together',
        inputSchema: {
            type: 'object',
            properties: {
                a: {
                    type: 'number',
                    description: 'First number'
                },
                b: {
                    type: 'number',
                    description: 'Second number'
                }
            },
            required: ['a', 'b']
        }
    },
    {
        name: 'get_weather',
        description: 'Gets the weather for a location',
        inputSchema: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'City name or location'
                },
                units: {
                    type: 'string',
                    enum: ['celsius', 'fahrenheit'],
                    description: 'Temperature units'
                }
            },
            required: ['location']
        }
    },
    {
        name: 'complex_tool',
        description: 'A tool with complex nested parameters',
        inputSchema: {
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean' },
                        options: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        metadata: {
                            type: 'object',
                            additionalProperties: true
                        }
                    },
                    required: ['enabled']
                }
            },
            required: ['config']
        }
    },
    {
        name: 'long_running_task',
        description: 'Simulates a long-running task',
        inputSchema: {
            type: 'object',
            properties: {
                duration: {
                    type: 'number',
                    description: 'Duration in seconds',
                    default: 2
                }
            }
        }
    },
    {
        name: 'error_generator',
        description: 'Generates various error scenarios for testing',
        inputSchema: {
            type: 'object',
            properties: {
                errorType: {
                    type: 'string',
                    enum: ['validation', 'runtime', 'timeout', 'auth'],
                    description: 'Type of error to generate'
                }
            },
            required: ['errorType']
        }
    }
];

// ============================================================================
// Utility Functions
// ============================================================================

function generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
}

function generateAuthCode() {
    return 'auth_' + generateRandomToken(16);
}

function generateAccessToken() {
    return 'at_' + generateRandomToken(32);
}

function generateRefreshToken() {
    return 'rt_' + generateRandomToken(32);
}

function generateSessionId() {
    return 'session_' + generateRandomToken(16);
}

function validatePKCE(codeVerifier, codeChallenge) {
    if (!codeVerifier || !codeChallenge) {
        return false;
    }

    // Compute the challenge from the verifier
    const computed = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

    return computed === codeChallenge;
}

function extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

function checkRateLimit(ip) {
    const now = Date.now();
    const limit = storage.rateLimits.get(ip) || { requests: [], limit: 100 };

    // Remove requests older than 1 minute
    limit.requests = limit.requests.filter(time => now - time < 60000);

    if (limit.requests.length >= limit.limit) {
        return false;
    }

    limit.requests.push(now);
    storage.rateLimits.set(ip, limit);
    return true;
}

// ============================================================================
// Middleware
// ============================================================================

// Rate limiting middleware
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: 'rate_limit_exceeded',
            message: 'Too many requests. Please try again later.'
        });
    }

    next();
});

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function (data) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        originalSend.call(this, data);
    };

    next();
});

// ============================================================================
// OAuth 2.1 Endpoints
// ============================================================================

// OAuth Authorization Server Metadata (RFC 8414)
app.get('/.well-known/oauth-authorization-server', (req, res) => {
    console.log('📋 OAuth metadata discovery request');

    res.json({
        issuer: `http://localhost:${OAUTH_PORT}`,
        authorization_endpoint: `http://localhost:${OAUTH_PORT}/oauth/authorize`,
        token_endpoint: `http://localhost:${OAUTH_PORT}/oauth/token`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
        scopes_supported: ['read', 'write', 'admin']
    });
});

// Authorization endpoint
app.get('/oauth/authorize', (req, res) => {
    const {
        client_id,
        redirect_uri,
        response_type,
        state,
        code_challenge,
        code_challenge_method,
        scope
    } = req.query;

    console.log('🔐 Authorization request:', {
        client_id,
        redirect_uri,
        response_type,
        code_challenge: code_challenge ? 'present' : 'missing',
        code_challenge_method,
        scope
    });

    // Validate parameters
    if (!client_id) {
        return res.status(400).send('Missing client_id');
    }

    if (!redirect_uri) {
        return res.status(400).send('Missing redirect_uri');
    }

    if (response_type !== 'code') {
        return res.status(400).send('Invalid response_type. Only "code" is supported.');
    }

    // Check PKCE (required in OAuth 2.1)
    if (!code_challenge || code_challenge_method !== 'S256') {
        return res.status(400).send('PKCE is required. Missing code_challenge or invalid code_challenge_method.');
    }

    // Check if client exists
    const client = storage.clients.get(client_id);
    if (!client) {
        // For testing, allow dynamic registration
        console.log(`⚠️  Unknown client ${client_id}, allowing for testing`);
    } else {
        // Validate redirect URI
        if (!client.redirectUris.includes(redirect_uri)) {
            return res.status(400).send('Invalid redirect_uri');
        }
    }

    // Generate authorization code
    const authCode = generateAuthCode();
    const userId = 'test-user-' + Date.now();

    storage.authCodes.set(authCode, {
        clientId: client_id,
        codeChallenge: code_challenge,
        redirectUri: redirect_uri,
        userId,
        scope: scope || 'read write',
        expiresAt: Date.now() + 600000 // 10 minutes
    });

    console.log('✅ Authorization granted, code:', authCode.substring(0, 10) + '...');

    // Auto-approve for testing (normally would show consent screen)
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) {
        redirectUrl.searchParams.set('state', state);
    }

    res.redirect(redirectUrl.toString());
});

// Token endpoint
app.post('/oauth/token', (req, res) => {
    const {
        grant_type,
        code,
        redirect_uri,
        code_verifier,
        refresh_token,
        client_id,
        client_secret
    } = req.body;

    console.log('🎫 Token request:', {
        grant_type,
        code: code ? code.substring(0, 10) + '...' : undefined,
        refresh_token: refresh_token ? refresh_token.substring(0, 10) + '...' : undefined,
        client_id,
        has_client_secret: !!client_secret,
        has_code_verifier: !!code_verifier
    });

    // Check for client credentials in Authorization header (Basic Auth)
    let effectiveClientId = client_id;
    let effectiveClientSecret = client_secret;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
        const [id, secret] = credentials.split(':');
        effectiveClientId = id;
        effectiveClientSecret = secret;
        console.log('🔑 Client credentials from Basic Auth');
    }

    if (grant_type === 'authorization_code') {
        // Authorization code grant
        if (!code || !redirect_uri || !code_verifier) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing required parameters'
            });
        }

        const authData = storage.authCodes.get(code);
        if (!authData) {
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Invalid or expired authorization code'
            });
        }

        // Check expiration
        if (Date.now() > authData.expiresAt) {
            storage.authCodes.delete(code);
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Authorization code expired'
            });
        }

        // Validate client
        if (authData.clientId !== effectiveClientId) {
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Client mismatch'
            });
        }

        // Validate redirect URI
        if (authData.redirectUri !== redirect_uri) {
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Redirect URI mismatch'
            });
        }

        // Validate PKCE
        if (!validatePKCE(code_verifier, authData.codeChallenge)) {
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Invalid PKCE code_verifier'
            });
        }

        // Validate client secret if provided
        const client = storage.clients.get(effectiveClientId);
        if (client && client.clientSecret && client.clientSecret !== effectiveClientSecret) {
            return res.status(401).json({
                error: 'invalid_client',
                error_description: 'Invalid client credentials'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken();
        const newRefreshToken = generateRefreshToken();

        storage.accessTokens.set(accessToken, {
            clientId: effectiveClientId,
            userId: authData.userId,
            scope: authData.scope,
            expiresAt: Date.now() + 3600000 // 1 hour
        });

        storage.refreshTokens.set(newRefreshToken, {
            clientId: effectiveClientId,
            userId: authData.userId,
            scope: authData.scope
        });

        // Consume the authorization code
        storage.authCodes.delete(code);

        console.log('✅ Access token issued:', accessToken.substring(0, 10) + '...');

        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: newRefreshToken,
            scope: authData.scope
        });

    } else if (grant_type === 'refresh_token') {
        // Refresh token grant
        if (!refresh_token) {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing refresh_token'
            });
        }

        const refreshData = storage.refreshTokens.get(refresh_token);
        if (!refreshData) {
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Invalid refresh token'
            });
        }

        // Validate client
        if (refreshData.clientId !== effectiveClientId) {
            return res.status(400).json({
                error: 'invalid_grant',
                error_description: 'Client mismatch'
            });
        }

        // Generate new access token
        const accessToken = generateAccessToken();

        storage.accessTokens.set(accessToken, {
            clientId: effectiveClientId,
            userId: refreshData.userId,
            scope: refreshData.scope,
            expiresAt: Date.now() + 3600000
        });

        console.log('✅ Access token refreshed:', accessToken.substring(0, 10) + '...');

        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: refreshData.scope
        });

    } else {
        res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Only authorization_code and refresh_token grants are supported'
        });
    }
});

// ============================================================================
// Authentication Middleware for MCP Endpoints
// ============================================================================

function authenticateMCP(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            jsonrpc: '2.0',
            error: {
                code: -32001,
                message: 'Authentication required'
            },
            id: null
        });
    }

    // Check OAuth token
    if (authHeader.startsWith('Bearer ')) {
        const token = extractBearerToken(authHeader);
        const tokenData = storage.accessTokens.get(token);

        if (!tokenData) {
            return res.status(401).json({
                jsonrpc: '2.0',
                error: {
                    code: -32001,
                    message: 'Invalid or expired access token'
                },
                id: null
            });
        }

        // Check expiration
        if (Date.now() > tokenData.expiresAt) {
            storage.accessTokens.delete(token);
            return res.status(401).json({
                jsonrpc: '2.0',
                error: {
                    code: -32001,
                    message: 'Access token expired'
                },
                id: null
            });
        }

        req.auth = {
            type: 'oauth',
            userId: tokenData.userId,
            clientId: tokenData.clientId,
            scope: tokenData.scope
        };

        return next();
    }

    // Check API key
    const apiKey = authHeader.replace(/^Bearer /, '');
    if (storage.apiKeys.has(apiKey)) {
        req.auth = {
            type: 'apikey',
            key: apiKey,
            keyData: storage.apiKeys.get(apiKey)
        };
        return next();
    }

    res.status(401).json({
        jsonrpc: '2.0',
        error: {
            code: -32001,
            message: 'Invalid authentication credentials'
        },
        id: null
    });
}

// ============================================================================
// MCP Protocol Endpoints
// ============================================================================

// Initialize
app.post('/mcp/initialize', authenticateMCP, (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    console.log('🔌 MCP Initialize:', params);

    if (method !== 'initialize') {
        return res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32601,
                message: 'Method not found'
            },
            id
        });
    }

    const sessionId = generateSessionId();
    storage.sessions.set(sessionId, {
        initialized: true,
        capabilities: params.capabilities || {},
        clientInfo: params.clientInfo
    });

    res.json({
        jsonrpc: '2.0',
        result: {
            protocolVersion: '2025-11-25',
            capabilities: {
                tools: {},
                resources: {},
                prompts: {}
            },
            serverInfo: {
                name: 'Test MCP Server',
                version: '1.0.0'
            }
        },
        id
    });
});

// List tools
app.post('/mcp/tools/list', authenticateMCP, (req, res) => {
    const { jsonrpc, id } = req.body;

    console.log('🛠️  MCP Tools List');

    res.json({
        jsonrpc: '2.0',
        result: {
            tools: MCP_TOOLS
        },
        id
    });
});

// Call tool
app.post('/mcp/tools/call', authenticateMCP, async (req, res) => {
    const { jsonrpc, params, id } = req.body;
    const { name, arguments: args } = params;

    console.log('⚡ MCP Tool Call:', name, args);

    // Find tool
    const tool = MCP_TOOLS.find(t => t.name === name);
    if (!tool) {
        return res.status(404).json({
            jsonrpc: '2.0',
            error: {
                code: -32602,
                message: `Tool not found: ${name}`
            },
            id
        });
    }

    try {
        let result;

        switch (name) {
            case 'echo':
                result = { message: args.message };
                break;

            case 'add':
                result = { sum: args.a + args.b };
                break;

            case 'get_weather':
                result = {
                    location: args.location,
                    temperature: 72,
                    units: args.units || 'fahrenheit',
                    condition: 'sunny',
                    humidity: 45,
                    wind: '5 mph'
                };
                break;

            case 'complex_tool':
                result = {
                    processed: true,
                    config: args.config,
                    timestamp: Date.now()
                };
                break;

            case 'long_running_task':
                const duration = (args.duration || 2) * 1000;
                await new Promise(resolve => setTimeout(resolve, duration));
                result = {
                    completed: true,
                    duration: args.duration || 2,
                    timestamp: Date.now()
                };
                break;

            case 'error_generator':
                switch (args.errorType) {
                    case 'validation':
                        return res.status(400).json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32602,
                                message: 'Validation error: Invalid parameters'
                            },
                            id
                        });
                    case 'runtime':
                        throw new Error('Runtime error occurred');
                    case 'timeout':
                        await new Promise(resolve => setTimeout(resolve, 30000));
                        break;
                    case 'auth':
                        return res.status(401).json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32001,
                                message: 'Authentication error'
                            },
                            id
                        });
                }
                break;

            default:
                result = { success: true };
        }

        res.json({
            jsonrpc: '2.0',
            result: {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            },
            id
        });

    } catch (error) {
        console.error('❌ Tool execution error:', error);
        res.status(500).json({
            jsonrpc: '2.0',
            error: {
                code: -32603,
                message: error.message
            },
            id
        });
    }
});

// ============================================================================
// Unified MCP Endpoint (StreamableHTTP)
// ============================================================================

app.post('/mcp', authenticateMCP, async (req, res) => {
    const { method } = req.body;

    // Route to appropriate handler based on method
    switch (method) {
        case 'initialize':
            return app._router.handle({ ...req, url: '/mcp/initialize' }, res, () => { });

        case 'tools/list':
            return app._router.handle({ ...req, url: '/mcp/tools/list' }, res, () => { });

        case 'tools/call':
            return app._router.handle({ ...req, url: '/mcp/tools/call' }, res, () => { });

        default:
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32601,
                    message: `Method not found: ${method}`
                },
                id: req.body.id
            });
    }
});

// ============================================================================
// Health & Status Endpoints
// ============================================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'Test MCP Server',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

app.get('/stats', (req, res) => {
    res.json({
        authCodes: storage.authCodes.size,
        accessTokens: storage.accessTokens.size,
        refreshTokens: storage.refreshTokens.size,
        sessions: storage.sessions.size,
        clients: storage.clients.size,
        apiKeys: storage.apiKeys.size
    });
});

// ============================================================================
// Start Servers
// ============================================================================

// Start OAuth server
const oauthApp = express();
oauthApp.use(cors());
oauthApp.use(express.json());
oauthApp.use(express.urlencoded({ extended: true }));

// Copy OAuth endpoints to separate app
oauthApp.get('/.well-known/oauth-authorization-server', app._router.stack.find(r => r.route?.path === '/.well-known/oauth-authorization-server')?.route.stack[0].handle);
oauthApp.get('/oauth/authorize', (req, res, next) => {
    app._router.handle(req, res, next);
});
oauthApp.post('/oauth/token', (req, res, next) => {
    app._router.handle(req, res, next);
});

oauthApp.listen(OAUTH_PORT, () => {
    console.log(`\n🔐 OAuth Server running on http://localhost:${OAUTH_PORT}`);
    console.log(`   Discovery: http://localhost:${OAUTH_PORT}/.well-known/oauth-authorization-server`);
});

// Start MCP server
app.listen(PORT, () => {
    console.log(`\n🦉 Test MCP Server running on http://localhost:${PORT}`);
    console.log(`   MCP Endpoint: http://localhost:${PORT}/mcp`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Stats: http://localhost:${PORT}/stats`);
    console.log(`\n📝 Pre-configured test credentials:`);
    console.log(`   OAuth Client (Public): test-client-public`);
    console.log(`   OAuth Client (Confidential): test-client-confidential / test-secret-123`);
    console.log(`   API Key: test-api-key-valid`);
    console.log(`\n✅ Server ready for testing!`);
});



