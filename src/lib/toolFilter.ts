import type { ServerConfig, ToolSchema } from '../types';
import type { ChatMessage } from './portkeyClient';
import { getSessionToken } from './backendClient';

// Backend URL for tool filtering
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8008';

async function backendFetch(url: string, options: RequestInit = {}) {
    const token = await getSessionToken();
    const headers = new Headers(options.headers);
    headers.set('x-hoot-token', token);
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
        ...options,
        headers,
    });
}

/**
 * Track initialization status
 */
let isInitialized = false;
let initializationError: Error | null = null;

/**
 * Initialize the tool filter on the backend with current servers and tools
 */
export async function initializeToolFilter(
    servers: ServerConfig[],
    toolsByServer: Record<string, ToolSchema[]>
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('[ToolFilter] Initializing on backend...');

        const connectedServers = servers.filter(s => s.connected);

        if (connectedServers.length === 0) {
            console.log('[ToolFilter] No connected servers, skipping initialization');
            isInitialized = false;
            return { success: false, error: 'No connected servers' };
        }

        // Prepare servers with tools for backend
        const serversWithTools = connectedServers.map(server => ({
            id: server.id,
            name: server.name,
            tools: toolsByServer[server.id] || [],
        }));

        const totalTools = serversWithTools.reduce((sum, server) => sum + server.tools.length, 0);
        console.log(`[ToolFilter] Sending ${serversWithTools.length} servers with ${totalTools} tools to backend`);

        // Call backend to initialize
        const response = await backendFetch(`${BACKEND_URL}/mcp/tool-filter/initialize`, {
            method: 'POST',
            body: JSON.stringify({ servers: serversWithTools }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            const errorMsg = data.error || 'Backend initialization failed';
            console.error('[ToolFilter] Backend initialization failed:', errorMsg);
            throw new Error(errorMsg);
        }

        isInitialized = true;
        initializationError = null;
        console.log('[ToolFilter] Backend initialization complete');

        return { success: true };
    } catch (error) {
        console.error('[ToolFilter] Backend initialization failed:', error);
        isInitialized = false;
        initializationError = error as Error;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Filter tools based on conversation context (calls backend)
 */
export async function filterToolsForContext(
    messages: ChatMessage[],
    options?: any
): Promise<{ tools: any[]; metrics: any } | null> {
    if (!isInitialized) {
        console.warn('[ToolFilter] Filter not initialized on backend');
        return null;
    }

    try {
        const response = await backendFetch(`${BACKEND_URL}/mcp/tool-filter/filter`, {
            method: 'POST',
            body: JSON.stringify({ messages, options }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Backend filtering failed');
        }

        console.log(
            `[ToolFilter] Backend filtered to ${data.tools.length} tools in ${data.metrics.totalTime.toFixed(2)}ms`
        );

        return {
            tools: data.tools,
            metrics: data.metrics,
        };
    } catch (error) {
        console.error('[ToolFilter] Backend filtering failed:', error);
        return null;
    }
}

/**
 * Get filter statistics from backend
 */
export function getFilterStats(): {
    initialized: boolean;
    error: string | null;
    stats: any;
} {
    return {
        initialized: isInitialized,
        error: initializationError?.message || null,
        stats: null, // Could fetch from backend if needed
    };
}

/**
 * Clear the filter cache on backend
 */
export async function clearFilterCache(): Promise<void> {
    try {
        await backendFetch(`${BACKEND_URL}/mcp/tool-filter/clear-cache`, {
            method: 'POST',
        });
        console.log('[ToolFilter] Backend cache cleared');
    } catch (error) {
        console.error('[ToolFilter] Failed to clear backend cache:', error);
    }
}

/**
 * Check if filter is ready to use
 */
export function isFilterReady(): boolean {
    return isInitialized;
}

/**
 * Reset the filter
 */
export function resetToolFilter(): void {
    isInitialized = false;
    initializationError = null;
    console.log('[ToolFilter] Filter reset');
}

