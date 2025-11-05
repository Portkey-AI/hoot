/**
 * Shared Route Handlers
 * 
 * Core business logic that works in both Node.js and Workers environments.
 * These are pure functions that take dependencies as parameters.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { logger } from './logger.js';

/**
 * Create OAuth provider for MCP SDK
 */
export function createOAuthProvider(options) {
  const {
    db,
    userId,
    serverId,
    frontendUrl,
    existingClientInfo
  } = options;

  const callbackUrl = `${frontendUrl}/oauth/callback`;

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
      // Use Web Crypto API (available in both Workers and Node.js 18+)
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    },

    clientInformation: async () => {
      if (existingClientInfo) {
        return existingClientInfo;
      }
      return await db.getOAuthClientInfo(userId, serverId);
    },

    saveClientInformation: async (clientInfo) => {
      logger.success(`OAuth client registered for ${serverId}`);
      await db.saveOAuthClientInfo(userId, serverId, clientInfo);
    },

    tokens: async () => {
      return await db.getOAuthTokens(userId, serverId);
    },

    saveTokens: async (tokens) => {
      logger.success(`OAuth tokens saved for ${serverId}`);
      await db.saveOAuthTokens(userId, serverId, tokens);
    },

    redirectToAuthorization: async (authUrl) => {
      // Backend can't redirect - throw UnauthorizedError to signal browser
      logger.info(`🔐 OAuth needed: ${authUrl.toString()}`);
      const error = new Error('OAuth authorization required');
      error.name = 'UnauthorizedError';
      error.authorizationUrl = authUrl.toString();
      throw error;
    },

    saveCodeVerifier: async (verifier) => {
      logger.verbose(`Saving OAuth code verifier for ${serverId}`);
      await db.saveVerifier(userId, serverId, verifier);
    },

    codeVerifier: async () => {
      const verifier = await db.getVerifier(userId, serverId);

      if (!verifier) {
        logger.error(`Code verifier not found for ${serverId}`);
        logger.error(`OAuth flow interrupted - please reconnect`);
        throw new Error('Code verifier not found for this OAuth session. Please try reconnecting.');
      }

      return verifier;
    },

    invalidateCredentials: async (scope) => {
      logger.info(`🔐 Invalidating ${scope} credentials for ${serverId}`);
      await db.clearOAuthCredentials(userId, serverId, scope);
    },
  };
}

/**
 * Auto-detect server configuration
 */
export async function autoDetectServer({ url }) {
  logger.info(`🔍 Auto-detecting configuration for: ${url}`);

  // Step 1: Check for WWW-Authenticate header (MCP-spec-compliant OAuth detection)
  let requiresOAuthFromHeader = false;
  let resourceMetadata = null;
  let scope = null;

  try {
    logger.verbose(`Probing for WWW-Authenticate header...`);
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
      logger.verbose(`WWW-Authenticate:`, wwwAuth);

      if (wwwAuth && wwwAuth.toLowerCase().includes('bearer')) {
        requiresOAuthFromHeader = true;
        logger.info(`🔐 OAuth detected via WWW-Authenticate header (MCP spec compliant)`);

        // Extract resource_metadata URL (RFC 9728)
        const resourceMatch = wwwAuth.match(/resource_metadata="([^"]+)"/);
        if (resourceMatch) {
          resourceMetadata = resourceMatch[1];
          logger.verbose(`Resource metadata URL:`, resourceMetadata);
        }

        // Extract scope (RFC 6750)
        const scopeMatch = wwwAuth.match(/scope="([^"]+)"/);
        if (scopeMatch) {
          scope = scopeMatch[1];
          logger.verbose(`Required scope:`, scope);
        }
      }
    }
  } catch (probeError) {
    logger.verbose(`WWW-Authenticate probe failed:`, probeError.message);
  }

  // Step 2: Try transports in order: HTTP first, then SSE
  const transportsToTry = ['http', 'sse'];
  let detectedTransport = null;
  let serverInfo = null;
  let requiresOAuth = requiresOAuthFromHeader;
  let requiresClientCredentials = false;
  let requiresHeaderAuth = false;
  let lastError = null;

  for (const transport of transportsToTry) {
    logger.verbose(`Trying ${transport.toUpperCase()} transport...`);

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

      // Connection succeeded!
      const serverVersion = client.getServerVersion();
      if (serverVersion) {
        serverInfo = {
          name: serverVersion.name || 'Unknown Server',
          version: serverVersion.version || '1.0.0',
        };

        // Check if server advertises auth methods
        if (serverVersion.authMethods && Array.isArray(serverVersion.authMethods)) {
          serverInfo.authMethods = serverVersion.authMethods;

          if (serverVersion.authMethods.includes('client_credentials')) {
            requiresClientCredentials = true;
            logger.info(`🔑 Server advertises client_credentials auth`);
          }
          if (serverVersion.authMethods.includes('oauth') || serverVersion.authMethods.includes('oauth2')) {
            requiresOAuth = true;
            logger.info(`🔐 Server advertises OAuth auth`);
          }
        }
      }

      detectedTransport = transport;
      if (!requiresOAuth && !requiresClientCredentials) {
        requiresOAuth = false;
      }

      logger.success(`Successfully connected with ${transport.toUpperCase()}`);
      logger.verbose(`Server info:`, serverInfo);

      await client.close();
      break;
    } catch (error) {
      logger.verbose(`${transport.toUpperCase()} failed:`, error.message);

      const isOAuthError = error.name === 'UnauthorizedError' && error.authorizationUrl;
      const is401or403 = error.message && (error.message.includes('401') || error.message.includes('403'));
      const isHeaderAuthError = is401or403 && !isOAuthError && !requiresOAuthFromHeader;

      if (isOAuthError) {
        logger.info(`🔐 OAuth detected for ${transport.toUpperCase()} (SDK UnauthorizedError)`);
        detectedTransport = transport;
        requiresOAuth = true;
        break;
      }

      if (isHeaderAuthError) {
        logger.info(`🔑 Custom auth detected for ${transport.toUpperCase()} (401/403 without OAuth)`);
        detectedTransport = transport;
        requiresOAuth = false;
        requiresHeaderAuth = true;

        // Extract server name from URL
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
        } catch (urlError) {
          serverInfo = { name: 'MCP Server', version: '1.0.0' };
        }

        break;
      }

      if (requiresOAuthFromHeader && is401or403) {
        logger.info(`🔐 Using OAuth from WWW-Authenticate header for ${transport.toUpperCase()}`);
        detectedTransport = transport;
        requiresOAuth = true;

        // Extract server name from URL
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
        } catch (urlError) {
          serverInfo = { name: 'MCP Server', version: '1.0.0' };
        }

        break;
      }

      lastError = error;
      continue;
    }
  }

  if (!detectedTransport) {
    throw new Error(lastError?.message || 'Could not connect with any transport method');
  }

  // If we couldn't get server info, extract a name from the URL
  if (!serverInfo) {
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

      logger.verbose(`Could not get server metadata, extracted name from URL: ${extractedName}`);
    } catch (urlError) {
      serverInfo = { name: 'MCP Server', version: '1.0.0' };
    }
  }

  return {
    success: true,
    transport: detectedTransport,
    serverInfo,
    requiresOAuth,
    requiresClientCredentials,
    requiresHeaderAuth,
  };
}

/**
 * Connect to an MCP server
 */
export async function connectToServer(options) {
  const {
    serverId,
    serverName,
    url,
    transport,
    auth,
    authorizationCode,
    userId,
    db,
    frontendUrl,
    clientManager
  } = options;

  logger.info(`🔌 Connecting to MCP server: ${serverName}`, {
    serverId,
    url,
    transport,
    hasAuth: !!auth,
    authType: auth?.type,
    hasAuthCode: !!authorizationCode
  });

  // Disconnect existing connection if any
  if (clientManager.has(serverId)) {
    logger.info(`♻️ Disconnecting existing connection for ${serverId}`);
    await clientManager.disconnect(serverId);
  }

  // Create transport options with authentication
  const transportOptions = {};

  if (auth && auth.type === 'headers' && auth.headers) {
    transportOptions.requestInit = {
      headers: auth.headers,
    };
  } else if (auth && auth.type === 'oauth') {
    // Load existing client info if available to reuse client_id
    const existingClientInfo = await db.getOAuthClientInfo(userId, serverId);

    // OAuth client reuse (logging disabled to reduce noise)

    transportOptions.authProvider = createOAuthProvider({
      db,
      userId,
      serverId,
      frontendUrl,
      existingClientInfo
    });
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

  // Handle OAuth authorization code if provided
  if (authorizationCode && (mcpTransport instanceof SSEClientTransport || mcpTransport instanceof StreamableHTTPClientTransport)) {
    logger.info(`🔐 Completing OAuth flow for ${serverName} with code...`);
    try {
      await mcpTransport.finishAuth(authorizationCode);
      logger.success(`OAuth finishAuth completed for ${serverName}`);
    } catch (authError) {
      logger.error(`OAuth finishAuth failed:`, authError);
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
  logger.info(`🔌 Calling client.connect() for ${serverName}...`);
  try {
    await client.connect(mcpTransport);
  } catch (connectError) {
    // Log error concisely (full error details are too verbose)
    logger.error(`client.connect() failed for ${serverName}:`, connectError.message);
    throw connectError;
  }

  // Store client
  clientManager.set(serverId, client, mcpTransport);

  logger.success(`Successfully connected to ${serverName}`);

  return {
    success: true,
    serverId,
    message: `Connected to ${serverName}`,
  };
}

/**
 * List tools from a connected server
 */
export async function listTools({ serverId, clientManager, connectionPool }) {
  // Support both old clientManager and new connectionPool
  const pool = connectionPool || clientManager;

  // For Workers (DO-based), use direct method
  if (pool.listTools) {
    return await pool.listTools(serverId);
  }

  // For Node.js (in-memory), get client
  const client = await pool.getClient(serverId);

  if (!client) {
    throw new Error('Server not connected');
  }

  logger.info(`🔧 Listing tools for server: ${serverId}`);
  const response = await client.listTools();

  const tools = response.tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    inputSchema: tool.inputSchema,
  }));

  return {
    success: true,
    tools,
  };
}

/**
 * Execute a tool on a connected server
 */
export async function executeTool({ serverId, toolName, arguments: args, clientManager, connectionPool }) {
  // Support both old clientManager and new connectionPool
  const pool = connectionPool || clientManager;

  // For Workers (DO-based), use direct method
  if (pool.executeTool) {
    return await pool.executeTool(serverId, toolName, args);
  }

  // For Node.js (in-memory), get client
  const client = await pool.getClient(serverId);

  if (!client) {
    throw new Error('Server not connected');
  }

  logger.info(`⚡ Executing tool: ${toolName} on server: ${serverId}`, args);
  const response = await client.callTool({
    name: toolName,
    arguments: args,
  });

  return {
    success: true,
    result: response.content,
  };
}

/**
 * Fetch favicon for a server URL
 */
export async function fetchFavicon({ serverUrl, oauthLogoUri, db }) {
  // Check database cache first (24 hour TTL)
  const cached = await db.getFaviconCache(serverUrl, oauthLogoUri);

  if (cached) {
    // Favicon cache hit (logging disabled to reduce noise)
    return {
      success: true,
      faviconUrl: cached,
      fromCache: true
    };
  }

  logger.verbose(`Fetching favicon for: ${serverUrl}`);

  const faviconPaths = ['/favicon.ico', '/favicon.png', '/favicon.svg', '/favicon'];

  // Helper to check if a URL is accessible
  const checkUrl = async (url) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

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

  // Helper to parse HTML for favicon link tags
  const parseHtmlForFavicon = async (htmlUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(htmlUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Hoot-MCP-Client/1.0'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const html = await response.text();

      // Match <link> tags with rel="icon" or rel="shortcut icon"
      // This regex looks for link tags with href attribute and icon in rel
      const linkRegex = /<link[^>]*rel=["']([^"']*icon[^"']*)["'][^>]*>/gi;
      const hrefRegex = /href=["']([^"']+)["']/i;

      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const linkTag = match[0];
        const hrefMatch = hrefRegex.exec(linkTag);

        if (hrefMatch && hrefMatch[1]) {
          let faviconUrl = hrefMatch[1];

          // Convert relative URLs to absolute
          if (faviconUrl.startsWith('/')) {
            const urlObj = new URL(htmlUrl);
            faviconUrl = `${urlObj.origin}${faviconUrl}`;
          } else if (!faviconUrl.startsWith('http')) {
            const urlObj = new URL(htmlUrl);
            faviconUrl = `${urlObj.origin}/${faviconUrl}`;
          }

          // Verify the favicon URL works
          if (await checkUrl(faviconUrl)) {
            return faviconUrl;
          }
        }
      }

      return null;
    } catch (error) {
      logger.verbose(`Failed to parse HTML for favicon: ${error.message}`);
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

  // 2. Extract domain and try standard paths
  if (!foundFaviconUrl) {
    let urlObj;
    try {
      urlObj = new URL(serverUrl);
    } catch {
      throw new Error('Invalid server URL');
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

    // 3. Try primary domain if subdomain
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
        }
      }
    }

    // 4. If still not found, parse HTML for <link rel="icon"> tags
    if (!foundFaviconUrl) {
      // Try the primary domain's HTML first
      const parts = urlObj.hostname.split('.');
      if (parts.length > 2) {
        const primaryDomain = parts.slice(-2).join('.');
        const primaryOrigin = `${urlObj.protocol}//${primaryDomain}`;
        foundFaviconUrl = await parseHtmlForFavicon(primaryOrigin);
      }

      // If still not found, try the original domain
      if (!foundFaviconUrl) {
        foundFaviconUrl = await parseHtmlForFavicon(domain);
      }
    }
  }

  // Cache the result in database (including null)
  await db.saveFaviconCache(serverUrl, foundFaviconUrl, oauthLogoUri);

  logger.verbose(`Favicon result for ${serverUrl}: ${foundFaviconUrl || 'none'}`);

  return {
    success: true,
    faviconUrl: foundFaviconUrl,
    fromCache: false
  };
}

