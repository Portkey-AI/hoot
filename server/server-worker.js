/**
 * Hoot MCP Backend Server - Cloudflare Workers Entry Point
 * 
 * Cloudflare deployment using Workers + Durable Objects
 */

// Database adapter
import { DurableObjectsAdapter } from './adapters/durable-objects.js';

// Connection pool
import { WorkersConnectionPool } from './adapters/connection-pool-workers.js';

// Durable Object classes
import { UserDataDO } from './durable-objects/user-data-do.js';
import { FaviconCacheDO } from './durable-objects/favicon-cache-do.js';
import { MCPConnectionPoolDO } from './durable-objects/mcp-connection-pool-do.js';

// Utilities
import { JWTManager } from './lib/jwt.js';
import { AuditLogger, RateLimiter } from './lib/utils.js';
import { MCPClientManager } from './lib/client-manager.js';
import { getToolFilterManager } from './lib/tool-filter.js';

// Route handlers
import {
  autoDetectServer,
  connectToServer,
  listTools,
  executeTool,
  fetchFavicon
} from './lib/handlers.js';

// Initialize JWT manager (will be populated per request with env vars)
const jwtManager = new JWTManager();

// Initialize rate limiter (global for Workers)
const rateLimiter = new RateLimiter();

// NOTE: In Cloudflare Workers, we cannot maintain persistent connections across requests
// due to the "Cannot perform I/O on behalf of a different request" limitation.
// Each request must create its own client manager.
// Initialize MCP client manager (will be recreated per-request in the fetch handler)

/**
 * Performance timing helper
 */
class PerformanceTimer {
  constructor() {
    this.timings = {};
    this.startTimes = {};
  }

  start(label) {
    this.startTimes[label] = Date.now();
  }

  end(label) {
    if (this.startTimes[label]) {
      this.timings[label] = Date.now() - this.startTimes[label];
      delete this.startTimes[label];
    }
  }

  getServerTimingHeader() {
    // Format: label;dur=ms, label2;dur=ms
    return Object.entries(this.timings)
      .map(([label, duration]) => `${label};dur=${duration}`)
      .join(', ');
  }

  log() {
    console.log('⏱️ Performance Timings:', this.timings);
  }
}

/**
 * Ensure a server is connected, auto-reconnecting if needed
 */
async function ensureConnected(options) {
  const { serverId, userId, db, connectionPool, frontendUrl, timer } = options;

  // Check if already connected
  timer.start('conn-check');
  const isConnected = connectionPool.hasAsync
    ? await connectionPool.hasAsync(serverId)
    : connectionPool.has(serverId);
  timer.end('conn-check');

  if (isConnected) {
    return { reconnected: false };
  }

  // Try to get server config and auto-reconnect
  timer.start('reconnect');
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
  timer.end('reconnect');

  return { reconnected: true };
}

/**
 * CORS headers for responses
 */
function corsHeaders(origin, env) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8009',
  ];

  // Add FRONTEND_URL from environment variables (production/staging)
  if (env && env.FRONTEND_URL) {
    allowedOrigins.push(env.FRONTEND_URL);
  }

  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-hoot-token',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  return {};
}

/**
 * JSON response helper
 */
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Authenticate request and extract userId
 */
async function authenticateRequest(request, auditLogger) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow health check and token endpoint without auth
  if (pathname === '/health' || pathname === '/auth/token') {
    return { success: true };
  }

  const token = request.headers.get('x-hoot-token');
  if (!token) {
    await auditLogger.log('auth_failed', {
      path: pathname,
      origin: request.headers.get('origin'),
      reason: 'missing_token'
    });
    return {
      success: false,
      response: jsonResponse({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authentication token'
      }, 401)
    };
  }

  try {
    // Try JWT validation
    if (jwtManager.isInitialized()) {
      const payload = await jwtManager.verifyToken(token);

      if (payload) {
        // Extract user ID from JWT
        const userId = payload.sub;

        // Validate userId
        if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
          throw new Error('Invalid or missing user ID in token');
        }

        return {
          success: true,
          userId,
          portkeyContext: {
            orgId: payload.portkey_oid,
            workspace: payload.portkey_workspace,
            scope: payload.scope || [],
          }
        };
      }
    }

    // Token validation failed
    await auditLogger.log('auth_failed', {
      path: pathname,
      reason: 'invalid_token'
    });

    return {
      success: false,
      response: jsonResponse({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid authentication token'
      }, 401)
    };
  } catch (error) {
    console.error('Authentication error:', error);
    await auditLogger.log('auth_error', {
      path: pathname,
      error: error.message
    });

    return {
      success: false,
      response: jsonResponse({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication failed'
      }, 401)
    };
  }
}

/**
 * Route request to appropriate handler
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  const origin = request.headers.get('origin');

  // Initialize performance timer
  const timer = new PerformanceTimer();
  timer.start('total');

  // Initialize dependencies
  const db = new DurableObjectsAdapter(env);
  const auditLogger = new AuditLogger({ isNode: false });

  // Initialize JWT manager if not already done
  if (!jwtManager.isInitialized() && env.JWT_PRIVATE_KEY && env.JWT_JWKS) {
    try {
      const privateKeyJwk = JSON.parse(env.JWT_PRIVATE_KEY);
      const jwks = JSON.parse(env.JWT_JWKS);
      await jwtManager.initialize({ privateKeyJwk, jwks });
    } catch (err) {
      console.warn('JWT initialization failed:', err.message);
    }
  }

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin, env)
    });
  }

  // Add CORS headers to all responses
  const headers = corsHeaders(origin, env);

  // Authenticate request
  const auth = await authenticateRequest(request, auditLogger);
  if (!auth.success) {
    return auth.response;
  }

  const userId = auth.userId || 'default-user';

  // IMPORTANT: Create ConnectionPool AFTER getting userId
  // Each user gets their own DO to manage all their MCP connections
  const connectionPool = new WorkersConnectionPool(env, userId);

  // Keep old clientManager for backward compatibility during transition
  const clientManager = new MCPClientManager();

  try {
    // Health check
    if (pathname === '/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        message: 'MCP Backend Server is running (Cloudflare Workers)',
        activeConnections: clientManager.size(),
      }, 200, headers);
    }

    // Get authentication token
    if (pathname === '/auth/token' && method === 'POST') {
      const body = await request.json();
      const { userId: requestedUserId } = body;

      // Validate userId format (UUID v4)
      if (!requestedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedUserId)) {
        await auditLogger.log('invalid_user_id', { userId: requestedUserId, origin });
        return jsonResponse({
          success: false,
          error: 'Invalid user ID format. Must be a valid UUID v4.'
        }, 400, headers);
      }

      if (jwtManager.isInitialized()) {
        const token = await jwtManager.generateToken(requestedUserId, {
          portkeyOrgId: env.PORTKEY_ORG_ID || 'test-org-id',
          portkeyWorkspace: env.PORTKEY_WORKSPACE_SLUG || 'test-workspace',
          expiresIn: 3600
        });

        await auditLogger.log('jwt_token_issued', { origin, userId: requestedUserId });

        return jsonResponse({
          success: true,
          token,
          tokenType: 'jwt'
        }, 200, headers);
      }

      return jsonResponse({
        success: false,
        error: 'JWT not configured'
      }, 500, headers);
    }

    // Auto-detect server configuration
    if (pathname === '/mcp/auto-detect' && method === 'POST') {
      const body = await request.json();
      const { url: serverUrl } = body;

      if (!serverUrl) {
        return jsonResponse({
          success: false,
          error: 'URL is required'
        }, 400, headers);
      }

      const result = await autoDetectServer({ url: serverUrl });
      return jsonResponse(result, 200, headers);
    }

    // Connect to MCP server
    if (pathname === '/mcp/connect' && method === 'POST') {
      const body = await request.json();
      const { serverId, serverName, url: serverUrl, transport, auth: serverAuth, authorizationCode } = body;

      await auditLogger.log('mcp_connect_attempt', {
        serverId,
        serverName,
        url: serverUrl,
        transport,
        authType: serverAuth?.type
      });

      try {
        const result = await connectToServer({
          serverId,
          serverName,
          url: serverUrl,
          transport,
          auth: serverAuth,
          authorizationCode,
          userId,
          db,
          frontendUrl: env.FRONTEND_URL || 'https://hoot.yourdomain.com',
          clientManager
        });

        // Save server config for auto-reconnection
        await db.saveServerConfig(userId, serverId, {
          serverName,
          url: serverUrl,
          transport,
          auth: serverAuth
        });

        await auditLogger.log('mcp_connect_success', {
          serverId,
          serverName
        });

        return jsonResponse(result, 200, headers);
      } catch (error) {
        const isUnauthorizedError = error.name === 'UnauthorizedError' ||
          (error.message && error.message.includes('401'));

        if (isUnauthorizedError) {
          return jsonResponse({
            success: false,
            error: 'UnauthorizedError',
            message: 'OAuth authorization required',
            needsAuth: true,
            authorizationUrl: error.authorizationUrl || null,
          }, 401, headers);
        }

        return jsonResponse({
          success: false,
          error: error.message || 'Connection failed',
          needsAuth: false,
        }, 500, headers);
      }
    }

    // Disconnect from MCP server
    if (pathname === '/mcp/disconnect' && method === 'POST') {
      const body = await request.json();
      const { serverId } = body;

      await clientManager.disconnect(serverId);
      await db.deleteVerifier(userId, serverId);

      return jsonResponse({
        success: true,
        serverId,
      }, 200, headers);
    }

    // Clear OAuth tokens
    if (pathname === '/mcp/clear-oauth-tokens' && method === 'POST') {
      const body = await request.json();
      const { serverId } = body;

      if (!serverId) {
        return jsonResponse({
          success: false,
          error: 'serverId is required',
        }, 400, headers);
      }

      await db.clearOAuthCredentials(userId, serverId, 'all');

      return jsonResponse({
        success: true,
        serverId,
      }, 200, headers);
    }

    // Get server info
    if (pathname.startsWith('/mcp/server-info/') && method === 'GET') {
      const serverId = pathname.split('/').pop();
      const client = clientManager.getClient(serverId);

      if (!client) {
        return jsonResponse({
          success: false,
          error: 'Server not connected'
        }, 404, headers);
      }

      const serverVersion = client.getServerVersion();

      return jsonResponse({
        success: true,
        serverInfo: serverVersion ? {
          name: serverVersion.name,
          version: serverVersion.version
        } : null
      }, 200, headers);
    }

    // Get OAuth metadata
    if (pathname.startsWith('/mcp/oauth-metadata/') && method === 'GET') {
      const serverId = pathname.split('/').pop();
      const transport = clientManager.getTransport(serverId);

      if (!transport) {
        return jsonResponse({
          success: false,
          error: 'Server not connected'
        }, 404, headers);
      }

      const metadata = transport.authServerMetadata || null;

      return jsonResponse({
        success: true,
        metadata: metadata
      }, 200, headers);
    }

    // Get favicon
    if (pathname === '/mcp/favicon' && method === 'POST') {
      const body = await request.json();
      const { serverUrl, oauthLogoUri } = body;

      if (!serverUrl) {
        return jsonResponse({
          success: false,
          error: 'Server URL is required'
        }, 400, headers);
      }

      const result = await fetchFavicon({ serverUrl, oauthLogoUri, db });

      return jsonResponse(result, 200, {
        ...headers,
        'Cache-Control': 'public, max-age=86400'
      });
    }

    // Proxy favicon (simple fetch proxy)
    if (pathname === '/mcp/favicon-proxy' && method === 'GET') {
      const faviconUrl = url.searchParams.get('url');

      if (!faviconUrl) {
        return new Response('URL parameter is required', { status: 400 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(faviconUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Hoot-MCP-Client/1.0'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return new Response('Favicon not found', { status: 404 });
      }

      return new Response(response.body, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'image/x-icon',
          'Cache-Control': 'public, max-age=86400',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          ...headers
        }
      });
    }

    // List tools
    if (pathname.startsWith('/mcp/tools/') && method === 'GET') {
      const serverId = pathname.split('/').pop();

      // Auto-reconnect if needed
      try {
        await ensureConnected({
          serverId,
          userId,
          db,
          connectionPool,
          frontendUrl: env.FRONTEND_URL || 'https://hoot.yourdomain.com',
          timer
        });
      } catch (reconnectError) {
        timer.end('total');
        return jsonResponse({
          success: false,
          error: 'Server not connected',
          message: reconnectError.message
        }, 500, {
          ...headers,
          'Server-Timing': timer.getServerTimingHeader()
        });
      }

      timer.start('list-tools');
      const result = await listTools({ serverId, connectionPool });
      timer.end('list-tools');

      timer.end('total');

      return jsonResponse(result, 200, {
        ...headers,
        'Server-Timing': timer.getServerTimingHeader()
      });
    }

    // Execute tool
    if (pathname === '/mcp/execute' && method === 'POST') {
      const body = await request.json();
      const { serverId, toolName, arguments: args } = body;

      // Rate limiting
      const rateLimit = rateLimiter.check(serverId);
      if (!rateLimit.allowed) {
        await auditLogger.log('rate_limit_exceeded', {
          serverId,
          toolName,
          resetIn: rateLimit.resetIn
        });
        return jsonResponse({
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`
        }, 429, headers);
      }

      // Auto-reconnect if needed
      try {
        await ensureConnected({
          serverId,
          userId,
          db,
          connectionPool,
          frontendUrl: env.FRONTEND_URL || 'https://hoot.yourdomain.com',
          timer
        });
      } catch (reconnectError) {
        timer.end('total');
        return jsonResponse({
          success: false,
          error: 'Server not connected',
          message: reconnectError.message
        }, 500, {
          ...headers,
          'Server-Timing': timer.getServerTimingHeader()
        });
      }

      await auditLogger.log('tool_execution', {
        serverId,
        toolName,
        argsPreview: JSON.stringify(args).substring(0, 200)
      });

      timer.start('mcp-execute');
      const result = await executeTool({
        serverId,
        toolName,
        arguments: args,
        connectionPool
      });
      timer.end('mcp-execute');

      timer.end('total');

      return jsonResponse(result, 200, {
        ...headers,
        'Server-Timing': timer.getServerTimingHeader()
      });
    }

    // Get connection status
    if (pathname.startsWith('/mcp/status/') && method === 'GET') {
      const serverId = pathname.split('/').pop();
      const isConnected = clientManager.has(serverId);

      return jsonResponse({
        success: true,
        serverId,
        connected: isConnected,
      }, 200, headers);
    }

    // List connections
    if (pathname === '/mcp/connections' && method === 'GET') {
      const connections = clientManager.getConnections();

      return jsonResponse({
        success: true,
        connections,
        count: connections.length,
      }, 200, headers);
    }

    // Tool filter: Initialize
    if (pathname === '/mcp/tool-filter/initialize' && method === 'POST') {
      const body = await request.json();
      const { servers: serversWithTools } = body;

      if (!serversWithTools || !Array.isArray(serversWithTools)) {
        return jsonResponse({
          error: 'Invalid request: servers array required'
        }, 400, headers);
      }

      // Get tool filter manager with Workers AI support
      const toolFilterManager = getToolFilterManager(env);
      const result = await toolFilterManager.initialize(serversWithTools);

      if (result.success) {
        return jsonResponse({
          success: true,
          message: 'Tool filter initialized successfully'
        }, 200, headers);
      } else {
        return jsonResponse({
          success: false,
          error: result.error
        }, 500, headers);
      }
    }

    // Tool filter: Filter
    if (pathname === '/mcp/tool-filter/filter' && method === 'POST') {
      const body = await request.json();
      const { messages, options = {} } = body;

      if (!messages || !Array.isArray(messages)) {
        return jsonResponse({
          error: 'Invalid request: messages array required'
        }, 400, headers);
      }

      // Get tool filter manager with Workers AI support
      const toolFilterManager = getToolFilterManager(env);
      const result = await toolFilterManager.filterTools(messages, options);

      if (result.success) {
        return jsonResponse({
          success: true,
          tools: result.tools,
          metrics: result.metrics
        }, 200, headers);
      } else {
        return jsonResponse({
          success: false,
          error: result.error
        }, 500, headers);
      }
    }

    // Tool filter: Stats
    if (pathname === '/mcp/tool-filter/stats' && method === 'GET') {
      const toolFilterManager = getToolFilterManager(env);
      const stats = toolFilterManager.getStats();
      return jsonResponse({ success: true, stats }, 200, headers);
    }

    // Tool filter: Clear cache
    if (pathname === '/mcp/tool-filter/clear-cache' && method === 'POST') {
      const toolFilterManager = getToolFilterManager(env);
      toolFilterManager.clearCache();
      return jsonResponse({ success: true, message: 'Cache cleared' }, 200, headers);
    }

    // 404 Not Found
    return jsonResponse({
      success: false,
      error: 'Not Found',
      message: `Route ${method} ${pathname} not found`,
    }, 404, headers);

  } catch (error) {
    console.error('[Worker Error]', error);
    return jsonResponse({
      success: false,
      error: 'Server Error',
      message: error.message,
    }, 500, headers);
  }
}

/**
 * Main Worker entry point
 */
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};

// Export Durable Object classes
export { UserDataDO, FaviconCacheDO, MCPConnectionPoolDO };

