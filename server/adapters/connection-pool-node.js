/**
 * Node.js Connection Pool Implementation
 * 
 * Uses a simple in-memory Map to store MCP connections.
 * Works in Node.js where memory persists across requests.
 */

import { ConnectionPool } from '../lib/connection-pool.js';
import { connectToServer } from '../lib/handlers.js';

export class NodeConnectionPool extends ConnectionPool {
  constructor() {
    super();
    // In-memory storage of active connections
    this.connections = new Map();
    // Map<serverId, {
    //   client: MCPClient,
    //   transport: Transport,
    //   config: { serverName, url, transport, auth },
    //   connectedAt: timestamp,
    //   lastUsed: timestamp
    // }>
  }

  async connect(serverId, config, options) {
    // Check if already connected
    if (this.connections.has(serverId)) {
      const conn = this.connections.get(serverId);
      conn.lastUsed = Date.now();
      return { success: true, serverId, reused: true };
    }

    // Connect using shared handler logic
    const result = await connectToServer({
      serverId,
      serverName: config.serverName,
      url: config.url,
      transport: config.transport,
      auth: config.auth,
      ...options,
      clientManager: this // Pass self as client manager
    });

    return result;
  }

  // Implement MCPClientManager interface for compatibility
  set(serverId, client, transport) {
    this.connections.set(serverId, {
      client,
      transport,
      connectedAt: Date.now(),
      lastUsed: Date.now()
    });
  }

  async getClient(serverId) {
    const conn = this.connections.get(serverId);
    if (conn) {
      conn.lastUsed = Date.now();
      return conn.client;
    }
    return null;
  }

  has(serverId) {
    return this.connections.has(serverId);
  }

  async disconnect(serverId) {
    const conn = this.connections.get(serverId);
    if (conn && conn.client) {
      try {
        await conn.client.close();
      } catch (err) {
        console.error(`Failed to close client ${serverId}:`, err);
      }
    }
    this.connections.delete(serverId);
  }

  getConnections() {
    return Array.from(this.connections.keys());
  }

  size() {
    return this.connections.size;
  }

  async getTransport(serverId) {
    const conn = this.connections.get(serverId);
    if (conn) {
      conn.lastUsed = Date.now();
      return conn.transport;
    }
    return null;
  }

  /**
   * Clean up stale connections (optional - can be called periodically)
   */
  async cleanupStaleConnections(maxIdleMs = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [serverId, conn] of this.connections) {
      if (now - conn.lastUsed > maxIdleMs) {
        await this.disconnect(serverId);
        console.log(`Cleaned up stale connection: ${serverId}`);
      }
    }
  }
}

