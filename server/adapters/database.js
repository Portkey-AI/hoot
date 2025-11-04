/**
 * Database Adapter Interface
 * 
 * Abstract base class that defines the database operations needed by Hoot.
 * Implementations:
 * - SQLiteAdapter: For self-hosted Node.js deployments
 * - DurableObjectsAdapter: For Cloudflare Workers deployments
 */

export class DatabaseAdapter {
    // OAuth Tokens
    async saveOAuthTokens(userId, serverId, tokens) {
        throw new Error('Not implemented: saveOAuthTokens');
    }

    async getOAuthTokens(userId, serverId) {
        throw new Error('Not implemented: getOAuthTokens');
    }

    // OAuth Client Info
    async saveOAuthClientInfo(userId, serverId, clientInfo) {
        throw new Error('Not implemented: saveOAuthClientInfo');
    }

    async getOAuthClientInfo(userId, serverId) {
        throw new Error('Not implemented: getOAuthClientInfo');
    }

    // OAuth Verifiers (PKCE)
    async saveVerifier(userId, serverId, verifier) {
        throw new Error('Not implemented: saveVerifier');
    }

    async getVerifier(userId, serverId) {
        throw new Error('Not implemented: getVerifier');
    }

    async deleteVerifier(userId, serverId) {
        throw new Error('Not implemented: deleteVerifier');
    }

    async cleanupOldVerifiers() {
        throw new Error('Not implemented: cleanupOldVerifiers');
    }

    // Clear OAuth credentials (for logout/reconnect)
    async clearOAuthCredentials(userId, serverId, scope = 'all') {
        throw new Error('Not implemented: clearOAuthCredentials');
    }

    // Favicon Cache (global, not user-specific)
    async saveFaviconCache(serverUrl, faviconUrl, oauthLogoUri) {
        throw new Error('Not implemented: saveFaviconCache');
    }

    async getFaviconCache(serverUrl, oauthLogoUri) {
        throw new Error('Not implemented: getFaviconCache');
    }

    // Cleanup/maintenance
    async close() {
        // Optional: cleanup resources
    }
}

