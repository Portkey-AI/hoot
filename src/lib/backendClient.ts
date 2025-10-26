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

/**
 * Retrieve and cache the session token from backend
 * This happens automatically on first request - completely transparent to users
 */
async function getSessionToken(): Promise<string> {
    if (sessionToken) {
        return sessionToken;
    }

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
        // Provide a user-friendly error message
        throw new Error('Cannot connect to Hoot backend. Make sure it\'s running on port 8008.');
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

