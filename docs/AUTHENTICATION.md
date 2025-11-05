# 🔐 Authentication in Hoot

Hoot supports multiple authentication methods for connecting to MCP servers, as specified in the MCP protocol.

> **For Developers:** See [JWT Authentication](JWT_AUTHENTICATION.md) for the backend authentication architecture.

## Supported Authentication Types

### 1. **None** (Default)
No authentication required. Use this for:
- Local development servers
- Public MCP servers
- Servers behind a firewall

**Configuration**: Just select "None" in the authentication dropdown.

---

### 2. **Header-Based Authentication** 🔑

Send custom headers with every request. Perfect for:
- API key authentication
- Bearer tokens
- Custom authentication schemes

**How to Use**:
1. Select "Headers" in the authentication dropdown
2. Enter **Header Name** (e.g., `Authorization`, `X-API-Key`)
3. Enter **Header Value** (e.g., `Bearer sk-abc123`, `your-api-key`)

**Examples**:

#### Bearer Token
```
Header Name:  Authorization
Header Value: Bearer sk-1234567890abcdef
```

#### API Key
```
Header Name:  X-API-Key
Header Value: your-secret-api-key-here
```

#### Custom Header
```
Header Name:  X-Custom-Auth
Header Value: custom-value-123
```

**How It Works**:
- Hoot adds your header to every HTTP request
- Works with both SSE and HTTP transports
- Headers are stored securely in localStorage (encrypted storage coming in v0.2)

---

### 3. **OAuth 2.1** 🌐

**FULLY SUPPORTED IN v0.2!** OAuth authentication with complete authorization flow, PKCE, and automatic token refresh.

**How to Use**:
1. Select "OAuth" in the authentication dropdown
2. **Option A - Automatic Flow** (Recommended):
   - Leave access token empty
   - Click "Connect"
   - Hoot will discover OAuth endpoints automatically
   - You'll be redirected to the authorization page
   - Authorize the application
   - You'll be redirected back to Hoot
   - Tokens are saved automatically

3. **Option B - Manual Token**:
   - Obtain an access token from your OAuth provider
   - Enter the **Access Token** in the field
   - Click "Connect"

**Full Features** (v0.2):
- ✅ OAuth 2.1 authorization code flow
- ✅ PKCE (Proof Key for Code Exchange)
- ✅ Automatic token refresh
- ✅ Token storage (localStorage)
- ✅ Authorization discovery
- ✅ Redirect handling
- ✅ Token expiration management

**How It Works**:
1. Hoot creates an `OAuthClientProvider` for your server
2. Discovers OAuth endpoints (via `.well-known/oauth-authorization-server`)
3. Generates PKCE code challenge
4. Redirects to authorization URL
5. Receives authorization code via callback
6. Exchanges code for access & refresh tokens
7. Stores tokens securely
8. Automatically refreshes when expired
9. Includes tokens in all requests

**Based on**: [MCP SDK OAuth Example](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/examples/client/simpleOAuthClient.ts)

---

## Security Considerations

### 🔒 Storage
- **v0.1**: Auth credentials stored in localStorage (browser local storage)
- **Coming**: Encrypted storage with master password option

### 🛡️ Best Practices
1. **Never share your tokens** - Treat them like passwords
2. **Use short-lived tokens** - Refresh tokens frequently
3. **Different tokens per environment** - Dev/staging/prod
4. **Monitor token usage** - Revoke unused tokens
5. **Use HTTPS** - Always connect over secure connections

### ⚠️ Important Notes
- Tokens are stored **locally** in your browser
- Clearing browser data will **delete** saved tokens
- Tokens are **not** sent to Hoot servers (Hoot is client-side only)
- For production, consider using OAuth with automatic refresh

---

## Usage Examples

### Example 1: API Key Auth
```
Server Name: My MCP Server
URL: https://api.example.com/mcp
Transport: HTTP
Authentication: Headers
  Header Name: X-API-Key
  Header Value: sk-proj-abcd1234...
```

### Example 2: Bearer Token
```
Server Name: Authenticated Server
URL: https://secure-mcp.example.com
Transport: SSE
Authentication: Headers
  Header Name: Authorization
  Header Value: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Example 3: OAuth (Manual Token)
```
Server Name: OAuth Server
URL: https://oauth-mcp.example.com
Transport: HTTP
Authentication: OAuth
  Access Token: ya29.a0AfB_byC...
```

---

## Testing Authentication

### 1. **Add Server with Auth**
- Click "+ Add Server"
- Configure URL and transport
- Select authentication type
- Enter credentials
- Click "Connect"

### 2. **Test Connection**
- Look for green status dot (connected)
- Check for errors in the sidebar
- Browse available tools
- Execute a test tool

### 3. **Common Issues**

**❌ 401 Unauthorized**
- Check your token/API key is correct
- Verify token hasn't expired
- Ensure header name is correct

**❌ 403 Forbidden**
- Check token has required permissions
- Verify API key has access to the resource
- Check server-side authorization rules

**❌ CORS Errors**
- Server must allow cross-origin requests
- Custom headers may trigger preflight requests
- See CORS.md for solutions

---

## SDK Integration

Hoot uses the official MCP SDK's auth system:

### Header Auth
```typescript
// SSE Transport
const transport = new SSEClientTransport(url, {
  requestInit: {
    headers: {
      'X-API-Key': 'your-key',
    },
  },
});

// HTTP Transport
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: {
    headers: {
      'Authorization': 'Bearer token',
    },
  },
});
```

### OAuth Auth (Coming in v0.2)
```typescript
// Full OAuth flow with automatic refresh
const authProvider: OAuthClientProvider = {
  // ... implementation
};

const transport = new StreamableHTTPClientTransport(url, {
  authProvider,
});
```

---

## Roadmap

### v0.1 (Current) ✅
- [x] No authentication
- [x] Header-based authentication
- [x] OAuth (manual token input)

### v0.2 (Planned)
- [ ] Full OAuth 2.1 flow
- [ ] Automatic token refresh
- [ ] PKCE support
- [ ] Token expiration warnings
- [ ] Encrypted credential storage
- [ ] OAuth Client Credentials flow

### v0.3 (Future)
- [ ] mTLS support
- [ ] Certificate management
- [ ] Token vault integration
- [ ] Multi-factor authentication
- [ ] SSO support

---

## FAQ

**Q: Are my credentials secure?**  
A: In v0.1, credentials are stored in browser localStorage. Use HTTPS and short-lived tokens. Encrypted storage coming in v0.2.

**Q: Can I use OAuth Client Credentials?**  
A: Not yet. v0.1 supports manual token input. Full OAuth flows coming in v0.2.

**Q: What if my token expires?**  
A: v0.1 requires manual token refresh. Automatic refresh coming in v0.2.

**Q: Can I use multiple headers?**  
A: Not in the UI yet, but you can edit the server config in localStorage to add multiple headers.

**Q: Does Hoot send my credentials anywhere?**  
A: No! Hoot is 100% client-side. Credentials are only sent to **your configured MCP server**.

---

**Authentication makes Hoot production-ready!** 🦉🔐


