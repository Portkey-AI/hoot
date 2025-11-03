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

1. **Auto-sync:** URL updates when you select servers/tools or change views
2. **Server matching:** Matches by URL first, then by name + normalized URL
3. **Missing servers:** Shows "Add Server" modal if referenced server doesn't exist
4. **Auto-detection:** Automatically detects transport and auth when adding from URL

## Implementation

Uses existing `TryInHootHandler` component to handle all URL formats:
- Legacy: `?try=<base64>`
- Legacy ID: `?server=abc-123`
- **New: Server reference:** `?s=name:url`

### Key Files

- `src/hooks/useURLState.ts` - URL read/write utilities
- `src/components/TryInHootHandler.tsx` - Handles server references from URLs
- `src/App.tsx` - Bidirectional state ↔ URL sync

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
