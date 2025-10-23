# 🦉 Hoot v0.2 - CORS Proxy Implementation Summary

## Overview

Added a local CORS proxy server to solve browser CORS issues when testing MCP servers. The proxy runs on `localhost:3001` and forwards requests to MCP servers without CORS restrictions.

## What Was Added

### 1. **Proxy Server** (`proxy-server.js`)
- Express server running on port 3001
- Routes requests through `/proxy?target=<URL>` endpoint
- Automatically adds CORS headers to all responses
- Health check endpoint at `/health`
- Detailed logging for debugging

### 2. **Proxy Utilities** (`src/lib/proxy.ts`)
- `isProxyAvailable()` - Check if proxy server is running
- `wrapWithProxy(url)` - Wrap URLs to route through proxy
- `getProxiedUrl(url, useProxy)` - Conditional URL wrapping
- Automatically skips localhost URLs (no proxy needed)

### 3. **UI Integration** (`src/components/ServerSidebar.tsx`)
- **Proxy Toggle** in sidebar header
  - Shows "Proxy ON" / "Proxy OFF" with WiFi icons
  - Checks proxy availability before enabling
  - Shows ⚠️ warning if proxy is enabled but not running
  - Toast notifications for status changes

### 4. **MCP Client Integration** (`src/lib/mcpClient.ts`)
- Automatically routes requests through proxy when enabled
- Reads `useProxy` setting from app state
- Logs proxy usage for debugging
- Works with both HTTP and SSE transports

### 5. **State Management** (`src/stores/appStore.ts`)
- Added `useProxy: boolean` to app state
- Added `setUseProxy(boolean)` action
- Persists proxy preference across sessions

### 6. **npm Scripts** (`package.json`)
```json
{
  "proxy": "node proxy-server.js",
  "dev:with-proxy": "concurrently \"npm run proxy\" \"npm run dev\""
}
```

### 7. **Documentation**
- `CORS_PROXY.md` - Complete proxy usage guide
- Updated `README.md` - Quick start with proxy
- Code comments and logging

## How It Works

```
┌─────────────────────┐
│  Browser (Hoot UI)  │
│  localhost:3000     │
└──────────┬──────────┘
           │
           │ Request with proxy enabled
           │
┌──────────▼──────────┐
│  CORS Proxy Server  │
│  localhost:3001     │
│  • No CORS checks   │
│  • Adds CORS headers│
└──────────┬──────────┘
           │
           │ Forward to MCP server
           │
┌──────────▼──────────┐
│  MCP Server         │
│  (any URL)          │
└─────────────────────┘
```

### Example Request Flow

**Without Proxy** (CORS Error):
```
POST https://mcp.linear.app/mcp
❌ CORS Error: No 'Access-Control-Allow-Origin' header
```

**With Proxy** (Works!):
```
POST http://localhost:3001/proxy?target=https%3A%2F%2Fmcp.linear.app%2Fmcp
✓ Proxy adds CORS headers
✓ Response forwarded to browser
```

## Usage

### Start Everything Together (Recommended)
```bash
npm run dev:with-proxy
```

This runs both:
- Proxy server on `:3001`
- Hoot UI on `:3000` or `:5173`

### Start Separately
```bash
# Terminal 1
npm run proxy

# Terminal 2
npm run dev
```

### Enable in UI
1. Open Hoot in browser
2. Click "Proxy OFF" in sidebar header
3. Toggle switches to "Proxy ON" with WiFi icon
4. If proxy isn't running, you'll see a ⚠️ warning

## Features

### Automatic Proxy Detection
- Checks if proxy is available before enabling
- Shows warning if enabled but not running
- Toast notification if user tries to enable without proxy running

### Smart URL Handling
- Automatically skips localhost URLs (no proxy needed)
- Only proxies external URLs
- Preserves all headers and request bodies

### Visual Feedback
- WiFi icon = Proxy ON
- WiFi-Off icon = Proxy OFF
- ⚠️ Warning = Proxy enabled but not running
- Toast notifications for status changes

### Logging & Debugging
```
[Proxy] POST https://mcp.linear.app/mcp
[Proxy] Routing to: https://mcp.linear.app/mcp
[Proxy] Path rewrite: /proxy?target=https://mcp.linear.app/mcp -> /mcp
[Proxy] Response: 200
```

## Benefits

1. **No CORS Errors** - Proxy bypasses browser CORS restrictions
2. **No Server Changes** - MCP servers don't need CORS headers
3. **Local & Secure** - Proxy only runs on localhost
4. **Easy Toggle** - Enable/disable proxy with one click
5. **Developer Friendly** - Detailed logging for debugging

## Technical Details

### Dependencies
- `express` - Web server framework
- `cors` - CORS middleware
- `http-proxy-middleware` - Proxy functionality
- `concurrently` - Run multiple npm scripts

### Proxy Configuration
```javascript
{
  port: 3001,
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }
}
```

### Security
- Only accessible from localhost
- Not exposed to external network
- No credential storage in proxy
- All auth still handled by Hoot client

## Future Enhancements

### v0.3 (Planned)
- Browser extension for system-wide CORS bypass
- No need for local proxy server
- Works with all applications

### v1.0 (Planned)
- Electron app (no CORS issues at all)
- Native stdio transport support
- Desktop app experience

## Testing

✅ Health check works: `curl http://localhost:3001/health`
✅ Proxy routing works: Tested with Linear MCP server
✅ UI toggle works: Visual feedback and toast notifications
✅ Build works: No TypeScript errors
✅ Persistence works: Proxy setting saved across sessions

## Files Changed

### New Files
- `proxy-server.js` - Express proxy server
- `src/lib/proxy.ts` - Proxy utility functions
- `CORS_PROXY.md` - Documentation

### Modified Files
- `package.json` - Added scripts and dependencies
- `src/types/index.ts` - Added `useProxy` to AppState
- `src/stores/appStore.ts` - Added proxy state management
- `src/stores/toastStore.ts` - Added `warn` alias
- `src/lib/mcpClient.ts` - Integrated proxy support
- `src/components/ServerSidebar.tsx` - Added proxy toggle UI
- `src/components/ServerSidebar.css` - Proxy toggle styles
- `README.md` - Updated with proxy instructions

## Conclusion

The CORS proxy solves one of the biggest pain points for browser-based MCP testing. Users can now connect to any MCP server without worrying about CORS configuration. The implementation is lightweight, easy to use, and integrates seamlessly with the existing UI.

**Status**: ✅ Complete and tested
**Impact**: 🚀 High - Solves major usability issue
**Complexity**: 🟢 Low - Simple Express server
**Maintenance**: 🟢 Low - Minimal dependencies

---

**Next Steps**: User testing with various MCP servers to ensure compatibility.

