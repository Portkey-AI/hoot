/**
 * JWT Utilities
 * 
 * Handles JWT generation and validation for both Node.js and Workers.
 * Works with both 'jose' (ES modules) and 'jsonwebtoken' (CommonJS).
 */

export class JWTManager {
  constructor() {
    this.privateKey = null;
    this.kid = null;
    this.publicKeys = new Map();
  }
  
  /**
   * Initialize JWT keys from configuration
   * @param {Object} config - { privateKeyJwk, jwks }
   */
  async initialize(config) {
    try {
      const { privateKeyJwk, jwks } = config;
      
      // Import jose for JWT signing
      const { importJWK, SignJWT } = await import('jose');
      
      this.privateKey = await importJWK(privateKeyJwk, 'RS256');
      this.kid = jwks.keys[0].kid;
      
      // Convert JWKs to PEM format for validation
      // Dynamic import to avoid loading jsonwebtoken in Workers if not needed
      try {
        const jwkToPem = (await import('jwk-to-pem')).default;
        jwks.keys.forEach(key => {
          const pem = jwkToPem(key);
          this.publicKeys.set(key.kid, pem);
        });
      } catch (err) {
        // If jwk-to-pem not available (Workers), store JWKs directly
        jwks.keys.forEach(key => {
          this.publicKeys.set(key.kid, key);
        });
      }
      
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
      // Try using jsonwebtoken (Node.js)
      const jwt = await import('jsonwebtoken');
      
      const decoded = jwt.default.decode(token, { complete: true });
      
      if (!decoded || !decoded.header.kid) {
        return null;
      }
      
      const publicKey = this.publicKeys.get(decoded.header.kid);
      if (!publicKey) {
        return null;
      }
      
      const payload = jwt.default.verify(token, publicKey, { algorithms: ['RS256'] });
      return payload;
    } catch (jwtError) {
      // Try using jose (Workers)
      try {
        const { jwtVerify } = await import('jose');
        
        // Decode to get kid
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const header = JSON.parse(atob(parts[0]));
        if (!header.kid) return null;
        
        const jwk = this.publicKeys.get(header.kid);
        if (!jwk) return null;
        
        // If it's a PEM, we need to reconstruct the JWK (shouldn't happen in Workers)
        // If it's a JWK object, use it directly
        if (typeof jwk === 'string') {
          throw new Error('PEM format not supported in Workers');
        }
        
        const { importJWK } = await import('jose');
        const publicKey = await importJWK(jwk, 'RS256');
        
        const { payload } = await jwtVerify(token, publicKey, {
          algorithms: ['RS256']
        });
        
        return payload;
      } catch (joseError) {
        // JWT verification failed - this is expected for invalid/expired tokens
        return null;
      }
    }
  }
  
  isInitialized() {
    return this.privateKey !== null && this.kid !== null;
  }
}

