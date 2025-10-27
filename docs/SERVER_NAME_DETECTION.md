# Server Name Detection Fix

## Problem
When detecting OAuth-protected MCP servers, the server name was showing as "Unknown Server" because OAuth authentication fails before the MCP initialization handshake completes.

## Root Cause
The MCP SDK only provides server metadata (name, version) after successful initialization via `client.getServerVersion()`. When OAuth is required but not provided, the server returns a 401 error before any MCP protocol negotiation happens, so we never get the server info.

## Solution
Implemented intelligent fallback name extraction from the server URL:

### Algorithm
1. Try to get server info from MCP initialization (works for non-OAuth servers)
2. If OAuth blocks initialization:
   - Parse the URL hostname
   - Extract company/service name from domain
   - Example transformations:
     - `mcp.notion.com` → "Notion"
     - `mcp.portkey.ai` → "Portkey"
     - `mcp.deepwiki.com` → "Deepwiki"
3. Capitalize and format the name

### Code Location
**Backend**: `mcp-backend-server.js` - auto-detect endpoint
```javascript
// After detection loop, if serverInfo is still null
if (!serverInfo) {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    const namePart = parts[parts.length - 2]; // e.g., "notion" from "mcp.notion.com"
    const extractedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    serverInfo = { name: extractedName, version: '1.0.0' };
}
```

## Testing

### Test Results
```bash
$ node tests/test-oauth-detection.js

✅ DeepWiki - Name: DeepWiki, OAuth: false (from MCP)
✅ Notion - Name: Notion, OAuth: true (from URL)
✅ Portkey - Name: Portkey, OAuth: true (from URL)

Results: 3 passed, 0 failed
```

## Benefits
1. **Better UX**: Users see meaningful server names instead of "Unknown Server"
2. **Smart Extraction**: Automatically extracts service name from URL
3. **Fallback Strategy**: Uses MCP data when available, URL as fallback
4. **Consistent**: Works for both OAuth and non-OAuth servers

## Future Enhancements
- Allow users to customize the server name after connection
- Cache actual server names after OAuth completes
- Support more complex URL patterns
- Add manual name override option in UI

