/**
 * LocalStorage preferences management
 * Provides type-safe access to user preferences
 */

const PREFERENCE_PREFIX = 'hoot-';

export type PreferenceKey =
    | 'input-mode'
    | 'sidebar-collapsed'
    | 'auto-reconnect'
    | 'history-filter'
    | 'server-sort';

export type InputMode = 'form' | 'json';
export type HistoryFilter = 'all' | 'success' | 'error';
export type ServerSort = 'recent' | 'alphabetical' | 'manual';

type PreferenceValue = {
    'input-mode': InputMode;
    'sidebar-collapsed': boolean;
    'auto-reconnect': boolean;
    'history-filter': HistoryFilter;
    'server-sort': ServerSort;
};

/**
 * Get a preference value from localStorage
 */
export function getPreference<K extends PreferenceKey>(
    key: K,
    defaultValue: PreferenceValue[K]
): PreferenceValue[K] {
    try {
        const stored = localStorage.getItem(`${PREFERENCE_PREFIX}${key}`);
        if (stored === null) {
            return defaultValue;
        }

        // Parse JSON for complex types, return as-is for strings
        try {
            return JSON.parse(stored);
        } catch {
            return stored as PreferenceValue[K];
        }
    } catch (error) {
        console.warn(`Failed to read preference "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Set a preference value in localStorage
 */
export function setPreference<K extends PreferenceKey>(
    key: K,
    value: PreferenceValue[K]
): void {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(`${PREFERENCE_PREFIX}${key}`, stringValue);
    } catch (error) {
        console.error(`Failed to save preference "${key}":`, error);
    }
}

/**
 * Remove a preference from localStorage
 */
export function removePreference(key: PreferenceKey): void {
    try {
        localStorage.removeItem(`${PREFERENCE_PREFIX}${key}`);
    } catch (error) {
        console.error(`Failed to remove preference "${key}":`, error);
    }
}

/**
 * Check if a preference exists
 */
export function hasPreference(key: PreferenceKey): boolean {
    try {
        return localStorage.getItem(`${PREFERENCE_PREFIX}${key}`) !== null;
    } catch {
        return false;
    }
}

