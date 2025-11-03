/**
 * URL state management hook
 * Handles reading and updating URL search parameters for shareable state
 * Automatically syncs URL with application state for seamless sharing
 */

import { useCallback } from 'react';

export interface URLState {
  server?: string | null;      // Server reference in format "name:url" or legacy ID
  tool?: string | null;         // Selected tool name
  search?: string | null;       // Search query
  args?: string | null;         // Tool arguments (base64 encoded JSON)
  view?: string | null;         // View mode (test/hybrid)
  execution?: string | null;    // Execution result reference
}

export interface ServerReference {
  name: string;
  url: string;
}

/**
 * Encode a server name for safe use in URL
 * Uses a custom encoding to avoid collisions with our delimiter
 */
function encodeServerName(name: string): string {
  // Replace colons with a safe placeholder since we use colon as delimiter
  // Use URL encoding for other special characters
  return encodeURIComponent(name.replace(/:/g, '%3A'));
}

/**
 * Decode a server name from URL encoding
 */
function decodeServerName(encoded: string): string {
  try {
    return decodeURIComponent(encoded).replace(/%3A/g, ':');
  } catch (e) {
    console.warn('Failed to decode server name:', e);
    return encoded;
  }
}

/**
 * Parse server reference from URL format
 * Format: "name:url" or just an ID for legacy support
 * 
 * Server names and URLs are automatically decoded.
 * Handles edge cases like colons in names, special characters, etc.
 */
export function parseServerReference(ref: string): ServerReference | null {
  if (!ref) return null;

  // Find the first unencoded colon (our delimiter)
  // This works because encoded colons are %3A
  const colonIndex = ref.indexOf(':');

  if (colonIndex > 0) {
    // Format: "name:protocol://url"
    const encodedName = ref.substring(0, colonIndex);
    const url = ref.substring(colonIndex + 1);

    const name = decodeServerName(encodedName);

    return { name, url };
  }

  return null;
}

/**
 * Create server reference string for URL
 * Properly encodes server name to avoid parsing issues
 */
export function createServerReference(name: string, url: string): string {
  // Validate inputs
  if (!name || !url) {
    throw new Error('Server name and URL are required');
  }

  // Encode the name to handle special characters and colons
  const encodedName = encodeServerName(name);

  // URL doesn't need encoding here - URLSearchParams will handle it
  return `${encodedName}:${url}`;
}

/**
 * Encode tool arguments for URL
 */
export function encodeArgs(args: Record<string, unknown>): string {
  try {
    return btoa(JSON.stringify(args));
  } catch (e) {
    console.error('Failed to encode args:', e);
    return '';
  }
}

/**
 * Decode tool arguments from URL
 */
export function decodeArgs(encoded: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    console.error('Failed to decode args:', e);
    return null;
  }
}

let debounceTimer: NodeJS.Timeout | null = null;

export function useURLState() {
  /**
   * Read current URL state
   */
  const readURL = useCallback((): URLState => {
    const searchParams = new URLSearchParams(window.location.search);

    const state = {
      server: searchParams.get('s') || searchParams.get('server'), // Support both short and long form
      tool: searchParams.get('tool'),
      search: searchParams.get('search'),
      args: searchParams.get('args'),
      view: searchParams.get('view'),
      execution: searchParams.get('execution'),
    };

    console.log('🔍 readURL called:', {
      fullURL: window.location.href,
      search: window.location.search,
      parsedState: state,
    });

    return state;
  }, []);

  /**
   * Update URL with new state (merges with existing params)
   * @param updates - Partial state to update
   * @param replace - If true, uses replaceState instead of pushState
   * @param debounce - If true, debounces the update (default: false)
   */
  const updateURL = useCallback((updates: URLState, replace = true, debounce = false) => {
    console.log('📝 updateURL called:', {
      updates,
      currentURL: window.location.href,
      stack: new Error().stack?.split('\n').slice(2, 5).join('\n'), // Show caller
    });

    const performUpdate = () => {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;

      // Update or remove parameters
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          // Handle both short and long form for server
          if (key === 'server') {
            searchParams.delete('s');
            searchParams.delete('server');
          } else {
            searchParams.delete(key);
          }
        } else {
          // Use short form 's' for server to keep URLs cleaner
          if (key === 'server') {
            searchParams.set('s', value);
            searchParams.delete('server'); // Remove legacy form if present
          } else {
            searchParams.set(key, value);
          }
        }
      });

      // Update URL
      const newURL = `${url.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}${url.hash}`;

      console.log('📝 Updating URL to:', newURL);

      if (replace) {
        window.history.replaceState({}, '', newURL);
      } else {
        window.history.pushState({}, '', newURL);
      }
    };

    if (debounce) {
      // Debounce updates to avoid too many history entries
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(performUpdate, 300);
    } else {
      performUpdate();
    }
  }, []);

  /**
   * Clear specific URL parameters
   */
  const clearURLParams = useCallback((keys: (keyof URLState)[]) => {
    const updates: URLState = {};
    keys.forEach(key => {
      updates[key] = null;
    });
    updateURL(updates, true); // Use replace for cleanup
  }, [updateURL]);

  /**
   * Clear all URL parameters
   */
  const clearAllParams = useCallback(() => {
    const url = new URL(window.location.href);
    window.history.replaceState({}, '', url.pathname + url.hash);
  }, []);

  return {
    readURL,
    updateURL,
    clearURLParams,
    clearAllParams,
  };
}

