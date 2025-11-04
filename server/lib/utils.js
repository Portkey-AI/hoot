/**
 * Audit Logging Utilities
 * 
 * Provides audit logging for security events.
 * Adapts to environment (file system for Node.js, console for Workers).
 */

import { logger } from './logger.js';

export class AuditLogger {
  constructor(options = {}) {
    this.logPath = options.logPath;
    this.isNode = options.isNode || false;
  }
  
  /**
   * Log an audit event
   * @param {string} event - Event name
   * @param {Object} details - Event details
   */
  async log(event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      ...details
    };
    
    const logLine = JSON.stringify(entry);
    
    if (this.isNode && this.logPath) {
      // Node.js: append to file
      try {
        const { appendFileSync } = await import('fs');
        appendFileSync(this.logPath, logLine + '\n');
      } catch (err) {
        logger.error('Failed to write audit log:', err.message);
      }
    } else {
      // Workers: log to console (Cloudflare captures these)
      logger.verbose('[AUDIT]', logLine);
    }
  }
}

/**
 * Rate Limiter
 * 
 * Simple in-memory rate limiter.
 * For Workers, consider using Durable Objects for distributed rate limiting.
 */
export class RateLimiter {
  constructor(options = {}) {
    this.window = options.window || 60 * 1000; // 1 minute
    this.maxRequests = options.maxRequests || 30; // 30 requests per window
    this.clients = new Map();
  }
  
  /**
   * Check if a client is within rate limits
   * @param {string} clientId - Client identifier
   * @returns {Object} - { allowed: boolean, resetIn?: number }
   */
  check(clientId) {
    const now = Date.now();
    const clientLimit = this.clients.get(clientId);
    
    if (!clientLimit || now > clientLimit.resetTime) {
      this.clients.set(clientId, {
        count: 1,
        resetTime: now + this.window
      });
      return { allowed: true };
    }
    
    if (clientLimit.count >= this.maxRequests) {
      return {
        allowed: false,
        resetIn: Math.ceil((clientLimit.resetTime - now) / 1000)
      };
    }
    
    clientLimit.count++;
    return { allowed: true };
  }
  
  /**
   * Reset rate limit for a client
   * @param {string} clientId - Client identifier
   */
  reset(clientId) {
    this.clients.delete(clientId);
  }
  
  /**
   * Clear all rate limits (maintenance)
   */
  clearAll() {
    this.clients.clear();
  }
}

