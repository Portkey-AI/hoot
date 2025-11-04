/**
 * Favicon Cache Durable Object
 * 
 * Global singleton for caching favicon URLs.
 * Shared across all users to reduce external requests.
 */

export class FaviconCacheDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    if (pathname === '/favicon') {
      if (request.method === 'PUT') {
        const { serverUrl, faviconUrl, oauthLogoUri } = await request.json();
        
        const cacheKey = oauthLogoUri 
          ? `${serverUrl}:${oauthLogoUri}`
          : serverUrl;
        
        await this.state.storage.put(`favicon:${cacheKey}`, {
          faviconUrl,
          cachedAt: Date.now()
        });
        
        return new Response('OK', { status: 200 });
      }
      
      if (request.method === 'GET') {
        const serverUrl = url.searchParams.get('serverUrl');
        const oauthLogoUri = url.searchParams.get('oauthLogoUri');
        
        const cacheKey = oauthLogoUri 
          ? `${serverUrl}:${oauthLogoUri}`
          : serverUrl;
        
        const data = await this.state.storage.get(`favicon:${cacheKey}`);
        
        if (!data) {
          return new Response('Not found', { status: 404 });
        }
        
        // Check if cache is expired (>24 hours old)
        const age = Date.now() - data.cachedAt;
        const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > CACHE_TTL) {
          await this.state.storage.delete(`favicon:${cacheKey}`);
          return new Response('Expired', { status: 404 });
        }
        
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Not found', { status: 404 });
  }
}

