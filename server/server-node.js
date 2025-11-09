/**
 * Hoot MCP Backend Server - Node.js Entry Point
 * 
 * Self-hosted deployment using Express + SQLite
 */

import express from 'express';
import cors from 'cors';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import { randomBytes, createHmac } from 'crypto';

// Logger
import { logger } from './lib/logger.js';

// Database adapter
import { SQLiteAdapter } from './adapters/sqlite.js';

// Connection pool
import { NodeConnectionPool } from './adapters/connection-pool-node.js';

// Utilities
import { JWTManager } from './lib/jwt.js';
import { AuditLogger, RateLimiter } from './lib/utils.js';
import { toolFilterManager } from './lib/tool-filter.js';

// Route handlers
import {
  autoDetectServer,
  connectToServer,
  listTools,
  executeTool,
  fetchFavicon
} from './lib/handlers.js';

const app = express();
const PORT = process.env.PORT || 8008;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8009';

// Generate session token for authentication (fallback for non-JWT mode)
const SESSION_TOKEN = process.env.HOOT_SESSION_TOKEN || randomBytes(32).toString('hex');

// Initialize JWT manager
const jwtManager = new JWTManager();

// Initialize SQLite database
const hootDir = join(homedir(), '.hoot');
if (!existsSync(hootDir)) {
  mkdirSync(hootDir, { recursive: true });
}

const dbPath = join(hootDir, 'hoot-mcp.db');
const auditLogPath = join(hootDir, 'audit.log');

logger.info(`📁 Database location: ${dbPath}`);
logger.info(`📝 Audit log: ${auditLogPath}`);

const db = new SQLiteAdapter(dbPath);
logger.success('SQLite database initialized');

// Initialize audit logger and rate limiter
const auditLogger = new AuditLogger({ logPath: auditLogPath, isNode: true });
const rateLimiter = new RateLimiter();

// Initialize connection pool (shared across all requests in Node.js)
const connectionPool = new NodeConnectionPool();

/**
 * Ensure a server is connected, auto-reconnecting if needed
 */
async function ensureConnected(options) {
  const { serverId, userId, db, connectionPool, frontendUrl } = options;

  // Check if already connected
  const isConnected = connectionPool.has(serverId);

  if (isConnected) {
    return { reconnected: false };
  }

  // Try to get server config and auto-reconnect
  const config = await db.getServerConfig(userId, serverId);

  if (!config) {
    throw new Error('Server not connected and no config found for auto-reconnection');
  }

  // Reconnect using saved config
  await connectionPool.connect(serverId, config, {
    userId,
    db,
    frontendUrl
  });

  return { reconnected: true };
}

// Load JWT keys at startup
(async () => {
  try {
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || join(process.cwd(), 'private-key.json');
    const jwksPath = join(process.cwd(), 'jwks.json');

    const privateKeyJwk = JSON.parse(readFileSync(privateKeyPath, 'utf8'));
    const jwks = JSON.parse(readFileSync(jwksPath, 'utf8'));

    const result = await jwtManager.initialize({ privateKeyJwk, jwks });

    if (result.success) {
      logger.success('JWT keys loaded successfully');
      logger.info(`   - Key ID: ${result.kid}`);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    logger.warn('JWT keys not found - using fallback session token');
    logger.warn('To enable JWT: ensure jwks.json and private-key.json exist in project root');
  }
})();

// Enable CORS for browser app
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8009',
  ...(FRONTEND_URL !== 'http://localhost:8009' ? [FRONTEND_URL] : [])
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Increase payload limit for tool filter initialization
app.use(express.json({ limit: '10mb' }));

// Security: Authentication middleware
async function authenticateRequest(req, res, next) {
  // Allow health check and token endpoint without auth
  if (req.path === '/health' || req.path === '/auth/token') {
    return next();
  }

  const token = req.headers['x-hoot-token'];
  if (!token) {
    await auditLogger.log('auth_failed', {
      path: req.path,
      ip: req.ip,
      origin: req.headers.origin,
      reason: 'missing_token'
    });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid authentication token'
    });
  }

  try {
    // Try JWT validation first (if JWT keys are loaded)
    if (jwtManager.isInitialized()) {
      try {
        const result = await jwtManager.verifyToken(token);

        if (result.valid && result.payload) {
          // Extract user ID from JWT
          req.userId = result.payload.sub;

          // Validate userId is present and in UUID format
          if (!req.userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.userId)) {
            throw new Error('Invalid or missing user ID in token');
          }

          // Store Portkey context if present
          req.portkeyContext = {
            orgId: result.payload.portkey_oid,
            workspace: result.payload.portkey_workspace,
            scope: result.payload.scope || [],
          };

          return next();
        }

        // JWT validation failed - check if expired
        if (result.expired) {
          await auditLogger.log('auth_failed', {
            path: req.path,
            reason: 'token_expired'
          });
          return res.status(401).json({
            success: false,
            error: 'TokenExpired',
            message: 'Token has expired',
            expired: true
          });
        }

        // Not a valid JWT - try fallback
        logger.debug('JWT validation failed, trying fallback session token');
      } catch (jwtError) {
        // Unexpected error during JWT processing
        logger.debug('JWT validation error:', jwtError.message);
      }
    }

    // Fallback: check if it's a signed session token (format: userId.signature)
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 2) {
        const [tokenUserId, signature] = parts;

        // Verify signature
        const expectedSignature = createHmac('sha256', SESSION_TOKEN)
          .update(tokenUserId)
          .digest('hex');

        // Validate signature and userId format (UUID v4)
        if (signature === expectedSignature && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tokenUserId)) {
          req.userId = tokenUserId;
          logger.debug(`Session token authenticated for user: ${tokenUserId}`);
          return next();
        }
      }
    }

    // Token is neither valid JWT nor session token
    await auditLogger.log('auth_failed', {
      path: req.path,
      ip: req.ip,
      origin: req.headers.origin,
      reason: 'invalid_token'
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    await auditLogger.log('auth_error', {
      path: req.path,
      error: error.message
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
}

// Apply authentication to all routes
app.use(authenticateRequest);

/**
 * Get authentication token
 * POST /auth/token
 */
app.post('/auth/token', async (req, res) => {
  const origin = req.headers.origin;

  if (!origin || !allowedOrigins.includes(origin)) {
    await auditLogger.log('token_request_denied', {
      origin,
      ip: req.ip
    });
    return res.status(403).json({
      success: false,
      error: 'Forbidden'
    });
  }

  const { userId } = req.body;

  // Validate userId format (UUID v4)
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    await auditLogger.log('invalid_user_id', { userId, origin });
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID format. Must be a valid UUID v4.'
    });
  }

  try {
    // If JWT keys are loaded, generate a JWT
    if (jwtManager.isInitialized()) {
      const token = await jwtManager.generateToken(userId, {
        portkeyOrgId: process.env.PORTKEY_ORG_ID || 'test-org-id',
        portkeyWorkspace: process.env.PORTKEY_WORKSPACE_SLUG || 'test-workspace',
        expiresIn: 3600 // 1 hour
      });

      await auditLogger.log('jwt_token_issued', { origin, userId });

      return res.json({
        success: true,
        token,
        tokenType: 'jwt'
      });
    } else {
      // Fallback to signed session token with userId embedded
      // Format: userId.signature (HMAC-SHA256)
      const signature = createHmac('sha256', SESSION_TOKEN)
        .update(userId)
        .digest('hex');
      const token = `${userId}.${signature}`;

      await auditLogger.log('session_token_issued', { origin, userId });

      return res.json({
        success: true,
        token,
        tokenType: 'session'
      });
    }
  } catch (error) {
    logger.error('Token generation error:', error);
    await auditLogger.log('token_generation_error', {
      error: error.message
    });

    // Fallback to signed session token on error
    const signature = createHmac('sha256', SESSION_TOKEN)
      .update(userId)
      .digest('hex');
    const token = `${userId}.${signature}`;

    return res.json({
      success: true,
      token,
      tokenType: 'session'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  logger.verbose('Health check requested');
  res.json({
    status: 'ok',
    message: 'MCP Backend Server is running',
    port: PORT,
    activeConnections: connectionPool.size(),
  });
});

/**
 * Auto-detect server configuration
 * POST /mcp/auto-detect
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

    const result = await autoDetectServer({ url });
    res.json(result);
  } catch (error) {
    logger.error('Auto-detect error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Auto-detection failed',
    });
  }
});

/**
 * Connect to an MCP server
 * POST /mcp/connect
 */
app.post('/mcp/connect', async (req, res) => {
  try {
    const { serverId, serverName, url, transport, auth, authorizationCode } = req.body;

    await auditLogger.log('mcp_connect_attempt', {
      serverId,
      serverName,
      url,
      transport,
      authType: auth?.type
    });

    const result = await connectToServer({
      serverId,
      serverName,
      url,
      transport,
      auth,
      authorizationCode,
      userId: req.userId,
      db,
      frontendUrl: FRONTEND_URL,
      clientManager: connectionPool // Use connection pool
    });

    // Save server config for auto-reconnection
    if (result.success) {
      await db.saveServerConfig(req.userId, serverId, {
        serverName,
        url,
        transport,
        auth
      });
    }

    await auditLogger.log('mcp_connect_success', {
      serverId,
      serverName
    });

    res.json(result);
  } catch (error) {
    logger.error('Connection error:', error);

    // Check if it's an OAuth UnauthorizedError
    const isUnauthorizedError = error.name === 'UnauthorizedError' ||
      (error.message && error.message.includes('401'));

    if (isUnauthorizedError) {
      logger.info(`✅ OAuth flow initiated - returning auth URL to frontend`);
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
 */
app.post('/mcp/disconnect', async (req, res) => {
  try {
    const { serverId } = req.body;
    logger.info(`🔌 Disconnecting from server: ${serverId}`);

    await connectionPool.disconnect(serverId);

    // Delete server config
    await db.deleteServerConfig(req.userId, serverId);

    // Keep OAuth credentials for reconnection
    // Only clean up temporary verifiers
    await db.deleteVerifier(req.userId, serverId);

    res.json({
      success: true,
      serverId,
    });
  } catch (error) {
    logger.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Disconnect failed',
    });
  }
});

/**
 * Clear OAuth tokens from backend database
 * POST /mcp/clear-oauth-tokens
 */
app.post('/mcp/clear-oauth-tokens', async (req, res) => {
  try {
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required',
      });
    }

    logger.info(`🔐 Clearing OAuth tokens for server: ${serverId}`);

    await db.clearOAuthCredentials(req.userId, serverId, 'all');

    logger.success(`OAuth credentials cleared for ${serverId}`);

    res.json({
      success: true,
      serverId,
    });
  } catch (error) {
    logger.error('Clear OAuth tokens error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear OAuth tokens',
    });
  }
});

/**
 * Get server information
 * GET /mcp/server-info/:serverId
 */
app.get('/mcp/server-info/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;

    const client = await connectionPool.getClient(serverId);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Server not connected'
      });
    }

    const serverVersion = client.getServerVersion();

    if (serverVersion) {
      logger.verbose(`Retrieved server info for ${serverId}:`, {
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
    logger.error('Get server info error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get server info'
    });
  }
});

/**
 * Get OAuth metadata for a connected server
 * GET /mcp/oauth-metadata/:serverId
 */
app.get('/mcp/oauth-metadata/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;

    const transport = await connectionPool.getTransport?.(serverId);
    if (!transport) {
      return res.status(404).json({
        success: false,
        error: 'Server not connected'
      });
    }

    const metadata = transport.authServerMetadata || null;

    if (metadata) {
      logger.verbose(`Retrieved OAuth metadata for ${serverId}:`, {
        issuer: metadata.issuer,
        hasLogoUri: !!metadata.logo_uri
      });
    }

    res.json({
      success: true,
      metadata: metadata
    });
  } catch (error) {
    logger.error('Get OAuth metadata error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get OAuth metadata'
    });
  }
});

/**
 * Get favicon for a server URL
 * POST /mcp/favicon
 */
app.post('/mcp/favicon', async (req, res) => {
  try {
    const { serverUrl, oauthLogoUri } = req.body;

    if (!serverUrl) {
      return res.status(400).json({
        success: false,
        error: 'Server URL is required'
      });
    }

    const result = await fetchFavicon({ serverUrl, oauthLogoUri, db });

    res
      .set('Cache-Control', 'public, max-age=86400') // 24 hours
      .json(result);
  } catch (error) {
    logger.error('Favicon fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch favicon'
    });
  }
});

/**
 * Proxy favicon images to avoid CORS/COEP issues
 * GET /mcp/favicon-proxy
 */
app.get('/mcp/favicon-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send('URL parameter is required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/x-icon';

    res
      .set('Content-Type', contentType)
      .set('Cache-Control', 'public, max-age=86400')
      .set('Cross-Origin-Resource-Policy', 'cross-origin')
      .send(Buffer.from(buffer));
  } catch (error) {
    logger.error('Favicon proxy error:', error);
    res.status(500).send('Failed to fetch favicon');
  }
});

/**
 * List tools from a connected MCP server
 * GET /mcp/tools/:serverId
 */
app.get('/mcp/tools/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;

    // Auto-reconnect if needed
    await ensureConnected({ serverId, userId: req.userId, db, connectionPool, frontendUrl: FRONTEND_URL });

    const result = await listTools({ serverId, connectionPool });
    res.json(result);
  } catch (error) {
    logger.error('List tools error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list tools',
    });
  }
});

/**
 * Execute a tool on a connected MCP server
 * POST /mcp/execute
 */
app.post('/mcp/execute', async (req, res) => {
  try {
    const { serverId, toolName, arguments: args } = req.body;

    // Rate limiting
    const rateLimit = rateLimiter.check(serverId);
    if (!rateLimit.allowed) {
      await auditLogger.log('rate_limit_exceeded', {
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

    // Security: Log tool execution
    await auditLogger.log('tool_execution', {
      serverId,
      toolName,
      argsPreview: JSON.stringify(args).substring(0, 200)
    });

    // Auto-reconnect if needed
    await ensureConnected({ serverId, userId: req.userId, db, connectionPool, frontendUrl: FRONTEND_URL });

    const result = await executeTool({ serverId, toolName, arguments: args, connectionPool });

    await auditLogger.log('tool_execution_success', {
      serverId,
      toolName
    });

    res.json(result);
  } catch (error) {
    logger.error('Tool execution error:', error);
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
  const isConnected = connectionPool.has(serverId);

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
  const connections = connectionPool.getConnections();

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
    logger.error('Tool filter initialization error:', error);
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
    logger.error('Tool filtering error:', error);
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
    logger.error('Get filter stats error:', error);
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
    logger.error('Clear cache error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  logger.verbose(`[404] ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('[Express Error]', err);
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
  logger.info(`
🦉 Hoot MCP Backend Server (Node.js + SQLite)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Running on: http://localhost:${PORT}
✓ Health check: http://localhost:${PORT}/health
✓ Database: ${dbPath}
✓ Audit log: ${auditLogPath}

🔒 Security Features Enabled:
✓ JWT/Session token authentication
✓ Rate limiting (30 req/min per server)
✓ Audit logging
✓ CORS protection

📋 API endpoints:
  - POST /auth/token (get session token)
  - POST /mcp/connect
  - POST /mcp/disconnect
  - POST /mcp/auto-detect
  - GET  /mcp/tools/:serverId
  - POST /mcp/execute
  - GET  /mcp/status/:serverId
  - GET  /mcp/connections

This backend server acts as the MCP client,
eliminating CORS issues when connecting to
MCP servers from the browser.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  auditLogger.log('server_started', {
    port: PORT,
    pid: process.pid
  });
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`\n❌ Port ${PORT} is already in use!`);
    logger.error(`   Kill the process using: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    logger.error('\n❌ Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('\n🦉 Shutting down MCP backend server...');
  const connections = connectionPool.getConnections();
  for (const serverId of connections) {
    await connectionPool.disconnect(serverId);
  }
  db.close();
  server.close(() => {
    logger.success('MCP backend server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('\n🦉 Shutting down MCP backend server...');
  const connections = connectionPool.getConnections();
  for (const serverId of connections) {
    await connectionPool.disconnect(serverId);
  }
  db.close();
  server.close(() => {
    logger.success('MCP backend server stopped');
    process.exit(0);
  });
});

