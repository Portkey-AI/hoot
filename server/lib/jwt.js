/**
 * JWT Utilities
 * 
 * Handles JWT generation and validation for both Node.js and Workers.
 * Uses 'jose' library exclusively (works in both environments).
 */

export class JWTManager {
  constructor() {
    this.privateKey = null;
    this.kid = null;
    this.publicKeys = new Map(); // Stores JWKs
  }

  /**
   * Initialize JWT keys from configuration
   * @param {Object} config - { privateKeyJwk, jwks }
   */
  async initialize(config) {
    try {
      const { privateKeyJwk, jwks } = config;

      // Import jose for JWT operations (works in both Node.js and Workers)
      const { importJWK } = await import('jose');

      this.privateKey = await importJWK(privateKeyJwk, 'RS256');
      this.kid = jwks.keys[0].kid;

      // Store JWKs directly - jose can use them in both environments
      jwks.keys.forEach(key => {
        this.publicKeys.set(key.kid, key);
      });

      return { success: true, kid: this.kid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a JWT token for a user
   * @param {string} userId - User ID (UUID v4)
   * @param {Object} options - { portkeyOrgId, portkeyWorkspace, expiresIn }
   */
  async generateToken(userId, options = {}) {
    if (!this.privateKey || !this.kid) {
      throw new Error('JWT keys not initialized');
    }

    const { SignJWT } = await import('jose');
    const now = Math.floor(Date.now() / 1000);

    const {
      portkeyOrgId = 'test-org-id',
      portkeyWorkspace = 'test-workspace',
      expiresIn = 3600 // 1 hour
    } = options;

    const token = await new SignJWT({
      // Hoot backend claims (for MCP operations)
      sub: userId,

      // Portkey claims (for AI completions)
      portkey_oid: portkeyOrgId,
      portkey_workspace: portkeyWorkspace,
      scope: ['completions.write', 'virtual_keys.list', 'logs.view'],
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid, typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(this.privateKey);

    return token;
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded payload or null
   */
  async verifyToken(token) {
    if (this.publicKeys.size === 0) {
      throw new Error('JWT public keys not loaded');
    }

    try {
      const { jwtVerify, importJWK } = await import('jose');

      // Decode to get kid from header
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const header = JSON.parse(atob(parts[0]));
      if (!header.kid) return null;

      const jwk = this.publicKeys.get(header.kid);
      if (!jwk) return null;

      // Import the JWK as a public key
      const publicKey = await importJWK(jwk, 'RS256');

      // Verify the token
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: ['RS256']
      });

      return payload;
    } catch (error) {
      // JWT verification failed (invalid/expired/malformed)
      console.error('JWT verification failed:', error.message);
      return null;
    }
  }

  isInitialized() {
    return this.privateKey !== null && this.kid !== null;
  }
}

