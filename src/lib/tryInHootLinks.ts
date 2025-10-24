import type { TransportType, AuthConfig } from '../types';

/**
 * Configuration for generating "Try in Hoot" links
 */
export interface TryInHootConfig {
    name: string;
    transport: TransportType;
    command?: string;
    url?: string;
    auth?: AuthConfig;
}

/**
 * Generates a "Try in Hoot" URL from server configuration
 * 
 * @param config Server configuration
 * @param baseUrl Base URL of the Hoot app (default: current origin)
 * @returns A shareable URL that opens Hoot and prompts to add the server
 * 
 * @example
 * ```typescript
 * const link = generateTryInHootLink({
 *   name: "Weather MCP Server",
 *   transport: "http",
 *   url: "http://localhost:3000"
 * });
 * // Returns: "https://hoot.app/?try=eyJuYW1lIjoiV2VhdG..."
 * ```
 */
export function generateTryInHootLink(
    config: TryInHootConfig,
    baseUrl: string = window.location.origin
): string {
    // Validate configuration
    if (!config.name || !config.transport) {
        throw new Error('Config must include name and transport');
    }

    if (config.transport === 'stdio' && !config.command) {
        throw new Error('stdio transport requires a command');
    }

    if ((config.transport === 'sse' || config.transport === 'http') && !config.url) {
        throw new Error('SSE/HTTP transport requires a URL');
    }

    // Create minimal config object
    const minimalConfig: TryInHootConfig = {
        name: config.name,
        transport: config.transport,
        ...(config.command && { command: config.command }),
        ...(config.url && { url: config.url }),
        ...(config.auth && { auth: config.auth }),
    };

    // Encode configuration as base64
    const encoded = btoa(JSON.stringify(minimalConfig));

    // Generate URL with try parameter
    return `${baseUrl}/?try=${encoded}`;
}

/**
 * Generates HTML for a "Try in Hoot" button
 * 
 * @param config Server configuration
 * @param baseUrl Base URL of the Hoot app (default: current origin)
 * @returns HTML string for an anchor tag styled as a button
 * 
 * @example
 * ```typescript
 * const html = generateTryInHootButton({
 *   name: "Weather MCP Server",
 *   transport: "http",
 *   url: "http://localhost:3000"
 * });
 * ```
 */
export function generateTryInHootButton(
    config: TryInHootConfig,
    baseUrl: string = 'https://hoot.app'
): string {
    const link = generateTryInHootLink(config, baseUrl);

    return `<a href="${link}" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: system-ui, -apple-system, sans-serif; transition: background 0.2s;">
  <span>🚀</span>
  <span>Try in Hoot</span>
</a>`;
}

/**
 * Generates Markdown for a "Try in Hoot" button
 * 
 * @param config Server configuration
 * @param baseUrl Base URL of the Hoot app (default: current origin)
 * @returns Markdown string for a linked badge
 * 
 * @example
 * ```typescript
 * const markdown = generateTryInHootMarkdown({
 *   name: "Weather MCP Server",
 *   transport: "http",
 *   url: "http://localhost:3000"
 * });
 * // Returns: "[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1)](https://hoot.app/?try=...)"
 * ```
 */
export function generateTryInHootMarkdown(
    config: TryInHootConfig,
    baseUrl: string = 'https://hoot.app'
): string {
    const link = generateTryInHootLink(config, baseUrl);

    return `[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNOCAyTDMgNkw4IDEwTDEzIDZMOCAyWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNMyAxMEw4IDE0TDEzIDEwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=)](${link})`;
}

/**
 * Decodes a "Try in Hoot" link and extracts the configuration
 * Useful for testing and debugging
 * 
 * @param url The full URL or just the encoded parameter
 * @returns The decoded server configuration
 */
export function decodeTryInHootLink(url: string): TryInHootConfig {
    try {
        // Extract the try parameter
        let encoded: string | null = null;

        if (url.includes('try=')) {
            const urlObj = new URL(url);
            encoded = urlObj.searchParams.get('try');
        } else {
            // Assume it's just the encoded string
            encoded = url;
        }

        if (!encoded) {
            throw new Error('No "try" parameter found in URL');
        }

        // Decode and parse
        const decoded = atob(encoded);
        const config = JSON.parse(decoded);

        return config;
    } catch (error) {
        throw new Error(`Failed to decode Try in Hoot link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

