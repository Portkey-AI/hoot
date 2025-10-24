/**
 * Backend API Client
 * Communicates with the Node.js MCP backend server
 */

import type { ServerConfig, ToolSchema } from '../types';

const BACKEND_URL = 'http://localhost:8008';

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
        const response = await fetch(`${BACKEND_URL}/mcp/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        await fetch(`${BACKEND_URL}/mcp/disconnect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ serverId }),
        });
    } catch (error) {
        console.error('Backend disconnect error:', error);
        throw error;
    }
}

/**
 * List tools from a connected MCP server
 */
export async function listTools(serverId: string): Promise<ToolSchema[]> {
    try {
        const response = await fetch(`${BACKEND_URL}/mcp/tools/${serverId}`, {
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
        const response = await fetch(`${BACKEND_URL}/mcp/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        const response = await fetch(`${BACKEND_URL}/mcp/status/${serverId}`, {
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
        const response = await fetch(`${BACKEND_URL}/mcp/connections`, {
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

