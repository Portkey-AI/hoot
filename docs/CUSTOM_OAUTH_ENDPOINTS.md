# Custom OAuth Endpoints in Hoot 🔧

## Overview

Hoot supports **custom OAuth endpoints** for OAuth 2.1 authentication. This feature allows you to manually specify authorization and token endpoints instead of relying on automatic discovery (RFC 8414).

## When to Use Custom Endpoints

Use custom OAuth endpoints when:

1. **No Auto-Discovery Support**: The OAuth provider doesn't support RFC 8414 `.well-known/oauth-authorization-server` discovery
2. **Legacy OAuth Implementations**: Working with older OAuth servers with non-standard endpoint locations
3. **Custom Authorization Servers**: Using a proprietary or custom OAuth implementation
4. **Testing**: Testing with mock OAuth servers or local OAuth implementations
5. **Non-Standard Paths**: OAuth endpoints are at unusual URL paths

## How to Configure

### Via UI

1. **Add/Edit Server**:
   - Select "OAuth" as authentication type
   - Click "**Advanced OAuth Options**" to expand the custom endpoint fields

2. **Enter Custom Endpoints**:
   - **Authorization Endpoint** (required): Full URL where users authorize
     - Example: `https://auth.example.com/oauth/authorize`
   - **Token Endpoint** (required): Full URL where tokens are exchanged
     - Example: `https://auth.example.com/oauth/token`
   - **Custom Client ID** (optional): Pre-registered client ID if required
     - Example: `hoot-client-123`

3. **Connect**:
   - Click "Connect"
   - Hoot will use your custom endpoints instead of auto-discovery
   - You'll be redirected to your custom authorization endpoint
   - Complete the OAuth flow normally

### Via Try in Hoot Link

You can also pre-configure custom OAuth endpoints in shareable Try in Hoot links:

```html
<a href="https://hoot.dev?server={
  \"url\": \"https://api.example.com/mcp\",
  \"name\": \"Custom OAuth Server\",
  \"transport\": \"http\",
  \"auth\": {
    \"type\": \"oauth\",
    \"customOAuthMetadata\": {
      \"authorization_endpoint\": \"https://auth.example.com/oauth/authorize\",
      \"token_endpoint\": \"https://auth.example.com/oauth/token\",
      \"client_id\": \"hoot-client-123\"
    }
  }
}">
  Try in Hoot
</a>
```

## How It Works

### Backend Implementation

When custom OAuth metadata is provided:

1. **OAuth Provider Creation**: The custom metadata is attached to the OAuth provider
2. **Fetch Interception**: A custom fetch function is injected that intercepts metadata discovery requests
3. **Metadata Override**: When the MCP SDK tries to discover endpoints, the custom fetch returns your custom metadata
4. **Normal OAuth Flow**: The rest of the OAuth flow proceeds normally with your custom endpoints

### Architecture

```
┌─────────────┐
│   Frontend  │
│  (UI Form)  │
└──────┬──────┘
       │ customOAuthMetadata
       ▼
┌─────────────────────────────┐
│   Backend Handlers          │
│  (handlers.js)              │
│  - createOAuthProvider()    │
│  - Custom fetch injection   │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   MCP SDK Transport         │
│  - SSEClientTransport       │
│  - StreamableHTTPTransport  │
│  - Uses custom fetch        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   OAuth Flow                │
│  - Discovery (intercepted)  │
│  - Authorization (custom)   │
│  - Token exchange (custom)  │
└─────────────────────────────┘
```

### Code Flow

1. **Frontend** → `ServerConfigForm.tsx`
   - Collects custom endpoints from UI
   - Stores in `config.auth.customOAuthMetadata`

2. **Backend** → `server/lib/handlers.js`
   - `createOAuthProvider()` accepts `customOAuthMetadata`
   - Attaches metadata to provider
   - Creates custom fetch function if metadata present

3. **Transport Options** → Custom Fetch Injection
   ```javascript
   transportOptions.fetch = async (input, init) => {
     const urlStr = input instanceof URL ? input.href : input.toString();
     
     // Intercept metadata discovery
     if (urlStr.includes('/.well-known/oauth-authorization-server')) {
       return new Response(JSON.stringify(customMetadata), {
         status: 200,
         headers: { 'Content-Type': 'application/json' }
       });
     }
     
     // Pass through all other requests
     return originalFetch(input, init);
   };
   ```

4. **MCP SDK** → Uses Custom Endpoints
   - SDK calls `discoverAuthorizationServerMetadata()`
   - Custom fetch intercepts and returns custom metadata
   - OAuth flow proceeds with custom endpoints

## Configuration Format

### Minimal Configuration

Only authorization and token endpoints are required:

```json
{
  "authorization_endpoint": "https://auth.example.com/oauth/authorize",
  "token_endpoint": "https://auth.example.com/oauth/token"
}
```

### Full Configuration

All supported fields:

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/oauth/authorize",
  "token_endpoint": "https://auth.example.com/oauth/token",
  "client_id": "hoot-client-123",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "none"
}
```

### Field Descriptions

- `authorization_endpoint` **(required)**: Full URL for user authorization
- `token_endpoint` **(required)**: Full URL for token exchange
- `issuer` (optional): OAuth issuer identifier (defaults to server origin)
- `client_id` (optional): Pre-registered client ID
- `response_types_supported` (optional): Supported response types (defaults to `["code"]`)
- `grant_types_supported` (optional): Supported grant types (defaults to `["authorization_code", "refresh_token"]`)
- `token_endpoint_auth_method` (optional): Client authentication method (defaults to `"none"`)

## Examples

### Example 1: Legacy OAuth Server

```javascript
{
  "url": "https://api.legacy.com/mcp",
  "name": "Legacy MCP Server",
  "transport": "http",
  "auth": {
    "type": "oauth",
    "customOAuthMetadata": {
      "authorization_endpoint": "https://legacy.com/oauth/authorize",
      "token_endpoint": "https://legacy.com/oauth/token"
    }
  }
}
```

### Example 2: Corporate OAuth

```javascript
{
  "url": "https://internal-mcp.company.com/api",
  "name": "Internal MCP Server",
  "transport": "sse",
  "auth": {
    "type": "oauth",
    "customOAuthMetadata": {
      "authorization_endpoint": "https://sso.company.com/authorize",
      "token_endpoint": "https://sso.company.com/token",
      "client_id": "mcp-client-prod"
    }
  }
}
```

### Example 3: Development/Testing

```javascript
{
  "url": "http://localhost:3000/mcp",
  "name": "Local Test Server",
  "transport": "http",
  "auth": {
    "type": "oauth",
    "customOAuthMetadata": {
      "authorization_endpoint": "http://localhost:8080/oauth/authorize",
      "token_endpoint": "http://localhost:8080/oauth/token"
    }
  }
}
```

## Validation

Hoot validates custom OAuth endpoints:

- ✅ Both authorization and token endpoints must be provided
- ✅ Endpoints must be valid HTTP/HTTPS URLs
- ✅ If only one endpoint is provided, auto-discovery will be used instead
- ✅ Custom metadata takes precedence over auto-discovery

## Logging

When custom endpoints are used, you'll see logs in the backend:

```
🔧 Using custom OAuth endpoints for MyServer:
   Authorization: https://auth.example.com/oauth/authorize
   Token: https://auth.example.com/oauth/token
```

When metadata discovery is intercepted:

```
🔧 Intercepting OAuth metadata discovery, returning custom endpoints
```

## Compatibility

### Supported

- ✅ Node.js backend (`server-node.js`)
- ✅ Cloudflare Workers backend (`server-worker.js`)
- ✅ Durable Objects (`mcp-connection-pool-do.js`)
- ✅ SSE transport
- ✅ HTTP transport

### Requirements

- MCP SDK version 0.5.0 or higher
- Both authorization and token endpoints must support OAuth 2.1
- PKCE is required (Hoot uses PKCE for all OAuth flows)

## Troubleshooting

### Issue: Custom endpoints not being used

**Symptoms**: OAuth flow still tries auto-discovery

**Solutions**:
1. Verify both authorization and token endpoints are provided
2. Check backend logs for "Using custom OAuth endpoints" message
3. Ensure URLs are complete (include https://)
4. Clear OAuth tokens and try reconnecting

### Issue: OAuth flow fails immediately

**Symptoms**: Error during OAuth initialization

**Solutions**:
1. Verify endpoints are accessible
2. Check that endpoints support OAuth 2.1
3. Ensure PKCE is supported by your OAuth server
4. Verify client ID if pre-registered

### Issue: Token exchange fails

**Symptoms**: Authorization succeeds but token exchange fails

**Solutions**:
1. Verify token endpoint URL is correct
2. Check that token endpoint accepts PKCE
3. Ensure redirect URI matches Hoot's callback URL
4. Check OAuth server logs for error details

## Testing

Run the test suite to verify custom OAuth endpoints:

```bash
node tests/test-custom-oauth.js
```

Expected output:
```
✅ All tests passed!

📝 Summary:
   - Custom OAuth metadata is properly accepted
   - Metadata is attached to the OAuth provider
   - Provider works with and without custom metadata
   - All standard OAuth methods are preserved
```

## Security Considerations

1. **HTTPS Required**: Custom endpoints should use HTTPS in production
2. **Endpoint Validation**: Hoot doesn't validate endpoint authenticity - ensure you trust the OAuth server
3. **CORS**: OAuth endpoints must allow CORS requests from Hoot's origin
4. **Credential Storage**: OAuth tokens are stored securely in the backend database

## Implementation Details

### Files Modified

1. **`server/lib/handlers.js`**:
   - `createOAuthProvider()` - Accepts and attaches custom metadata
   - `connectToServer()` - Injects custom fetch function

2. **`server/durable-objects/mcp-connection-pool-do.js`**:
   - `createConnection()` - Injects custom fetch for Workers
   - `createOAuthProvider()` - Accepts custom metadata

3. **Frontend forms** (unchanged - already collecting custom endpoints):
   - `src/components/ServerConfigForm.tsx`
   - `src/components/EditServerModal.tsx`
   - `src/components/AuthConfigForm.tsx`

### Type Definitions

```typescript
interface CustomOAuthMetadata {
  authorization_endpoint?: string;
  token_endpoint?: string;
  client_id?: string;
  issuer?: string;
  response_types_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_method?: string;
}

interface AuthConfig {
  type: 'oauth';
  customOAuthMetadata?: CustomOAuthMetadata;
  // ... other OAuth fields
}
```

## Standards Compliance

While custom endpoints bypass auto-discovery, Hoot still follows OAuth 2.1 standards:

- ✅ **RFC 6749**: OAuth 2.0 Authorization Framework
- ✅ **RFC 7636**: PKCE (Proof Key for Code Exchange)
- ⚠️ **RFC 8414**: Authorization Server Metadata (bypassed by custom endpoints)
- ✅ **OAuth 2.1**: Latest OAuth specification

## Roadmap

Future enhancements:

- [ ] Endpoint URL validation in the UI
- [ ] Test connection button for custom endpoints
- [ ] Endpoint discovery assistance (probe common paths)
- [ ] Support for additional OAuth metadata fields
- [ ] OAuth endpoint templates for common providers

---

**Custom OAuth endpoints make Hoot compatible with any OAuth provider!** 🔧🔐



