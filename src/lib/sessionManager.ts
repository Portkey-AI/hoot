/**
 * Session Manager
 * Handles anonymous user session persistence using localStorage
 */

const STORAGE_KEY = 'hoot_user_id';

/**
 * Get or create a persistent user ID
 * Generates a UUID on first visit and stores it in localStorage
 * Returns the same UUID on subsequent visits for session persistence
 */
export function getUserId(): string {
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
        // Generate a new UUID v4
        userId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, userId);
        // Only log in development
        if (import.meta.env.DEV) {
            console.log('🆔 Generated new user ID:', userId);
        }
    }
    
    return userId;
}

/**
 * Clear the stored user ID (for testing or logout)
 */
export function clearUserId(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️  Cleared user ID');
}

/**
 * Check if user has an existing session
 */
export function hasExistingSession(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
}

