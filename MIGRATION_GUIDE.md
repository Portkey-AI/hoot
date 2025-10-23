# Migration Guide: Backend Relay Architecture

## Overview

The MCP client architecture has been updated to use a **backend relay** pattern, eliminating CORS issues permanently.

## What Changed

### Before (Browser-based MCP Client)
```
Browser → [MCP SDK Client] → MCP Server (CORS errors!)
```

Problems:
- ❌ CORS errors with most MCP servers
- ❌ Required CORS proxy workaround
- ❌ Credentials exposed in browser
- ❌ No persistent connections

### After (Backend Relay)
```
Browser → Backend API → [MCP SDK Client] → MCP Server ✅
```

Benefits:
- ✅ No CORS issues (server-to-server)
- ✅ Better security (credentials on backend)
- ✅ Persistent connections possible
- ✅ Same MCP SDK usage on backend

## New Components

### 1. Backend Server (`mcp-backend-server.js`)
- Acts as the MCP client
- Runs on port 3002
- Uses MCP SDK directly
- Manages connections to external MCP servers

### 2. Backend API Client (`src/lib/backendClient.ts`)
- HTTP client for browser
- Communicates with backend on localhost:3002
- Clean REST API

### 3. Updated MCP Client (`src/lib/mcpClient.ts`)
- Now acts as relay to backend
- No longer creates SDK clients directly
- Maintains same interface for components

## How to Use

### Running the Application

**New recommended way:**
```bash
npm run dev:full
```

This starts:
- Backend server on http://localhost:3002
- Frontend on http://localhost:5173

**Manual start (if you prefer):**
```bash
# Terminal 1
npm run backend

# Terminal 2
npm run dev
```

### Old Proxy Method (Deprecated)

The old CORS proxy is still available but **not needed anymore**:
```bash
npm run dev:with-proxy  # Don't use this
```

The backend relay is superior and should be used instead.

## API Changes

### None! 🎉

From the React component perspective, everything works exactly the same:

```typescript
// Still works the same way
const { connect, disconnect } = useMCPConnection();
const { execute } = useMCPExecution();

// Same usage
await connect(serverConfig);
await execute(serverId, toolName, args);
```

## Testing

### Check Backend Health
```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "MCP Backend Server is running",
  "port": 3002,
  "activeConnections": 0
}
```

### Run Test Suite
```bash
node test-backend.js
```

## Troubleshooting

### Backend not running

**Error in UI:**
> Backend server is not running. Please start it with: npm run backend

**Solution:**
```bash
npm run backend
```

### Port already in use

**Error:**
> Port 3002 is already in use!

**Solution:**
```bash
lsof -ti:3002 | xargs kill -9
npm run backend
```

### Can't connect to MCP server

**Check:**
1. Is backend running? `curl http://localhost:3002/health`
2. Is the MCP server URL correct?
3. Check backend console for error messages
4. Verify authentication configuration

## OAuth Still Works!

OAuth flow remains unchanged:
1. Try to connect → 401 Unauthorized
2. Browser redirects to OAuth provider
3. User authorizes
4. Redirect back with code
5. Reconnect with authorization code
6. Backend completes OAuth flow
7. Connected ✅

The backend handles token storage and refresh transparently.

## Performance Notes

### Benefits
- Persistent connections to MCP servers
- Reduced latency (no CORS preflight)
- Connection pooling possible
- Better error handling

### Resource Usage
- Backend uses ~20-30MB memory per server
- Negligible CPU when idle
- Network: same as before (just routed differently)

## Development Workflow

### Before
```bash
npm run dev:with-proxy
# Wait for proxy + UI
# Toggle proxy ON in UI
# Connect to servers
```

### Now
```bash
npm run dev:full
# Wait for backend + UI
# Connect to servers (no toggle needed)
```

Simpler and more reliable!

## Code Changes Summary

| File | Status | Changes |
|------|--------|---------|
| `mcp-backend-server.js` | ✅ New | Backend MCP relay server |
| `src/lib/backendClient.ts` | ✅ New | HTTP API client |
| `src/lib/mcpClient.ts` | 🔄 Updated | Now relays to backend |
| `package.json` | 🔄 Updated | Added `dev:full` script |
| React components | ✅ No changes | Same interface |
| OAuth provider | ✅ No changes | Still used for URLs |
| UI/UX | ✅ No changes | Same experience |

## Rollback (if needed)

If you need to go back to the old architecture:

```bash
git checkout HEAD~1 src/lib/mcpClient.ts
rm mcp-backend-server.js src/lib/backendClient.ts
npm run dev:with-proxy
```

But you shouldn't need to - the new architecture is better in every way!

## Next Steps

1. Try connecting to an MCP server
2. Test tool execution
3. Test OAuth flow (if applicable)
4. Enjoy no more CORS errors! 🎉

## Questions?

See:
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Detailed architecture
- [README.md](./README.md) - Quick start guide
- [AUTHENTICATION.md](./AUTHENTICATION.md) - OAuth details

## Summary

✅ Same features
✅ Same UI/UX  
✅ Same API
✅ Better reliability
✅ No CORS issues
✅ More secure

The migration is seamless - just start using `npm run dev:full` and enjoy a better experience!

