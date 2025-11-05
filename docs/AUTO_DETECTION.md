# Auto-Detection Feature

Hoot simplifies adding MCP servers by automatically detecting server configuration from just a URL.

## Overview

Auto-detection eliminates manual configuration by automatically discovering:
1. **Transport Type** - Tries HTTP first, then falls back to SSE
2. **Server Name** - Extracted from the MCP server's initialize response or URL
3. **Server Version** - Extracted from the MCP server's initialize response
4. **OAuth Requirements** - Automatically detects if OAuth is needed
5. **Authentication Methods** - Detects supported auth methods from server metadata

## User Experience

### Before Auto-Detection:
```
User Input Required:
- Server Name ❌
- URL ✓
- Transport Type ❌ (HTTP/SSE/stdio)
- Authentication Type ❌ (None/Headers/OAuth)
```

### After Auto-Detection:
```
User Input Required:
- URL ✓

Everything Else Detected Automatically:
- Server Name ✓ (from MCP or URL)
- Transport Type ✓ (auto-detected)
- Authentication ✓ (auto-detected)
- Server Version ✓ (from MCP)
```

## How It Works

### 1. Transport Detection

Hoot tries to connect using different transports in order:

```javascript
// 1. Try HTTP transport first (faster, more common)
try {
  const client = new Client({ name: 'hoot', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(url);
  await client.connect(transport);
  return { transport: 'http', serverInfo, requiresOAuth: false };
} catch (error) {
  // If HTTP fails, try SSE
}

// 2. Try SSE transport
try {
  const client = new Client({ name: 'hoot', version: '1.0.0' });
  const transport = new SSEClientTransport(url);
  await client.connect(transport);
  return { transport: 'sse', serverInfo, requiresOAuth: false };
} catch (error) {
  // Detection failed
}
```

### 2. Server Name Detection

**Method A: From MCP Initialization (Preferred)**

When connection succeeds, Hoot gets server info from MCP protocol:

```javascript
const serverInfo = await client.getServerVersion();
// Returns: { name: "DeepWiki", version: "0.0.1" }
```

**Method B: From URL (Fallback)**

When OAuth blocks initialization, Hoot extracts the name from the URL:

```javascript
// Example: https://mcp.notion.com → "Notion"
// Example: https://mcp.portkey.ai → "Portkey"
const urlObj = new URL(url);
const hostname = urlObj.hostname;
const parts = hostname.split('.');
const namePart = parts[parts.length - 2]; // Get "notion" from "mcp.notion.com"
const extractedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
```

This ensures users see meaningful names like "Notion" instead of "Unknown Server".

### 3. OAuth Detection

Hoot automatically detects OAuth by catching authentication errors:

```javascript
try {
  await client.connect(transport);
  return { requiresOAuth: false };
} catch (error) {
  if (error instanceof UnauthorizedError && error.authorizationUrl) {
    return { 
      requiresOAuth: true,
      authUrl: error.authorizationUrl 
    };
  }
}
```

### 4. Authentication Method Detection

Hoot checks server metadata for advertised authentication methods:

```javascript
const metadata = await client.getServerVersion();
if (metadata.authMethods?.includes('client_credentials')) {
  return { requiresClientCredentials: true };
}
if (metadata.authMethods?.includes('oauth')) {
  return { requiresOAuth: true };
}
```

## Implementation

### Backend Endpoint

**`POST /mcp/auto-detect`**

```javascript
// Request
{
  "url": "https://mcp.example.com"
}

// Response (Success)
{
  "success": true,
  "serverInfo": {
    "name": "DeepWiki",
    "version": "0.0.1",
    "authMethods": ["none"]
  },
  "transport": "sse",
  "requiresOAuth": false
}

// Response (OAuth Required)
{
  "success": true,
  "serverInfo": {
    "name": "Notion",
    "version": "1.0.0"
  },
  "transport": "http",
  "requiresOAuth": true,
  "authUrl": "https://oauth.notion.com/authorize?..."
}
```

### Frontend Integration

**File:** `src/lib/backendClient.ts`

```typescript
export async function autoDetectServer(
  url: string
): Promise<{
  success: boolean;
  serverInfo?: { name: string; version: string; authMethods?: string[] };
  transport?: 'http' | 'sse';
  requiresOAuth?: boolean;
  authUrl?: string;
  error?: string;
}> {
  const token = await getSessionToken();
  const response = await fetch(`${BACKEND_URL}/mcp/auto-detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hoot-token': token,
    },
    body: JSON.stringify({ url }),
  });
  return response.json();
}
```

### UI Flow

**File:** `src/components/AddServerModal.tsx`

1. User enters URL
2. Clicks "Detect Configuration"
3. Shows progress with live status updates:
   - 🔍 Finding your server...
   - 🔌 Checking how to connect...
   - 📋 Getting server details...
   - 🔐 Checking if login is needed...
4. Displays detected server info
5. User clicks "Add & Connect" or "Authorize →"

## Benefits

1. **Simpler UX**: Users only need to know the URL
2. **Fewer Errors**: No manual transport selection mistakes
3. **Beautiful Progress**: Shows what's happening during detection
4. **Smart Defaults**: Tries HTTP first (faster) then SSE
5. **OAuth Detection**: Automatically detects when OAuth is needed
6. **Meaningful Names**: Shows "Notion" instead of "Unknown Server"

## Testing

Run the test script:
```bash
node tests/test-auto-detect.js
```

Expected output:
```
✅ Auto-detect successful!
📊 Detection Results:
   Transport: HTTP
   Server Name: DeepWiki
   Version: 0.0.1
   Requires OAuth: No
```

Test OAuth detection:
```bash
node tests/test-oauth-detection.js
```

Expected output:
```
✅ DeepWiki - Name: DeepWiki, OAuth: false (from MCP)
✅ Notion - Name: Notion, OAuth: true (from URL)
✅ Portkey - Name: Portkey, OAuth: true (from URL)
```

## Edge Cases Handled

### 1. OAuth Blocking Initialization
- **Problem:** Can't get server name from MCP when OAuth blocks connection
- **Solution:** Extract name from URL hostname

### 2. Non-Standard Ports
- **Example:** `http://localhost:8080/mcp`
- **Handling:** Uses full URL, port preserved

### 3. Complex Subdomains
- **Example:** `api.v2.service.com`
- **Handling:** Extracts "service" as name

### 4. Server Errors
- **Example:** Server returns 500
- **Handling:** Returns error message with failed detection

### 5. Timeout
- **Default:** 10 second timeout per transport
- **Handling:** Moves to next transport or fails gracefully

## Limitations

1. **stdio Transport:** Cannot be auto-detected (requires local process)
2. **Multiple Auth Methods:** If server supports multiple, may need manual selection
3. **Custom Headers:** Cannot auto-detect required headers
4. **Non-Standard OAuth:** May not work with custom OAuth implementations

## Future Enhancements

- Cache detection results for faster reconnection
- Add "Advanced Mode" toggle for manual configuration
- Support detecting multiple authentication methods
- Detect and suggest common API key headers (X-API-Key, Authorization)
- Parallel transport testing (try HTTP and SSE simultaneously)

## Related Documentation

- [Authentication Detection](AUTH_DETECTION.md) - Detailed auth detection
- [Try in Hoot](TRY_IN_HOOT.md) - Pre-configured server links
- [Backend Architecture](../server/README.md) - Server implementation

---

**Status:** ✅ Fully Implemented  
**Version:** 1.0  
**Last Updated:** November 2025
