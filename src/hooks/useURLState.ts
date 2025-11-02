/**
 * URL state management hook
 * Handles reading and updating URL search parameters for shareable state
 */

import { useCallback } from 'react';

export interface URLState {
  server?: string | null;
  tool?: string | null;
  search?: string | null;
  params?: string | null;
  execution?: string | null;
}

export function useURLState() {
  /**
   * Read current URL state
   */
  const readURL = useCallback((): URLState => {
    const searchParams = new URLSearchParams(window.location.search);
    
    return {
      server: searchParams.get('server'),
      tool: searchParams.get('tool'),
      search: searchParams.get('search'),
      params: searchParams.get('params'),
      execution: searchParams.get('execution'),
    };
  }, []);

  /**
   * Update URL with new state (merges with existing params)
   * @param updates - Partial state to update
   * @param replace - If true, uses replaceState instead of pushState
   */
  const updateURL = useCallback((updates: URLState, replace = false) => {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    // Update or remove parameters
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        searchParams.delete(key);
      } else {
        searchParams.set(key, value);
      }
    });

    // Update URL
    const newURL = `${url.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}${url.hash}`;
    
    if (replace) {
      window.history.replaceState({}, '', newURL);
    } else {
      window.history.pushState({}, '', newURL);
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

