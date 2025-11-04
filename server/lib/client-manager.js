/**
 * MCP Client Management
 * 
 * Manages active MCP client connections.
 * This needs to be in-memory as MCP clients/transports can't be serialized.
 */

import { createLogger } from './logger.js';

const log = createLogger('ClientManager');

export class MCPClientManager {
  constructor() {
    // serverId -> MCP Client instance
    this.clients = new Map();
    
    // serverId -> Transport instance
    this.transports = new Map();
  }
  
  /**
   * Store a client and transport
   */
  set(serverId, client, transport) {
    this.clients.set(serverId, client);
    this.transports.set(serverId, transport);
  }
  
  /**
   * Get a client by serverId
   */
  getClient(serverId) {
    return this.clients.get(serverId);
  }
  
  /**
   * Get a transport by serverId
   */
  getTransport(serverId) {
    return this.transports.get(serverId);
  }
  
  /**
   * Check if a server is connected
   */
  has(serverId) {
    return this.clients.has(serverId);
  }
  
  /**
   * Remove a client and transport
   */
  async disconnect(serverId) {
    const client = this.clients.get(serverId);
    
    if (client) {
      try {
        await client.close();
      } catch (err) {
        log.error(`Failed to close client ${serverId}:`, err);
      }
      this.clients.delete(serverId);
    }
    
    this.transports.delete(serverId);
  }
  
  /**
   * Disconnect all clients
   */
  async disconnectAll() {
    log.info('Disconnecting all servers...');
    const disconnectPromises = Array.from(this.clients.keys()).map(serverId =>
      this.disconnect(serverId).catch(err =>
        log.error(`Failed to disconnect ${serverId}:`, err)
      )
    );
    await Promise.all(disconnectPromises);
    log.success('All servers disconnected');
  }
  
  /**
   * Get list of connected server IDs
   */
  getConnections() {
    return Array.from(this.clients.keys());
  }
  
  /**
   * Get number of active connections
   */
  size() {
    return this.clients.size;
  }
}

