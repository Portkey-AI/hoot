/**
 * Abstract Connection Pool Interface
 * 
 * Provides a unified API for managing MCP connections across both
 * Node.js and Cloudflare Workers environments.
 * 
 * Node.js: Uses in-memory Map (simple, fast)
 * Workers: Delegates to Durable Object (persistent, stateful)
 */

export class ConnectionPool {
  /**
   * Connect to an MCP server or retrieve existing connection
   * @param {string} serverId - Unique server identifier
   * @param {Object} config - Server configuration
   * @param {Object} options - Connection options (userId, db, frontendUrl, etc.)
   * @returns {Promise<Object>} Connection result
   */
  async connect(serverId, config, options) {
    throw new Error('ConnectionPool.connect() must be implemented by subclass');
  }

  /**
   * Get an existing MCP client
   * @param {string} serverId - Unique server identifier
   * @returns {Promise<Object|null>} MCP client or null
   */
  async getClient(serverId) {
    throw new Error('ConnectionPool.getClient() must be implemented by subclass');
  }

  /**
   * Check if a server is connected
   * @param {string} serverId - Unique server identifier
   * @returns {boolean} True if connected
   */
  has(serverId) {
    throw new Error('ConnectionPool.has() must be implemented by subclass');
  }

  /**
   * Disconnect from a server
   * @param {string} serverId - Unique server identifier
   * @returns {Promise<void>}
   */
  async disconnect(serverId) {
    throw new Error('ConnectionPool.disconnect() must be implemented by subclass');
  }

  /**
   * Get list of connected server IDs
   * @returns {string[]} Array of server IDs
   */
  getConnections() {
    throw new Error('ConnectionPool.getConnections() must be implemented by subclass');
  }

  /**
   * Get number of active connections
   * @returns {number} Connection count
   */
  size() {
    throw new Error('ConnectionPool.size() must be implemented by subclass');
  }

  /**
   * Get a transport for a connected server
   * @param {string} serverId - Unique server identifier
   * @returns {Promise<Object|null>} Transport or null
   */
  async getTransport(serverId) {
    throw new Error('ConnectionPool.getTransport() must be implemented by subclass');
  }
}

