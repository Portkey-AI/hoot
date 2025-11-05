/**
 * Workers Connection Pool Implementation
 * 
 * Proxies all operations to a Durable Object that maintains
 * persistent MCP connections.
 */

import { ConnectionPool } from '../lib/connection-pool.js';

export class WorkersConnectionPool extends ConnectionPool {
  constructor(env, userId) {
    super();
    this.env = env;
    this.userId = userId;
  }

  getPoolStub() {
    // Each user gets their own connection pool DO
    const id = this.env.MCP_CONNECTION_POOL.idFromName(this.userId);
    return this.env.MCP_CONNECTION_POOL.get(id);
  }

  async connect(serverId, config, options) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, config, options })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Connection failed');
    }

    return await response.json();
  }

  async getClient(serverId) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/get-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });

    const data = await response.json();
    // Return a proxy object that delegates operations to the DO
    return data.has ? { _doProxy: true, _serverId: serverId, _stub: stub } : null;
  }

  has(serverId) {
    // This needs to be sync, so we can't call DO
    // We'll handle this differently in the handlers
    return false; // Will trigger reconnect if needed
  }

  async hasAsync(serverId) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/has', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });

    const data = await response.json();
    return data.has;
  }

  async disconnect(serverId) {
    const stub = this.getPoolStub();
    await stub.fetch('https://do/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });
  }

  async getConnections() {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/connections');

    const data = await response.json();
    return data.connections;
  }

  async size() {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/size');

    const data = await response.json();
    return data.size;
  }

  async getTransport(serverId) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/get-transport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });

    const data = await response.json();
    if (!data.has) return null;

    // Return a proxy that can get metadata
    return {
      _doProxy: true,
      authServerMetadata: data.metadata
    };
  }

  // Proxy methods for MCP operations
  async listTools(serverId) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/list-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list tools');
    }

    return await response.json();
  }

  async executeTool(serverId, toolName, args) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/execute-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, toolName, arguments: args })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Tool execution failed');
    }

    return await response.json();
  }

  async getServerVersion(serverId) {
    const stub = this.getPoolStub();
    const response = await stub.fetch('https://do/get-server-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId })
    });

    const data = await response.json();
    return data.has ? data.serverVersion : null;
  }

  // Implement MCPClientManager interface for compatibility
  set(serverId, client, transport) {
    // Not used in Workers - connections are managed by DO
    // This is called by connectToServer but we handle it differently
  }
}

