# 🌐 CORS Proxy for Hoot

## The Problem

Browser security (CORS) blocks requests to MCP servers that don't have proper CORS headers. This affects most MCP servers since they're not designed for browser clients.

## The Solution

Hoot includes a local CORS proxy server that runs on your machine and forwards requests without CORS restrictions.

```
Browser (Hoot) → Local Proxy (localhost:3001) → MCP Server
```

## Quick Start

### Option 1: Run Everything Together (Recommended)
```bash
npm run dev:with-proxy
```

This starts both the proxy server AND the Hoot UI.

### Option 2: Run Separately
```bash
# Terminal 1: Start the proxy
npm run proxy

# Terminal 2: Start Hoot
npm run dev
```

## Using the Proxy

1. **Start the proxy** using one of the methods above
2. **Open Hoot** in your browser (http://localhost:3000)
3. **Toggle the proxy** - Click "Proxy OFF" in the sidebar to enable it
4. **Connect to servers** - They'll now work without CORS errors!

## Proxy Toggle

Located in the server sidebar header:

- **Proxy OFF** 🔌 - Direct connections (may have CORS errors)
- **Proxy ON** 📡 - Routes through local proxy (no CORS issues)
- **⚠️ Warning** - Proxy is enabled but not running

## How It Works

### When Proxy is OFF:
```typescript
Browser → https://mcp.linear.app/mcp
❌ CORS Error
```

### When Proxy is ON:
```typescript
Browser → http://localhost:3001/proxy?target=https://mcp.linear.app/mcp → MCP Server
✅ No CORS Issues
```

The proxy:
1. Receives requests from Hoot
2. Forwards them to the real MCP server
3. Adds CORS headers to the response
4. Returns the response to Hoot

## When Do You Need the Proxy?

### ✅ Need Proxy For:
- Public MCP servers (https://mcp.linear.app, etc.)
- Servers without CORS headers
- Production/cloud-hosted servers

### ❌ Don't Need Proxy For:
- localhost servers (automatically skipped)
- Servers with proper CORS configuration
- Servers that explicitly allow your origin

## Troubleshooting

### "CORS Proxy not running"
**Solution**: Start the proxy with `npm run proxy`

### Proxy toggle shows warning ⚠️
**Cause**: Proxy is enabled but server isn't running
**Solution**: Start `npm run proxy` in another terminal

### Still getting CORS errors with proxy ON
**Check**:
1. Is proxy actually running? Check http://localhost:3001/health
2. Is the toggle actually ON? (should show WiFi icon)
3. Check browser console for actual error

### Proxy server won't start
**Common causes**:
- Port 3001 already in use
- Missing dependencies: run `npm install`

## Technical Details

### Proxy Configuration

**Port**: 3001
**Endpoint**: `/proxy?target=<URL>`
**Health Check**: `/health`

### Example Request

Direct (with CORS issues):
```http
POST https://mcp.linear.app/mcp
```

Through proxy (no CORS):
```http
POST http://localhost:3001/proxy?target=https%3A%2F%2Fmcp.linear.app%2Fmcp
```

### Security

- Proxy only runs locally (localhost:3001)
- Not accessible from external networks
- Only forwards requests, doesn't modify content
- Adds CORS headers to responses

## Future Plans

- **v0.3**: Browser extension for system-wide CORS bypass
- **v1.0**: Electron app (no CORS issues at all!)

---

**Questions?** Check out the main README or open an issue!

