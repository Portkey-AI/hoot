# 💾 Persistent Storage in Hoot

## Overview

Hoot uses **localStorage** with Zustand's persist middleware to provide a seamless experience across sessions.

## What's Persisted

### 1. **Server Configurations** ✅
All your server connections are saved:
- Server name
- Transport type (SSE/HTTP)
- URL/endpoint
- Server ID

**Not persisted** (for security/freshness):
- Connection status (always starts disconnected)
- Error messages (cleared on reload)

### 2. **Tools Cache** 🚀
When you connect to a server and discover tools, they're cached locally:
- Tool names
- Tool descriptions  
- Input schemas
- Complete tool definitions

**Benefits**:
- Instant tool list on reload (no waiting for discovery)
- Auto-reconnect to servers with cached tools
- Offline browsing of previously discovered tools

### 3. **Execution History** 📊
Last 50 execution results are saved:
- Tool name
- Input parameters
- Results
- Timestamps
- Success/error status

**Performance note**: Limited to 50 entries to keep storage lightweight

### 4. **User Preferences** ⚙️
Your settings are remembered:
- Input mode preference (Form vs JSON)
- Last selected server/tool (coming soon)

## Storage Details

### Location
- Browser: `localStorage['hoot-storage']`
- Key format: `hoot-storage` 

### Storage Size
Typical usage: **< 500KB**
- Server configs: ~1KB each
- Tools cache: ~5-10KB per server
- History: ~5KB (50 entries)

### Version Management
Current version: **v1**

When we add breaking changes, the version number increments and old data is migrated or cleared gracefully.

## Date Handling

Special care for Date objects:
- Stored as ISO strings in localStorage
- Automatically converted back to Date objects on load
- Prevents serialization issues

```typescript
// Dates are handled automatically
server.lastConnected // Date object
entry.timestamp      // Date object
```

## Auto-Reconnect Feature

On app load:
1. Check for servers with cached tools
2. Attempt to reconnect in the background
3. Non-blocking (app remains responsive)
4. Failed reconnects don't break the app

Console message:
```
🦉 Hoot: Auto-reconnecting to 2 server(s)...
```

## Privacy & Security

### What's Stored Locally
- ✅ Server URLs (you control)
- ✅ Tool schemas (public info from servers)
- ✅ Your test inputs/results
- ✅ UI preferences

### What's NOT Stored
- ❌ Authentication tokens
- ❌ Sensitive credentials
- ❌ Connection passwords
- ❌ Personal identifiable information

### Clearing Storage

**Browser DevTools**:
```javascript
localStorage.removeItem('hoot-storage')
```

**Or clear all site data** in browser settings.

## Benefits

### Developer Experience
- **No setup required** - Just works
- **Fast startup** - Cached tools load instantly
- **Resume where you left off** - Servers and history persist
- **Offline friendly** - Browse cached tools without connection

### Performance
- **Zero network requests** for cached data
- **Instant UI** - No loading spinners for known servers
- **Smart caching** - Only stores what's useful

## Storage Strategy

### What We Cache
✅ Static data (tool schemas)
✅ User configurations (servers, preferences)
✅ Recent history (last 50 entries)

### What We Don't Cache
❌ Dynamic state (connection status)
❌ Error states (always fresh)
❌ Large payloads (kept minimal)

## Future Enhancements

### Planned (v0.2)
- [ ] Export/import server collections
- [ ] Sync across devices (optional cloud)
- [ ] Compression for large schemas
- [ ] Smart cache invalidation

### Under Consideration
- [ ] IndexedDB for larger datasets
- [ ] Encrypted storage option
- [ ] Selective persistence (choose what to save)

---

**Storage is automatic and invisible** - Hoot just remembers what you need! 🦉✨

