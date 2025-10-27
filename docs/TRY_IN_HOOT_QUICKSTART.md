# Quick Start: "Try in Hoot" Feature 🦉

## For Users

Click any "Try in Hoot" link to instantly add an MCP server:

1. Click a "Try in Hoot" button/link
2. See the friendly Hoot owl 🦉 and server details
3. Watch auto-detection work its magic (if just a URL was provided)
4. Click "Add & Connect" or "Authorize →" for OAuth servers
5. Start using the server!

**Example link to try:**
```
http://localhost:8009/?try=eyJ1cmwiOiJodHRwczovL21jcC5kZWVwd2lraS5jb20vc3NlIn0=
```

## For MCP Server Authors

### The Easiest Way: Just Share Your URL

The simplest "Try in Hoot" link:

```bash
# Just your server URL
config='{"url":"https://mcp.yourserver.com"}'

# Base64 encode
encoded=$(echo -n "$config" | base64)

# Create URL
echo "https://hoot.app/?try=$encoded"
```

Hoot will auto-detect:
- ✅ Transport type (HTTP or SSE)
- ✅ Server name and version
- ✅ OAuth requirements

That's it! No need to specify everything manually.

### 1. Generate Your Link

**Option A: Use the Interactive Generator**
```bash
open examples/try-in-hoot-generator.html
```
Fill in your server details and copy the generated link.

**Option B: Use Code**
```javascript
import { generateTryInHootLink } from '@portkey-ai/hoot/lib/tryInHootLinks';

const link = generateTryInHootLink({
  name: "My MCP Server",
  transport: "http",
  url: "https://my-server.com/mcp"
});

console.log(link);
```

**Option C: Manually**
```bash
# Create config JSON
config='{"name":"My Server","transport":"http","url":"http://localhost:3000"}'

# Base64 encode
encoded=$(echo -n "$config" | base64)

# Create URL
echo "https://hoot.app/?try=$encoded"
```

### 2. Add Button to Your README

**Markdown (recommended):**
```markdown
[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1)](YOUR_GENERATED_LINK)
```

**HTML:**
```html
<a href="YOUR_GENERATED_LINK" 
   style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; 
          background: #6366f1; color: white; text-decoration: none; border-radius: 6px; 
          font-weight: 600;">
  <span>🚀</span>
  <span>Try in Hoot</span>
</a>
```

### 3. Example README Integration

```markdown
# My MCP Server

A powerful MCP server for doing X, Y, and Z.

[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1)](YOUR_LINK_HERE)

## Features
...
```

## Configuration Examples

### Simplest: Just URL (Recommended!)
```json
{
  "url": "https://mcp.deepwiki.com/sse"
}
```

Let Hoot handle the rest with auto-detection!

### Full Config: HTTP Server
```json
{
  "name": "Weather Server",
  "transport": "http",
  "url": "http://localhost:3000"
}
```

### OAuth Server (Can Be Simple Too!)
```json
{
  "url": "https://mcp.notion.com"
}
```

Hoot auto-detects OAuth and shows "Authorize →" button!

Or with explicit config:
```json
{
  "name": "Notion",
  "transport": "http",
  "url": "https://mcp.notion.com",
  "auth": {
    "type": "oauth"
  }
}
```

## Security Best Practices

✅ **DO:**
- Keep it simple: just share the URL and let Hoot auto-detect
- Use descriptive server names (if providing full config)
- Test links before sharing
- Use OAuth for production servers
- Document what your server does
- Provide setup instructions for API keys

❌ **DON'T:**
- Include real API keys or secrets in links
- Share production credentials
- Use unencrypted HTTP for sensitive data
- Link to untrusted servers

## What Users Will See

When someone clicks your "Try in Hoot" link:

1. **Friendly Welcome**: Hoot owl 🦉 greets them with "Try in Hoot - Add this server to get started"
2. **Auto-Detection Magic** (if URL-only):
   - Finding your server ✓
   - Checking how to connect ✓
   - Getting server details ✓
   - Checking if login is needed ✓
3. **Clean Display**: Modern card with cyan accents showing all detected info
4. **Clear Action**: "Add & Connect" button (or "Authorize →" for OAuth)
5. **Security Note**: Gentle reminder "Only add servers from trusted sources"

## Full Documentation

For complete documentation, see:
- [TRY_IN_HOOT.md](../docs/TRY_IN_HOOT.md) - Full documentation
- [TRY_IN_HOOT_IMPLEMENTATION.md](../docs/TRY_IN_HOOT_IMPLEMENTATION.md) - Technical details

## Try the Demo

Open the demo gallery to see the feature in action:
```bash
open examples/try-in-hoot-demo.html
```

## Need Help?

- Check the [full documentation](../docs/TRY_IN_HOOT.md)
- Open an [issue](https://github.com/Portkey-AI/hoot/issues)
- See [examples](../examples/)

---

**Made with 🦉 by Hoot**

