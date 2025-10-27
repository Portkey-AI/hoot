# Authentication Detection in Hoot 🦉

## Overview

Hoot supports multiple authentication methods for MCP servers. This document explains what can be auto-detected, what requires manual configuration, and how to handle advanced scenarios.

## Supported Auth Methods

### 1. **OAuth 2.1 with PKCE** ✅ Auto-Detected

**How it works:**
- Server returns HTTP 401 with OAuth authorization URL
- Hoot auto-detects and shows "Authorize →" button
- User is redirected through OAuth flow
- Tokens are securely stored and automatically refreshed

**User Experience:**
1. User provides server URL
2. Hoot detects OAuth requirement
3. Modal shows "🔐 Login needed" 
4. Button changes to "Authorize →"
5. Smooth OAuth redirect and callback

**Example servers:**
- Notion MCP
- Linear MCP
- Portkey MCP Gateway

### 2. **Client Credentials OAuth** ⚠️ Partially Auto-Detected

**How it works:**
- Server advertises in metadata: `"authMethods": ["client_credentials"]`
- Hoot detects during auto-detection
- Shows form for client ID and secret
- Exchanges credentials for token automatically

**Example config:**
```json
{
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "token_url": "https://api.example.com/oauth/token"
  }
}
```

### 3. **Header-Based Auth** ❌ Cannot Auto-Detect

**Why we can't auto-detect:**
- Servers return generic 401/403 errors
- No standard way to distinguish from OAuth
- No information about which headers are needed

**Solutions:**

#### Option A: "Try in Hoot" Links (Recommended)
Server authors can pre-configure auth in shareable links:

```json
{
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "headers",
    "headers": {
      "Authorization": "Bearer demo-key-123",
      "X-API-Key": "placeholder"
    }
  }
}
```

**Best Practice:** Use placeholder/demo keys, let users replace them after adding.

#### Option B: Auth Failure Fallback ✨ New Feature
When auto-detection fails with 401/403:

1. Show modal: "Authentication Required"
2. Offer common auth types:
   - API Key (single header)
   - Bearer Token
   - Custom Headers (advanced)
3. User selects and configures
4. Retry connection automatically

#### Option C: Manual Configuration
Users can edit server after adding to add auth headers:

1. Add server with URL only
2. Connection fails with auth error
3. User clicks "Edit" on server
4. Adds auth headers manually
5. Reconnects

### 4. **Multiple Headers** ✅ Supported

Some servers need multiple headers simultaneously:

```json
{
  "auth": {
    "type": "headers",
    "headers": {
      "Authorization": "Bearer token123",
      "X-API-Key": "key456",
      "X-Tenant-ID": "tenant789"
    }
  }
}
```

All headers are sent with every request.

### 5. **Mixed Auth** 🔧 Advanced

Some servers need OAuth + custom headers:

```json
{
  "auth": {
    "type": "oauth",
    "additionalHeaders": {
      "X-API-Version": "2024-01"
    }
  }
}
```

**Note:** This is an advanced feature. Most servers should use OAuth alone.

### 6. **Custom OAuth Metadata** 🔧 Advanced

Override OAuth discovery for servers with non-standard implementations:

```json
{
  "auth": {
    "type": "oauth",
    "customMetadata": {
      "authorization_endpoint": "https://custom.com/authorize",
      "token_endpoint": "https://custom.com/token",
      "client_id": "custom-client-id"
    }
  }
}
```

## Future Auth Methods

The MCP protocol may add new auth methods:
- mTLS (mutual TLS)
- JWT-based auth  
- HMAC signatures
- SAML/SSO integration

**Hoot's Approach:**
- ✅ Backend is flexible - passes auth config to SDK
- ✅ Frontend types support extensible auth types
- ✅ "Try in Hoot" can include any auth config
- ⚠️  Auto-detection limited to what protocol supports

## Implementation Details

### Backend: Flexible Auth Handling

```javascript
// Backend passes any auth config to SDK
if (config.auth) {
  transportOptions.authProvider = createAuthProvider(config.auth);
}
```

The SDK handles:
- OAuth 2.1 flows (authorization code + PKCE)
- Client credentials OAuth
- Header injection (single or multiple)
- Token refresh
- Future auth methods

### Frontend: Type-Safe Auth Config

```typescript
type AuthConfig = 
  | { type: 'none' }
  | { type: 'oauth'; customMetadata?: OAuthMetadata; additionalHeaders?: Record<string, string> }
  | { type: 'client_credentials'; client_id: string; client_secret: string; token_url?: string }
  | { type: 'headers'; headers: Record<string, string> }
  | { type: string; [key: string]: any }; // Future-proof
```

### Auto-Detection: What We Can Detect

```typescript
// During auto-detection
try {
  const metadata = await client.getServerVersion();
  
  // Check metadata for advertised auth methods
  if (metadata.authMethods?.includes('client_credentials')) {
    return { requiresClientCredentials: true };
  }
  
  await client.connect();
} catch (error) {
  if (error.authorizationUrl) {
    // ✅ OAuth detected!
    return { requiresOAuth: true, authUrl: error.authorizationUrl };
  } else if (error.statusCode === 401 || error.statusCode === 403) {
    // ❌ Auth required but type unknown
    // Show fallback UI to let user choose
    return { requiresAuth: true, authType: 'unknown' };
  }
}
```

### Auth Failure Fallback UI

When auth is required but can't be auto-detected:

```typescript
// Show modal with common auth options
<AuthSelectionModal>
  <AuthOption type="api_key">
    API Key
    <Input placeholder="X-API-Key" />
    <Input placeholder="your-key-here" />
  </AuthOption>
  
  <AuthOption type="bearer">
    Bearer Token  
    <Input placeholder="your-token-here" />
  </AuthOption>
  
  <AuthOption type="custom_headers">
    Custom Headers (Advanced)
    <HeaderEditor />
  </AuthOption>
</AuthSelectionModal>
```

## User Documentation

### For Server Authors

**Make it easy for users:**

1. **Prefer OAuth** for production servers
   - Auto-detected by Hoot
   - Secure, no credential sharing
   - Best user experience

2. **Advertise auth methods in metadata**
   ```json
   {
     "name": "My Server",
     "version": "1.0.0",
     "authMethods": ["client_credentials", "oauth"]
   }
   ```

3. **For API key auth:**
   - Provide "Try in Hoot" link with placeholder key
   - Document how to get real API keys
   - Consider adding OAuth support

4. **Document clearly:**
   ```markdown
   [![Try in Hoot](badge)](link)
   
   **Authentication:** This server requires an API key. 
   After adding:
   1. Click Edit on the server
   2. Add header `X-API-Key` with your key from [here](...)
   3. Reconnect
   ```

### For Users

**Auto-detection flow:**
1. Paste server URL
2. Click "Connect"
3. Hoot tries to connect
4. If auth needed:
   - OAuth → "Authorize →" button appears
   - Client credentials → Form for ID/secret
   - Headers → Auth selection modal
5. Complete auth and connect!

**If auto-detection doesn't work:**
1. Check server documentation
2. Look for "Try in Hoot" links (may include auth)
3. Add server, then edit to add auth manually
4. Contact server author about auth metadata

## Future Enhancements

### Planned Features:

1. **Smart 401 Handling** ✅ Priority
   - Detect common header names (X-API-Key, Authorization)
   - Offer quick form to add headers
   - Retry automatically

2. **Auth Templates**
   - Pre-built templates for common patterns
   - "Bearer token", "API Key", "Basic Auth"
   - One-click application

3. **Credential Management**
   - Secure credential storage
   - Reuse credentials across servers
   - Environment variables support

4. **Protocol Extensions**
   - Support new auth methods as MCP evolves
   - Backwards compatible
   - Extensible architecture

5. **Auth Method Discovery**
   - Check server metadata for `authMethods` array
   - Show relevant UI based on advertised methods
   - Better error messages

## Security Considerations

### Never Auto-Fill Credentials
- Can't auto-detect what credentials to use
- Would be security risk
- User must explicitly provide

### Secure Storage
- OAuth tokens: Encrypted in SQLite
- Header values: Stored in app state (consider encryption)
- Client secrets: Encrypted storage
- Never logged or exposed

### Validation
- Validate auth config structure
- Sanitize header values
- Prevent injection attacks
- Validate OAuth metadata

### Multiple Headers
- All headers combined and sent
- Later headers override earlier ones with same name
- Sanitize header names and values

## Advanced Use Cases

### Scenario 1: OAuth + Custom Headers

Server needs OAuth but also requires API version header:

```json
{
  "name": "Advanced API",
  "url": "https://api.example.com/mcp",
  "auth": {
    "type": "oauth",
    "additionalHeaders": {
      "X-API-Version": "v2"
    }
  }
}
```

### Scenario 2: Multiple API Keys

Server needs multiple authentication headers:

```json
{
  "auth": {
    "type": "headers",
    "headers": {
      "X-Primary-Key": "key1",
      "X-Secondary-Key": "key2",
      "X-Tenant-ID": "tenant123"
    }
  }
}
```

### Scenario 3: Custom OAuth Flow

Server uses OAuth but with custom endpoints:

```json
{
  "auth": {
    "type": "oauth",
    "customMetadata": {
      "authorization_endpoint": "https://auth.company.com/oauth/authorize",
      "token_endpoint": "https://auth.company.com/oauth/token",
      "client_id": "hoot-client",
      "response_types_supported": ["code"],
      "grant_types_supported": ["authorization_code", "refresh_token"]
    }
  }
}
```

## Summary

| Auth Type | Auto-Detect | Try in Hoot | Manual Config | Fallback UI |
|-----------|-------------|-------------|---------------|-------------|
| OAuth 2.1 | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Client Creds | ⚠️  Metadata | ✅ Yes | ✅ Yes | ✅ Yes |
| Headers (single) | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| Headers (multiple) | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| Mixed Auth | ❌ No | ✅ Yes | ✅ Yes | ⚠️  Partial |
| Future | ⚠️  Depends | ✅ Yes | ✅ Yes | ⚠️  Depends |

**Recommendation:** Server authors should:
1. Use OAuth 2.1 for best UX
2. Advertise auth methods in server metadata
3. Provide clear documentation
4. Include "Try in Hoot" links with auth pre-configured


