/**
 * Backend API Client
 * Communicates with the Node.js MCP backend server
 */

import type { ServerConfig, ToolSchema } from '../types';

// Support both local development and production deployment
// In production, VITE_BACKEND_URL should be set to the Railway backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8008';

// Session token for authentication
let sessionToken: string | null = null;
let tokenInitPromise: Promise<string> | null = null;

/**
 * Retrieve and cache the session token from backend
 * This happens automatically on first request - completely transparent to users
 */
async function getSessionToken(): Promise<string> {
    if (sessionToken) {
        return sessionToken;
    }

    // If a token fetch is already in progress, wait for it
    if (tokenInitPromise) {
        return tokenInitPromise;
    }

    tokenInitPromise = (async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/token`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to retrieve session token');
            }

            const data = await response.json();
            sessionToken = data.token;

            if (!sessionToken) {
                throw new Error('No token received from backend');
            }

            return sessionToken;
        } catch (error) {
            console.error('Failed to get session token:', error);
            tokenInitPromise = null; // Reset so we can retry
            // Provide a user-friendly error message
            throw new Error('Cannot connect to Hoot backend. Make sure it\'s running on port 8008.');
        } finally {
            // Clear the promise once completed (success or failure)
            // Keep sessionToken cached if successful
            if (sessionToken) {
                tokenInitPromise = null;
            }
        }
    })();

    return tokenInitPromise;
}

/**
 * Initialize the backend client by fetching the session token
 * This should be called when the app starts to ensure the token is ready
 * before any components try to make authenticated requests
 */
export async function initializeBackendClient(): Promise<void> {
    try {
        await getSessionToken();
        console.log('Backend client initialized successfully');
    } catch (error) {
        console.error('Failed to initialize backend client:', error);
        // Don't throw - let individual requests handle the error
    }
}

/**
 * Make an authenticated request to the backend
 * Retries once if authentication fails (to refresh token)
 */
async function authenticatedFetch(url: string, options: RequestInit = {}, retry = true): Promise<Response> {
    try {
        const token = await getSessionToken();

        const headers = new Headers(options.headers);
        headers.set('x-hoot-token', token);
        headers.set('Content-Type', 'application/json');

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // If auth fails, clear token and retry once
        if (response.status === 401 && retry) {
            console.log('Auth token expired, refreshing...');
            sessionToken = null;
            return authenticatedFetch(url, options, false);
        }

        return response;
    } catch (error) {
        // If token fetch fails initially, user may have restarted backend
        // Clear cache and retry once
        if (retry) {
            sessionToken = null;
            return authenticatedFetch(url, options, false);
        }
        throw error;
    }
}

/**
 * Discover if a server URL requires OAuth
 */
export async function discoverOAuth(
    url: string,
    transport: 'sse' | 'http'
): Promise<{ requiresOAuth: boolean; error?: string }> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/discover-oauth`, {
            method: 'POST',
            body: JSON.stringify({ url, transport }),
        });

        const data = await response.json();

        if (!data.success) {
            return { requiresOAuth: false, error: data.error };
        }

        return { requiresOAuth: data.requiresOAuth || false };
    } catch (error) {
        console.error('OAuth discovery error:', error);
        return {
            requiresOAuth: false,
            error: error instanceof Error ? error.message : 'Discovery failed'
        };
    }
}

/**
 * Auto-detect server configuration
 * Tries different transports and extracts server info
 */
export async function autoDetectServer(
    url: string
): Promise<{
    success: boolean;
    serverInfo?: { name: string; version: string; authMethods?: string[] };
    transport?: 'http' | 'sse';
    requiresOAuth?: boolean;
    requiresClientCredentials?: boolean;
    requiresHeaderAuth?: boolean; // NEW: indicates header-based auth is needed
    error?: string
}> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/auto-detect`, {
            method: 'POST',
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: data.error || 'Auto-detection failed'
            };
        }

        return {
            success: true,
            serverInfo: data.serverInfo,
            transport: data.transport,
            requiresOAuth: data.requiresOAuth || false,
            requiresClientCredentials: data.requiresClientCredentials || false,
            requiresHeaderAuth: data.requiresHeaderAuth || false,
        };
    } catch (error) {
        console.error('Auto-detect error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Auto-detection failed'
        };
    }
}

/**
 * Check if backend server is running
 */
export async function isBackendAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(1000), // 1 second timeout
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Connect to an MCP server through the backend
 */
export async function connectToServer(
    config: ServerConfig,
    authorizationCode?: string
): Promise<{ success: boolean; error?: string; needsAuth?: boolean; authorizationUrl?: string }> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/connect`, {
            method: 'POST',
            body: JSON.stringify({
                serverId: config.id,
                serverName: config.name,
                url: config.url,
                transport: config.transport,
                auth: config.auth,
                authorizationCode,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Connection failed',
                needsAuth: data.needsAuth || false,
                authorizationUrl: data.authorizationUrl,
            };
        }

        return { success: true };
    } catch (error) {
        console.error('Backend connection error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to connect to backend server',
        };
    }
}

/**
 * Disconnect from an MCP server
 */
export async function disconnectFromServer(serverId: string): Promise<void> {
    try {
        await authenticatedFetch(`${BACKEND_URL}/mcp/disconnect`, {
            method: 'POST',
            body: JSON.stringify({ serverId }),
        });
    } catch (error) {
        console.error('Backend disconnect error:', error);
        throw error;
    }
}

/**
 * Clear OAuth tokens from backend database for a specific server
 */
export async function clearOAuthTokens(serverId: string): Promise<void> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/clear-oauth-tokens`, {
            method: 'POST',
            body: JSON.stringify({ serverId }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to clear OAuth tokens');
        }
    } catch (error) {
        console.error('Backend clear OAuth tokens error:', error);
        throw error;
    }
}

/**
 * List tools from a connected MCP server
 */
export async function listTools(serverId: string): Promise<ToolSchema[]> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/tools/${serverId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to list tools');
        }

        const data = await response.json();
        return data.tools;
    } catch (error) {
        console.error('Backend list tools error:', error);
        throw error;
    }
}

/**
 * Execute a tool on a connected MCP server
 */
export async function executeTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
): Promise<unknown> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/execute`, {
            method: 'POST',
            body: JSON.stringify({
                serverId,
                toolName,
                arguments: args,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Tool execution failed');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Backend execute tool error:', error);
        throw error;
    }
}

/**
 * Get connection status for a server
 */
export async function getConnectionStatus(serverId: string): Promise<boolean> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/status/${serverId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.connected;
    } catch (error) {
        console.error('Backend status check error:', error);
        return false;
    }
}

/**
 * Get server information (name, version) from a connected server
 */
export async function getServerInfo(serverId: string): Promise<{ name: string; version: string } | null> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/server-info/${serverId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.serverInfo;
    } catch (error) {
        console.error('Backend get server info error:', error);
        return null;
    }
}

/**
 * Get all connected servers
 */
export async function getConnections(): Promise<string[]> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/connections`, {
            method: 'GET',
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.connections;
    } catch (error) {
        console.error('Backend connections error:', error);
        return [];
    }
}

/**
 * Get OAuth metadata for a connected server
 * This includes information like logo_uri from the OAuth authorization server
 */
export async function getOAuthMetadata(serverId: string): Promise<{
    issuer?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
    logo_uri?: string;
    [key: string]: unknown;
} | null> {
    try {
        const response = await authenticatedFetch(`${BACKEND_URL}/mcp/oauth-metadata/${serverId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            // 404 is expected if server hasn't connected yet - don't log error
            if (response.status !== 404) {
                console.error(`Failed to fetch OAuth metadata (${response.status}):`, await response.text());
            }
            return null;
        }

        const data = await response.json();
        return data.metadata || null;
    } catch (error) {
        console.error('Backend get OAuth metadata error:', error);
        return null;
    }
}

