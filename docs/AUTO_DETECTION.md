# Auto-Detection Feature

## Overview
Simplified the "Add Server" flow to only require a URL. Hoot now automatically detects:
1. **Transport Type** - Tries HTTP first, then falls back to SSE
2. **Server Name** - Extracted from the MCP server's initialize response
3. **Server Version** - Extracted from the MCP server's initialize response
4. **OAuth Requirements** - Automatically detects if OAuth is needed

## Implementation

### Backend (mcp-backend-server.js)
- **New Endpoint**: `POST /mcp/auto-detect`
  - Input: `{ url: string }`
  - Output: `{ success: boolean, serverInfo: { name, version }, transport: 'http' | 'sse', requiresOAuth: boolean }`
  - Process:
    1. Tries HTTP transport first
    2. Falls back to SSE if HTTP fails
    3. Extracts server info from MCP SDK's `getServerVersion()`
    4. Detects OAuth by catching UnauthorizedError

### Frontend

#### backendClient.ts
- **New Function**: `autoDetectServer(url: string)`
  - Calls the backend auto-detect endpoint
  - Returns detected configuration

#### AddServerModal.tsx
- **Simplified UI**: Only asks for URL
- **Detection Flow**:
  1. User enters URL
  2. Clicks "Detect Configuration"
  3. Shows progress with live status updates
  4. Displays detected server info (name, version, transport, auth)
  5. User clicks "Connect" to finalize
- **Beautiful Progress UI**: Shows detection steps as they happen

## User Experience

### Before:
```
User Input Required:
- Server Name ❌
- URL ✓
- Transport Type ❌ (HTTP/SSE/stdio)
- Authentication Type ❌ (None/Headers/OAuth)
```

### After:
```
User Input Required:
- URL ✓

Everything Else Detected Automatically:
- Server Name ✓ (from MCP)
- Transport Type ✓ (auto-detected)
- Authentication ✓ (auto-detected)
```

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

## Benefits

1. **Simpler UX**: Users only need to know the URL
2. **Fewer Errors**: No manual transport selection mistakes
3. **Better Experience**: Beautiful progress indicator shows what's happening
4. **Smart Defaults**: Tries HTTP first (faster) then SSE
5. **OAuth Detection**: Automatically detects when OAuth is needed

## Future Enhancements

- Add support for detecting custom authentication headers
- Cache detection results for faster reconnection
- Add "Advanced Mode" toggle for manual configuration
- Support detecting multiple authentication methods

