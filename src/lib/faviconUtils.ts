/**
 * Utilities for fetching and managing server favicons
 */

/**
 * Extract the domain from a URL (origin only, no path)
 */
function extractDomain(url: string): string | null {
    try {
        const urlObj = new URL(url);
        return urlObj.origin;
    } catch {
        return null;
    }
}

/**
 * Common favicon paths to try
 */
const FAVICON_PATHS = [
    '/favicon.ico',
    '/favicon.png',
    '/favicon.svg',
    '/favicon',
];

/**
 * Fetch HTML and extract favicon URL from link tags
 * Looks for <link rel="icon">, <link rel="shortcut icon">, etc.
 */
async function extractFaviconFromHTML(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            // Don't use no-cors here, we need to read the response
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return null;
        }

        const html = await response.text();

        // Parse HTML for favicon link tags
        // Look for: <link rel="icon">, <link rel="shortcut icon">, <link rel="apple-touch-icon">
        const faviconRegex = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi;
        const matches = html.match(faviconRegex);

        if (matches && matches.length > 0) {
            // Extract href from the first match
            const hrefMatch = matches[0].match(/href=["']([^"']+)["']/i);
            if (hrefMatch && hrefMatch[1]) {
                let faviconUrl = hrefMatch[1];

                // Handle relative URLs
                if (faviconUrl.startsWith('//')) {
                    // Protocol-relative URL
                    const urlObj = new URL(url);
                    faviconUrl = `${urlObj.protocol}${faviconUrl}`;
                } else if (faviconUrl.startsWith('/')) {
                    // Absolute path
                    const urlObj = new URL(url);
                    faviconUrl = `${urlObj.origin}${faviconUrl}`;
                } else if (!faviconUrl.startsWith('http')) {
                    // Relative path
                    const urlObj = new URL(url);
                    faviconUrl = `${urlObj.origin}/${faviconUrl}`;
                }

                return faviconUrl;
            }
        }

        return null;
    } catch (error) {
        // Timeout or fetch error
        return null;
    }
}

/**
 * Check if a URL is accessible (returns a valid image)
 */
async function isFaviconAccessible(url: string): Promise<boolean> {
    try {
        // Try with no-cors mode first (for cross-origin requests)
        await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'force-cache',
        });

        // With no-cors, we can't check the status, so we just return true
        // The actual loading will happen in the img tag
        return true;
    } catch {
        // If HEAD fails, try GET with a timeout
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'force-cache',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Get all possible favicon URLs for a server with comprehensive fallback logic:
 * 1. OAuth logo_uri (if available)
 * 2. Specific domain standard paths (.ico, .png, .svg, no extension)
 * 3. Primary domain standard paths (.ico, .png, .svg, no extension)
 * 4. Parse HTML from specific domain for <link rel="icon">
 * 5. Parse HTML from primary domain for <link rel="icon">
 * 
 * @param serverUrl - The URL of the MCP server
 * @param oauthLogoUri - Optional OAuth logo_uri from OAuth metadata
 * @returns Array of favicon URLs to try in order
 */
export async function getAllFaviconUrls(
    serverUrl: string | undefined,
    oauthLogoUri?: string
): Promise<string[]> {
    const urls: string[] = [];

    // Strategy 1: Try OAuth logo_uri first if available
    if (oauthLogoUri) {
        try {
            new URL(oauthLogoUri);
            urls.push(oauthLogoUri);
        } catch {
            // Invalid URL, skip
        }
    }

    if (!serverUrl) {
        return urls;
    }

    try {
        const urlObj = new URL(serverUrl);
        const domain = urlObj.origin;

        // Strategy 2: Try specific domain standard paths
        for (const path of FAVICON_PATHS) {
            urls.push(`${domain}${path}`);
        }

        // Strategy 3: Try primary domain standard paths (if different)
        const parts = urlObj.hostname.split('.');
        let primaryDomain: string | null = null;

        if (parts.length > 2) {
            const primaryDomainHost = parts.slice(-2).join('.');
            primaryDomain = `${urlObj.protocol}//${primaryDomainHost}`;

            if (primaryDomain !== domain) {
                for (const path of FAVICON_PATHS) {
                    urls.push(`${primaryDomain}${path}`);
                }
            }
        }

        // Strategy 4 & 5: Parse HTML as final fallback
        // Try specific domain HTML
        const htmlFavicon = await extractFaviconFromHTML(domain);
        if (htmlFavicon && !urls.includes(htmlFavicon)) {
            urls.push(htmlFavicon);
        }

        // Try primary domain HTML (if different)
        if (primaryDomain && primaryDomain !== domain) {
            const primaryHtmlFavicon = await extractFaviconFromHTML(primaryDomain);
            if (primaryHtmlFavicon && !urls.includes(primaryHtmlFavicon)) {
                urls.push(primaryHtmlFavicon);
            }
        }
    } catch (error) {
        console.warn('Error building favicon URL list:', error);
    }

    return urls;
}

/**
 * Synchronously get the best guess favicon URL without checking accessibility.
 * This is useful for immediate rendering while async checks happen in the background.
 * Tries multiple common favicon formats.
 * 
 * @param serverUrl - The URL of the MCP server
 * @param oauthLogoUri - Optional OAuth logo_uri from OAuth metadata
 * @returns The favicon URL to try, or null if none available
 */
export function getServerFaviconUrlSync(
    serverUrl: string | undefined,
    oauthLogoUri?: string
): string | null {
    // Strategy 1: Use OAuth logo_uri if available
    if (oauthLogoUri) {
        try {
            new URL(oauthLogoUri);
            return oauthLogoUri;
        } catch {
            // Invalid URL, continue
        }
    }

    // Strategy 2: Use specific domain favicon (try most common format first)
    if (!serverUrl) {
        return null;
    }

    const domain = extractDomain(serverUrl);
    if (domain) {
        // Return the first/most common favicon path as best guess
        return `${domain}/favicon.ico`;
    }

    return null;
}

