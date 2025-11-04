/**
 * User Data Durable Object
 * 
 * Each user gets their own Durable Object for strong consistency.
 * Stores OAuth tokens, client info, and verifiers per user.
 */

export class UserDataDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // OAuth Tokens
    if (pathname === '/oauth/tokens') {
      if (request.method === 'PUT') {
        const { serverId, tokens } = await request.json();
        await this.state.storage.put(`oauth:tokens:${serverId}`, tokens);
        return new Response('OK', { status: 200 });
      }
      
      if (request.method === 'GET') {
        const serverId = url.searchParams.get('serverId');
        const tokens = await this.state.storage.get(`oauth:tokens:${serverId}`);
        
        if (!tokens) {
          return new Response('Not found', { status: 404 });
        }
        
        return new Response(JSON.stringify(tokens), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // OAuth Client Info
    if (pathname === '/oauth/client-info') {
      if (request.method === 'PUT') {
        const { serverId, clientInfo } = await request.json();
        await this.state.storage.put(`oauth:client-info:${serverId}`, clientInfo);
        return new Response('OK', { status: 200 });
      }
      
      if (request.method === 'GET') {
        const serverId = url.searchParams.get('serverId');
        const clientInfo = await this.state.storage.get(`oauth:client-info:${serverId}`);
        
        if (!clientInfo) {
          return new Response('Not found', { status: 404 });
        }
        
        return new Response(JSON.stringify(clientInfo), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // OAuth Verifiers
    if (pathname === '/oauth/verifier') {
      if (request.method === 'PUT') {
        const { serverId, verifier } = await request.json();
        await this.state.storage.put(`oauth:verifier:${serverId}`, {
          verifier,
          createdAt: Date.now()
        });
        return new Response('OK', { status: 200 });
      }
      
      if (request.method === 'GET') {
        const serverId = url.searchParams.get('serverId');
        const data = await this.state.storage.get(`oauth:verifier:${serverId}`);
        
        if (!data) {
          return new Response('Not found', { status: 404 });
        }
        
        // Check if verifier is expired (>10 minutes old)
        const age = Date.now() - data.createdAt;
        if (age > 10 * 60 * 1000) {
          await this.state.storage.delete(`oauth:verifier:${serverId}`);
          return new Response('Expired', { status: 404 });
        }
        
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (request.method === 'DELETE') {
        const serverId = url.searchParams.get('serverId');
        await this.state.storage.delete(`oauth:verifier:${serverId}`);
        return new Response('OK', { status: 200 });
      }
    }
    
    // Clear OAuth credentials
    if (pathname === '/oauth/clear' && request.method === 'POST') {
      const { serverId, scope } = await request.json();
      
      if (scope === 'all' || scope === 'client') {
        await this.state.storage.delete(`oauth:client-info:${serverId}`);
      }
      
      if (scope === 'all' || scope === 'tokens') {
        await this.state.storage.delete(`oauth:tokens:${serverId}`);
      }
      
      if (scope === 'all' || scope === 'verifier') {
        await this.state.storage.delete(`oauth:verifier:${serverId}`);
      }
      
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Not found', { status: 404 });
  }
}

