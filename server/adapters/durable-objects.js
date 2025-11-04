/**
 * Durable Objects Database Adapter
 * 
 * For Cloudflare Workers deployments.
 * Uses Durable Objects for strong consistency and low latency.
 */

import { DatabaseAdapter } from './database.js';

export class DurableObjectsAdapter extends DatabaseAdapter {
  constructor(env) {
    super();
    this.env = env;
  }
  
  getUserStub(userId) {
    const id = this.env.USER_DATA.idFromName(userId);
    return this.env.USER_DATA.get(id);
  }
  
  getFaviconStub() {
    // Global favicon cache uses a single DO
    const id = this.env.FAVICON_CACHE.idFromName('global');
    return this.env.FAVICON_CACHE.get(id);
  }
  
  // OAuth Tokens
  async saveOAuthTokens(userId, serverId, tokens) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch('https://do/oauth/tokens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, tokens })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save OAuth tokens: ${await response.text()}`);
    }
  }
  
  async getOAuthTokens(userId, serverId) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch(`https://do/oauth/tokens?serverId=${serverId}`);
    
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to get OAuth tokens: ${await response.text()}`);
    }
    
    return await response.json();
  }
  
  // OAuth Client Info
  async saveOAuthClientInfo(userId, serverId, clientInfo) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch('https://do/oauth/client-info', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, clientInfo })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save OAuth client info: ${await response.text()}`);
    }
  }
  
  async getOAuthClientInfo(userId, serverId) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch(`https://do/oauth/client-info?serverId=${serverId}`);
    
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to get OAuth client info: ${await response.text()}`);
    }
    
    return await response.json();
  }
  
  // OAuth Verifiers
  async saveVerifier(userId, serverId, verifier) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch('https://do/oauth/verifier', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, verifier })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save verifier: ${await response.text()}`);
    }
  }
  
  async getVerifier(userId, serverId) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch(`https://do/oauth/verifier?serverId=${serverId}`);
    
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to get verifier: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.verifier;
  }
  
  async deleteVerifier(userId, serverId) {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch(`https://do/oauth/verifier?serverId=${serverId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete verifier: ${await response.text()}`);
    }
  }
  
  async cleanupOldVerifiers() {
    // Durable Objects automatically clean up old verifiers
    // See user-data-do.js implementation
  }
  
  // Clear OAuth credentials
  async clearOAuthCredentials(userId, serverId, scope = 'all') {
    const stub = this.getUserStub(userId);
    const response = await stub.fetch('https://do/oauth/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, scope })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear OAuth credentials: ${await response.text()}`);
    }
  }
  
  // Favicon Cache
  async saveFaviconCache(serverUrl, faviconUrl, oauthLogoUri = null) {
    const stub = this.getFaviconStub();
    const response = await stub.fetch('https://do/favicon', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl, faviconUrl, oauthLogoUri })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save favicon cache: ${await response.text()}`);
    }
  }
  
  async getFaviconCache(serverUrl, oauthLogoUri = null) {
    const stub = this.getFaviconStub();
    const params = new URLSearchParams({ serverUrl });
    if (oauthLogoUri) params.set('oauthLogoUri', oauthLogoUri);
    
    const response = await stub.fetch(`https://do/favicon?${params}`);
    
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to get favicon cache: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.faviconUrl;
  }
}

