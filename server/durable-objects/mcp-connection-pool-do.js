/**
 * MCP Connection Pool Durable Object
 * 
 * Maintains persistent MCP connections for a single user.
 * Each user gets their own DO instance to manage all their MCP server connections.
 * 
 * This solves the "Cannot perform I/O on behalf of a different request" limitation
 * in Cloudflare Workers by keeping connections alive in a stateful DO.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DurableObjectsAdapter } from '../adapters/durable-objects.js';

export class MCPConnectionPoolDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    // In-memory connection pool
    // Cannot be serialized - must be rebuilt on DO restart
    this.connections = new Map();
    // Map<serverId, {
    //   client: MCPClient,
    //   transport: Transport,
    //   connectedAt: timestamp,
    //   lastUsed: timestamp
    // }>

    // Auto-cleanup interval
    this.cleanupInterval = null;
    this.startCleanupTimer();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Connect to server
      if (pathname === '/connect' && request.method === 'POST') {
        const { serverId, config, options } = await request.json();

        // Check if already connected
        if (this.connections.has(serverId)) {
          const conn = this.connections.get(serverId);
          conn.lastUsed = Date.now();
          return new Response(JSON.stringify({
            success: true,
            serverId,
            reused: true,
            message: `Already connected to ${config.serverName}`
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Create new connection
        await this.createConnection(serverId, config, options);

        return new Response(JSON.stringify({
          success: true,
          serverId,
          message: `Connected to ${config.serverName}`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get client (for operations)
      if (pathname === '/get-client' && request.method === 'POST') {
        const { serverId } = await request.json();
        const has = this.connections.has(serverId);

        if (has) {
          const conn = this.connections.get(serverId);
          conn.lastUsed = Date.now();
        }

        return new Response(JSON.stringify({ has }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // List tools
      if (pathname === '/list-tools' && request.method === 'POST') {
        const { serverId } = await request.json();

        const conn = this.connections.get(serverId);
        if (!conn) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Server not connected'
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        conn.lastUsed = Date.now();
        const response = await conn.client.listTools();

        const tools = response.tools.map(tool => ({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema,
        }));

        return new Response(JSON.stringify({ success: true, tools }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Execute tool
      if (pathname === '/execute-tool' && request.method === 'POST') {
        const { serverId, toolName, arguments: args } = await request.json();

        const conn = this.connections.get(serverId);
        if (!conn) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Server not connected'
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        conn.lastUsed = Date.now();
        const response = await conn.client.callTool({
          name: toolName,
          arguments: args,
        });

        return new Response(JSON.stringify({
          success: true,
          result: response.content
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get transport (for OAuth metadata)
      if (pathname === '/get-transport' && request.method === 'POST') {
        const { serverId } = await request.json();

        const conn = this.connections.get(serverId);
        if (!conn) {
          return new Response(JSON.stringify({ has: false }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        conn.lastUsed = Date.now();
        const metadata = conn.transport.authServerMetadata || null;

        return new Response(JSON.stringify({
          has: true,
          metadata
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get server version
      if (pathname === '/get-server-version' && request.method === 'POST') {
        const { serverId } = await request.json();

        const conn = this.connections.get(serverId);
        if (!conn) {
          return new Response(JSON.stringify({ has: false }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        conn.lastUsed = Date.now();
        const serverVersion = conn.client.getServerVersion();

        return new Response(JSON.stringify({
          has: true,
          serverVersion
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Disconnect
      if (pathname === '/disconnect' && request.method === 'POST') {
        const { serverId } = await request.json();
        await this.disconnectServer(serverId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get connection status
      if (pathname === '/has' && request.method === 'POST') {
        const { serverId } = await request.json();
        const has = this.connections.has(serverId);

        return new Response(JSON.stringify({ has }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get connections list
      if (pathname === '/connections' && request.method === 'GET') {
        const connections = Array.from(this.connections.keys());

        return new Response(JSON.stringify({
          connections,
          count: connections.length
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Size
      if (pathname === '/size' && request.method === 'GET') {
        return new Response(JSON.stringify({ size: this.connections.size }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });

    } catch (error) {
      console.error('[MCPConnectionPoolDO Error]', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async createConnection(serverId, config, options) {
    // Create transport with auth
    const transportOptions = {};

    if (config.auth && config.auth.type === 'headers' && config.auth.headers) {
      transportOptions.requestInit = {
        headers: config.auth.headers,
      };
    } else if (config.auth && config.auth.type === 'oauth') {
      // OAuth is handled by the SDK using the auth provider
      // The provider will fetch tokens from Durable Object storage
      transportOptions.authProvider = this.createOAuthProvider(serverId, options);
    }

    // Create transport
    let transport;
    if (config.transport === 'sse') {
      transport = new SSEClientTransport(new URL(config.url), transportOptions);
    } else if (config.transport === 'http') {
      transport = new StreamableHTTPClientTransport(new URL(config.url), transportOptions);
    } else {
      throw new Error(`Unsupported transport: ${config.transport}`);
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

    // Connect
    await client.connect(transport);

    // Store connection
    this.connections.set(serverId, {
      client,
      transport,
      connectedAt: Date.now(),
      lastUsed: Date.now()
    });

    console.log(`✅ Connected to ${config.serverName} (${serverId})`);
  }

  createOAuthProvider(serverId, options) {
    const { userId, frontendUrl } = options;
    const callbackUrl = `${frontendUrl}/oauth/callback`;

    // Create DB adapter inside DO (can't pass functions via JSON)
    const db = new DurableObjectsAdapter(this.env);

    return {
      get redirectUrl() {
        return callbackUrl;
      },

      get clientMetadata() {
        return {
          client_name: 'Hoot MCP Testing Tool',
          client_uri: frontendUrl,
          redirect_uris: [callbackUrl],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        };
      },

      state: async () => {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      },

      clientInformation: async () => {
        return await db.getOAuthClientInfo(userId, serverId);
      },

      saveClientInformation: async (clientInfo) => {
        await db.saveOAuthClientInfo(userId, serverId, clientInfo);
      },

      tokens: async () => {
        return await db.getOAuthTokens(userId, serverId);
      },

      saveTokens: async (tokens) => {
        await db.saveOAuthTokens(userId, serverId, tokens);
      },

      redirectToAuthorization: async (authUrl) => {
        const error = new Error('OAuth authorization required');
        error.name = 'UnauthorizedError';
        error.authorizationUrl = authUrl.toString();
        throw error;
      },

      saveCodeVerifier: async (verifier) => {
        await db.saveVerifier(userId, serverId, verifier);
      },

      codeVerifier: async () => {
        const verifier = await db.getVerifier(userId, serverId);
        if (!verifier) {
          throw new Error('Code verifier not found for this OAuth session. Please try reconnecting.');
        }
        return verifier;
      },

      invalidateCredentials: async (scope) => {
        await db.clearOAuthCredentials(userId, serverId, scope);
      },
    };
  }

  async disconnectServer(serverId) {
    const conn = this.connections.get(serverId);
    if (conn && conn.client) {
      try {
        await conn.client.close();
      } catch (err) {
        console.error(`Failed to close client ${serverId}:`, err);
      }
    }
    this.connections.delete(serverId);
    console.log(`✅ Disconnected from ${serverId}`);
  }

  startCleanupTimer() {
    // Clean up stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  async cleanupStaleConnections() {
    const MAX_IDLE = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    for (const [serverId, conn] of this.connections) {
      if (now - conn.lastUsed > MAX_IDLE) {
        await this.disconnectServer(serverId);
        console.log(`🧹 Cleaned up stale connection: ${serverId}`);
      }
    }
  }
}

