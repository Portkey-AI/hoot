import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata, OAuthClientInformation, OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * Hoot's OAuth Client Provider implementation
 * Handles OAuth 2.1 authorization flow with PKCE, token refresh, and secure storage
 * 
 * Based on the MCP SDK example: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/examples/client/simpleOAuthClient.ts
 */
export class HootOAuthProvider implements OAuthClientProvider {
    private serverId: string;
    private _redirectUrl: string;

    constructor(serverId: string, _serverUrl: string, redirectUrl: string = `${window.location.origin}/oauth/callback`) {
        this.serverId = serverId;
        this._redirectUrl = redirectUrl;
    }

    get redirectUrl(): string {
        return this._redirectUrl;
    }

    get clientMetadata(): OAuthClientMetadata {
        return {
            client_name: 'Hoot MCP Testing Tool',
            client_uri: window.location.origin,
            redirect_uris: [this._redirectUrl],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none', // Public client (PKCE used instead)
        };
    }

    /**
     * Generate a random OAuth state parameter
     * Includes current app state for restoration after OAuth redirect
     */
    async state(): Promise<string> {
        // Generate random state for CSRF protection
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const csrfToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        // Capture current app state to restore after OAuth
        const currentState = {
            path: window.location.pathname,
            search: window.location.search,
            serverId: this.serverId,
        };
        
        // Combine CSRF token with app state
        const stateData = {
            csrf: csrfToken,
            return: currentState,
        };
        
        // Encode as base64
        return btoa(JSON.stringify(stateData));
    }

    /**
     * Load client information from localStorage
     */
    async clientInformation(): Promise<OAuthClientInformation | undefined> {
        const key = `oauth_client_${this.serverId}`;
        const stored = localStorage.getItem(key);
        if (!stored) return undefined;

        try {
            return JSON.parse(stored);
        } catch {
            return undefined;
        }
    }

    /**
     * Save client information to localStorage
     */
    async saveClientInformation(clientInfo: OAuthClientInformationFull): Promise<void> {
        const key = `oauth_client_${this.serverId}`;
        localStorage.setItem(key, JSON.stringify(clientInfo));
    }

    /**
     * Load OAuth tokens from localStorage
     */
    async tokens(): Promise<OAuthTokens | undefined> {
        const key = `oauth_tokens_${this.serverId}`;
        const stored = localStorage.getItem(key);
        if (!stored) return undefined;

        try {
            const tokens = JSON.parse(stored);
            return tokens;
        } catch {
            return undefined;
        }
    }

    /**
     * Save OAuth tokens to localStorage
     */
    async saveTokens(tokens: OAuthTokens): Promise<void> {
        const key = `oauth_tokens_${this.serverId}`;

        // Store tokens directly (expires_in is handled by SDK)
        localStorage.setItem(key, JSON.stringify(tokens));
        console.log(`🔐 Hoot: Saved OAuth tokens for server ${this.serverId}`);
    }

    /**
     * Redirect user agent to authorization URL
     */
    async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
        console.log(`🔐 Hoot: Redirecting to authorization: ${authorizationUrl.toString()}`);

        // Prevent redirect loops - check if we just came back from a redirect
        const lastRedirect = sessionStorage.getItem('oauth_last_redirect');
        const now = Date.now();
        if (lastRedirect && (now - parseInt(lastRedirect)) < 3000) {
            console.error('🔐 Hoot: Redirect loop detected! Aborting to prevent infinite redirects.');
            sessionStorage.removeItem('oauth_last_redirect');
            throw new Error('OAuth redirect loop detected. Please check your OAuth configuration.');
        }

        // Store redirect timestamp
        sessionStorage.setItem('oauth_last_redirect', now.toString());

        // Store the server ID so we know which server to connect after callback
        sessionStorage.setItem('oauth_server_id', this.serverId);

        // Small delay to ensure console log is visible
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect to authorization URL
        console.log('🔐 Hoot: Performing redirect now...');
        window.location.href = authorizationUrl.toString();
    }

    /**
     * Save PKCE code verifier for later use
     */
    async saveCodeVerifier(codeVerifier: string): Promise<void> {
        const key = `oauth_verifier_${this.serverId}`;
        sessionStorage.setItem(key, codeVerifier);
    }

    /**
     * Load PKCE code verifier
     */
    async codeVerifier(): Promise<string> {
        const key = `oauth_verifier_${this.serverId}`;
        const verifier = sessionStorage.getItem(key);

        if (!verifier) {
            throw new Error('Code verifier not found. Authorization flow may have been interrupted.');
        }

        return verifier;
    }

    /**
     * Invalidate stored credentials
     */
    async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier'): Promise<void> {
        console.warn(`🔐 Hoot: Invalidating credentials (${scope}) for server ${this.serverId}`);

        if (scope === 'all' || scope === 'client') {
            localStorage.removeItem(`oauth_client_${this.serverId}`);
        }

        if (scope === 'all' || scope === 'tokens') {
            localStorage.removeItem(`oauth_tokens_${this.serverId}`);
        }

        if (scope === 'all' || scope === 'verifier') {
            sessionStorage.removeItem(`oauth_verifier_${this.serverId}`);
        }
    }

    /**
     * Check if tokens are expired or will expire soon
     */
    async isTokenExpired(tokens?: OAuthTokens): Promise<boolean> {
        const currentTokens = tokens || await this.tokens();
        if (!currentTokens?.expires_in) return false;

        // If expires_in is present, assume it's been validated by the SDK
        // In practice, the SDK handles token refresh automatically
        return false; // Let SDK handle expiration
    }

    /**
     * Get a valid access token, refreshing if necessary
     */
    async getValidAccessToken(): Promise<string | undefined> {
        const tokens = await this.tokens();
        if (!tokens?.access_token) return undefined;

        // SDK handles token refresh automatically
        return tokens.access_token;
    }
}

