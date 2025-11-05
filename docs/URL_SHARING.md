# URL Sharing

URLs automatically sync with app state. Just copy the browser URL to share your configuration.

## URL Format

```
?s={server-name}:{server-url}&tool={tool-name}&args={base64-json}
```

### Parameters

| Param | Description | Example |
|-------|-------------|---------|
| `s` | Server reference | `weather:https://api.weather.com/mcp` |
| `tool` | Tool name | `get_forecast` |
| `args` | Tool args (base64 JSON) | `eyJjaXR5IjoiU0YifQ` |
| `view` | View mode | `hybrid` |
| `search` | Tool search query | `weather` |

## Examples

**Share server:**
```
https://hoot.app/?s=weather:https://api.weather.com/mcp
```

**Share tool with args:**
```
https://hoot.app/?s=weather:https://api.weather.com/mcp&tool=forecast&args=eyJjaXR5IjoiU0YifQ
```

**Share in chat mode:**
```
https://hoot.app/chat?s=weather:https://api.weather.com/mcp&view=hybrid
```

## How It Works

1. **Auto-sync:** URL updates automatically when you select servers or tools
2. **Server references:** When you select a server, App.tsx creates a `name:url` reference and syncs it to the URL
3. **Server matching:** When loading a URL, matches by URL first, then by name + normalized URL
4. **Missing servers:** Shows "Add Server" modal if referenced server doesn't exist
5. **Auto-detection:** Automatically detects transport and auth when adding from URL

## Implementation

The URL sync happens in two phases:

1. **State → URL:** When you select a server in the UI, `App.tsx` effect detects the change and creates a server reference (`createServerReference(name, url)`) which is written to the URL
2. **URL → State:** On page load or URL changes, `App.tsx` parses the server reference and selects the matching server

### Key Files

- `src/hooks/useURLState.ts` - URL read/write utilities and reference encoding/decoding
- `src/components/TryInHootHandler.tsx` - Handles server references from URLs for new servers
- `src/App.tsx` - Bidirectional state ↔ URL sync (handles both directions)
- `src/components/ServerSidebar.tsx` - Server selection (only updates state, not URL directly)

### Security

- No sensitive data (tokens, keys) in URLs
- Server addition requires explicit user action
- Auth detection prompts for credentials when needed

## Special Handling

**Server names with colons:** Encoded with `encodeURIComponent` to prevent parsing issues
```typescript
encodeServerName(name.replace(/:/g, '%3A'))
```

**Tool parameter preservation:** During initial load, tool param preserved until server tools are loaded, preventing premature clearing.
