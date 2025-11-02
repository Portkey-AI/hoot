# URL & State Management Strategy

This document defines how Hoot handles URLs, state persistence, and deep linking across the application.

## Overview

Hoot uses a three-tier state management strategy:
1. **URL Paths** - Core navigation and view modes
2. **URL Search Params** - Shareable, linkable state
3. **LocalStorage** - User preferences and settings

## URL Structure

### Base Paths

```
http://localhost:8009/                    → Test mode (default)
http://localhost:8009/test                → Test mode (explicit)
http://localhost:8009/chat                → Chat mode
http://localhost:8009/oauth/callback      → OAuth callback (special route)
```

### Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `server` | string | Server ID to display | `?server=abc-123` |
| `tool` | string | Tool name to select (requires server) | `?tool=get_weather` |
| `search` | string | Search/filter query | `?search=api` |
| `params` | base64 | Pre-filled tool parameters | `?params=eyJ1c2VySWQiOiIxMjMifQ==` |
| `execution` | string | Execution history ID | `?execution=def-456` |
| `try` | base64 | Try in Hoot config | `?try=eyJuYW1lIjoiV2Vh...` |

### Example URLs

```bash
# Default view
http://localhost:8009/

# Test mode with specific server and tool
http://localhost:8009/test?server=weather-api&tool=get_forecast

# Chat mode with selected server
http://localhost:8009/chat?server=notion-mcp

# Deep link to execution result
http://localhost:8009/test?server=api-server&execution=abc123

# Search for tools
http://localhost:8009/test?server=github-mcp&search=issue

# Pre-filled tool execution
http://localhost:8009/test?server=api&tool=fetch&params=eyJ1c2VySWQiOiIxMjMifQ==

# Try in Hoot (existing feature)
http://localhost:8009/?try=eyJuYW1lIjoiV2VhdGhlciJ9

# OAuth callback (existing feature)
http://localhost:8009/oauth/callback?code=xyz&state=abc
```

## State Management Matrix

| Feature | Storage Method | Rationale |
|---------|---------------|-----------|
| **View Mode** (test/chat) | URL Path | Core navigation, back/forward support |
| **Selected Server** | URL Param | Shareable, deep linkable |
| **Selected Tool** | URL Param | Shareable, deep linkable |
| **Search Query** | URL Param | Shareable for documentation |
| **Tool Parameters** | URL Param (optional) | Share pre-filled executions |
| **Execution History** | URL Param | Share specific results |
| **Try in Hoot** | URL Param | Existing feature |
| **OAuth Callback** | URL Path | OAuth spec requirement |
| **Input Mode** | LocalStorage | User preference |
| **Theme** | LocalStorage | User preference |
| **Sidebar Collapsed** | LocalStorage | UI preference |
| **Auto-reconnect** | LocalStorage | Technical preference |
| **Server Sort Order** | LocalStorage | Personal organization |
| **History Filter** | LocalStorage | Ephemeral UI state |
| **LLM Settings** | LocalStorage | Sensitive data |
| **Connection Status** | Zustand Only | Transient, re-checked on load |
| **Tool Executing** | Zustand Only | Transient state |
| **Toasts** | Zustand Only | Ephemeral notifications |

## Decision Framework

### Use URL Path When:
- ✅ Major navigation change
- ✅ Fundamentally different view
- ✅ Back/forward should navigate
- ✅ Distinct "page" concept

**Examples:** `/test`, `/chat`, `/oauth/callback`

### Use URL Search Params When:
- ✅ Users need to share this state
- ✅ Filters or focuses current view
- ✅ Deep linking is valuable
- ✅ Affects displayed data
- ❌ NOT for sensitive data

**Examples:** `?server=abc`, `?tool=xyz`, `?search=query`

### Use LocalStorage When:
- ✅ Personal preference
- ✅ Should persist across sessions
- ✅ Not meant to be shared
- ✅ UI/UX settings
- ✅ Sensitive data (API keys)

**Examples:** Input mode, theme, sidebar state, API keys

### Use Zustand Only (No Persistence) When:
- ✅ Completely transient
- ✅ Should reset on page load
- ✅ Loading/processing state
- ✅ Derived from other state

**Examples:** Connection status, executing tools, toast notifications

## Implementation

### URL State Hook

We provide a `useURLState` hook to manage URL synchronization:

```typescript
import { useURLState } from './hooks/useURLState';

function MyComponent() {
  const { updateURL, readURL } = useURLState();
  
  // Update URL when state changes
  const handleServerSelect = (serverId: string) => {
    setSelectedServer(serverId);
    updateURL({ server: serverId });
  };
  
  // Read URL on mount
  useEffect(() => {
    const urlState = readURL();
    if (urlState.server) {
      setSelectedServer(urlState.server);
    }
  }, []);
}
```

### LocalStorage Keys

Standard localStorage keys used throughout the app:

```typescript
// Zustand persistence (existing)
'hoot-storage'              // Server configs, cached tools, history

// User preferences (new)
'hoot-input-mode'           // 'form' | 'json'
'hoot-sidebar-collapsed'    // boolean
'hoot-auto-reconnect'       // boolean (may already exist)
'hoot-history-filter'       // 'all' | 'success' | 'error'
'hoot-server-sort'          // 'recent' | 'alphabetical' | 'manual'
```

Access via utility functions:

```typescript
import { getPreference, setPreference } from './lib/preferences';

const inputMode = getPreference('input-mode', 'form'); // with default
setPreference('input-mode', 'json');
```

### Navigation

Use the navigation helpers to ensure URLs are updated correctly:

```typescript
import { navigateToView, navigateToServer, navigateToTool } from './lib/navigation';

// Navigate to different view
navigateToView('chat');
// → http://localhost:8009/chat

// Navigate to server
navigateToServer('server-id');
// → http://localhost:8009/test?server=server-id

// Navigate to tool
navigateToTool('server-id', 'tool-name');
// → http://localhost:8009/test?server=server-id&tool=tool-name
```

## OAuth State Preservation

When redirecting to OAuth provider, preserve the current app state:

```typescript
// Before redirect
const currentState = {
  returnPath: '/test',
  server: currentServerId,
  tool: currentToolName,
  view: currentViewMode
};

// Encode in OAuth state parameter
const oauthState = btoa(JSON.stringify({
  serverId: serverId,
  returnState: currentState
}));

// After callback
const decoded = JSON.parse(atob(state));
const { returnState } = decoded;

// Restore user's context
window.location.href = `${returnState.returnPath}?server=${returnState.server}&tool=${returnState.tool}`;
```

## URL Parameter Encoding

### Simple Values
Use standard URL encoding for simple strings:
```typescript
const url = `/?server=${encodeURIComponent(serverId)}`;
```

### Complex Objects
Use base64 for complex data structures:
```typescript
const params = { userId: '123', filters: ['active'] };
const encoded = btoa(JSON.stringify(params));
const url = `/?params=${encoded}`;
```

### Security Note
⚠️ **Never encode sensitive data in URLs:**
- ❌ API keys
- ❌ Auth tokens
- ❌ Passwords
- ❌ Personal information

## Back/Forward Navigation

URL changes should support browser back/forward:

- **Use `pushState`** for user-initiated actions (clicking, selecting)
- **Use `replaceState`** for automated/transient changes (auto-select first tool)
- **Listen to `popstate`** to handle back/forward

```typescript
// User clicks server → pushState
window.history.pushState({}, '', newURL);

// Auto-select first server → replaceState
window.history.replaceState({}, '', newURL);

// Handle back/forward
window.addEventListener('popstate', () => {
  const urlState = readURL();
  restoreStateFromURL(urlState);
});
```

## Deep Linking Examples

### Share a Tool
```
http://localhost:8009/test?server=weather-api&tool=get_forecast
```
User opens link → App loads → Selects weather-api server → Selects get_forecast tool

### Share Search Results
```
http://localhost:8009/test?server=github-api&search=repository
```
User opens link → App loads → Selects github-api → Filters tools containing "repository"

### Share Execution Result
```
http://localhost:8009/test?server=api&execution=abc123
```
User opens link → App loads → Selects api server → Scrolls to and highlights execution abc123

### Share Pre-filled Tool
```
http://localhost:8009/test?server=api&tool=fetch_user&params=eyJ1c2VySWQiOiIxMjMifQ==
```
User opens link → App loads → Selects server and tool → Pre-fills form with decoded params

## Testing

### Manual Testing
```bash
# Test path routing
open http://localhost:8009/test
open http://localhost:8009/chat

# Test deep linking
open "http://localhost:8009/test?server=my-server&tool=my-tool"

# Test back/forward
# Navigate around the app, then use browser back/forward buttons
```

### Automated Testing
```typescript
describe('URL State Management', () => {
  it('should restore server from URL on mount', () => {
    const serverId = 'test-server';
    window.history.pushState({}, '', `/?server=${serverId}`);
    
    render(<App />);
    
    expect(screen.getByText('test-server')).toBeInTheDocument();
  });
  
  it('should update URL when selecting tool', () => {
    // ... test implementation
  });
});
```

## Migration Guide

### Existing Code Changes

1. **View Mode State** - Change from state to path-based routing
```diff
- const [viewMode, setViewMode] = useState<ViewMode>('test');
+ const viewMode = window.location.pathname.includes('/chat') ? 'chat' : 'test';
```

2. **Server Selection** - Add URL sync
```diff
  const setSelectedServer = (serverId: string | null) => {
    useAppStore.setState({ selectedServerId: serverId });
+   updateURL({ server: serverId });
  };
```

3. **Input Mode** - Move to localStorage
```diff
- inputMode: 'form', // in Zustand state
+ const inputMode = getPreference('input-mode', 'form');
```

## Best Practices

### DO:
✅ Keep URLs readable and shareable
✅ Use descriptive parameter names
✅ Handle missing/invalid URL params gracefully
✅ Clear irrelevant params when context changes
✅ Debounce rapid URL updates (search typing)
✅ Test back/forward navigation
✅ Document all URL parameters

### DON'T:
❌ Put sensitive data in URLs
❌ Make URLs excessively long
❌ Update URL on every keystroke (debounce!)
❌ Break back button behavior
❌ Use URL params for transient UI state (modal open)
❌ Assume URL params are valid without validation

## Future Enhancements

Potential future URL features:

- **QR Code Generation** - For mobile sharing
- **Short URLs** - Compress long deep links
- **URL Templates** - Pre-defined link patterns for docs
- **Link Analytics** - Track shared link usage (opt-in)
- **Workspace Sharing** - Share entire server configurations
- **Execution Replay** - Re-run past executions from link

## Troubleshooting

### URL params not working?
1. Check if `useURLState` hook is imported
2. Verify URL is being updated in browser
3. Check browser console for errors
4. Ensure `popstate` listener is registered

### Back button not working?
1. Verify using `pushState` not `replaceState` for user actions
2. Check `popstate` handler is restoring state
3. Ensure URL params are being read on navigation

### State not persisting?
1. Check if it should be in URL (shareable) or localStorage (preference)
2. Verify localStorage key is correct
3. Check browser localStorage quota not exceeded

### OAuth redirect losing context?
1. Verify state parameter is being encoded
2. Check callback handler is decoding state
3. Ensure return URL is being constructed correctly

## Related Documentation

- [Try in Hoot](./TRY_IN_HOOT.md) - Deep linking server configurations
- [Authentication](./AUTHENTICATION.md) - OAuth flow details
- [Storage](./STORAGE.md) - LocalStorage and data persistence
- [Architecture](./ARCHITECTURE.md) - Overall app structure

---

**Last Updated:** November 2, 2025
**Version:** 1.0.0

