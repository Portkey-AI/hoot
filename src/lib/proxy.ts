/**
 * CORS Proxy Utility
 * Wraps MCP server URLs to route through local proxy server
 */

const PROXY_URL = 'http://localhost:3001/proxy';

/**
 * Check if proxy server is running
 */
export async function isProxyAvailable(): Promise<boolean> {
    try {
        const response = await fetch('http://localhost:3001/health', {
            method: 'GET',
            signal: AbortSignal.timeout(1000), // 1 second timeout
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Wrap a URL to go through the CORS proxy
 * @param url - The target MCP server URL
 * @returns Proxied URL
 */
export function wrapWithProxy(url: string): string {
    // Encode the target URL as a query parameter
    const encodedTarget = encodeURIComponent(url);
    return `${PROXY_URL}?target=${encodedTarget}`;
}

/**
 * Get the appropriate URL based on proxy settings
 * @param url - The target MCP server URL
 * @param useProxy - Whether to use the proxy
 * @returns The URL to use (proxied or direct)
 */
export function getProxiedUrl(url: string, useProxy: boolean): string {
    if (!useProxy) {
        return url;
    }

    // Don't proxy localhost URLs
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
        return url;
    }

    return wrapWithProxy(url);
}

