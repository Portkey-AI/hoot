# OAuth + CORS Proxy Fix

## Problem

When the CORS proxy was enabled, OAuth flows were failing because:

1. The MCP server URL was being wrapped: `https://mcp.linear.app/mcp` → `http://localhost:3001/proxy?target=https://mcp.linear.app/mcp`
2. The proxy's path rewriting was incorrect - it was stripping the `/mcp` path from the target URL
3. Requests were reaching the proxy but getting 404 responses

## Root Cause

The proxy middleware was configured incorrectly:

### Before (Broken)
```javascript
router: (req) => {
  return req.query.target; // Returns full URL: https://mcp.linear.app/mcp
},
pathRewrite: (path) => {
  // path = "/?target=https://mcp.linear.app/mcp"
  // After removing query: "/"
  // ❌ Lost the /mcp path!
  return "/";
}
```

### After (Fixed)
```javascript
router: (req) => {
  // Extract just the origin from target URL
  const url = new URL(req.query.target);
  return `${url.protocol}//${url.host}`; // Returns: https://mcp.linear.app
},
pathRewrite: (path, req) => {
  // Extract the path from the target URL
  const url = new URL(req.query.target);
  return url.pathname + url.search + url.hash; // Returns: /mcp
}
```

## How OAuth Works Now

### 1. Initial Connection (with proxy)
```
Browser → http://localhost:3001/proxy?target=https://mcp.linear.app/mcp
Proxy:
  - router → https://mcp.linear.app
  - pathRewrite → /mcp
→ https://mcp.linear.app/mcp ✓
```

### 2. OAuth Discovery (with proxy)
The MCP server returns OAuth configuration:
```json
{
  "authorization_endpoint": "https://linear.app/oauth/authorize",
  "token_endpoint": "https://mcp.linear.app/oauth/token"
}
```

### 3. OAuth Redirect (direct, no proxy)
```
Browser → https://linear.app/oauth/authorize?client_id=...&redirect_uri=http://localhost:3000/oauth/callback
User logs in
→ http://localhost:3000/oauth/callback?code=ABC123
```

### 4. Token Exchange (with proxy)
```
Browser → http://localhost:3001/proxy?target=https://mcp.linear.app/oauth/token
Proxy:
  - router → https://mcp.linear.app
  - pathRewrite → /oauth/token
→ https://mcp.linear.app/oauth/token ✓
```

### 5. API Calls (with proxy)
```
Browser → http://localhost:3001/proxy?target=https://mcp.linear.app/mcp
Proxy:
  - router → https://mcp.linear.app
  - pathRewrite → /mcp
  - Headers: Authorization: Bearer <token>
→ https://mcp.linear.app/mcp ✓
```

## Key Insights

1. **OAuth Provider Uses Original URL**: The `HootOAuthProvider` is initialized with the original server URL (`https://mcp.linear.app/mcp`), not the proxied one. This is correct because OAuth endpoints are derived from the server's metadata.

2. **Proxy is Transport-Level**: The proxy wrapping happens at the transport level in `mcpClient.ts`. The OAuth provider doesn't know about the proxy.

3. **Path Preservation is Critical**: The proxy must preserve the full path from the target URL, including `/mcp`, `/oauth/token`, etc.

4. **Origin Separation**: The proxy's `router` returns just the origin, and `pathRewrite` provides the path. This allows the proxy middleware to correctly construct the final URL.

## Testing

To test OAuth with proxy:

1. Enable proxy in Hoot UI
2. Add an OAuth-enabled server (e.g., Linear)
3. Click "Connect"
4. Should redirect to OAuth provider
5. After auth, should redirect back to Hoot
6. Should complete token exchange through proxy
7. Should successfully connect and list tools

## Code Changes

### `proxy-server.js`
- Fixed `router` to return only the origin
- Fixed `pathRewrite` to extract path from target URL
- Added better error handling and logging

## Future Considerations

For the Electron app (v1.0), this proxy won't be needed because:
- No browser CORS restrictions
- Can use native HTTP clients
- OAuth redirects work natively
- stdio transport available for local servers

---

**Status**: ✅ Fixed and tested
**Impact**: 🚀 Critical - OAuth now works with proxy
**Complexity**: 🟢 Low - Simple URL parsing fix

