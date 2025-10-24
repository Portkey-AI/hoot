# Quick Start: "Try in Hoot" Feature

## For Users

Click any "Try in Hoot" link to instantly add an MCP server:

1. Click a "Try in Hoot" button/link
2. Review server details in the confirmation dialog
3. Click "Add & Connect"
4. Start using the server!

**Example link to try:**
```
http://localhost:8009/?try=eyJuYW1lIjoiV2VhdGhlciBNQ1AgU2VydmVyIiwidHJhbnNwb3J0IjoiaHR0cCIsInVybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJ9
```

## For MCP Server Authors

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

### Simple HTTP Server
```json
{
  "name": "Weather Server",
  "transport": "http",
  "url": "http://localhost:3000"
}
```

### Server with API Key
```json
{
  "name": "GitHub Server",
  "transport": "http",
  "url": "https://api.example.com",
  "auth": {
    "type": "headers",
    "headers": {
      "Authorization": "Bearer DEMO_TOKEN"
    }
  }
}
```

**⚠️ Important:** Use demo/placeholder tokens only! Never share real credentials.

### Server with OAuth
```json
{
  "name": "Google Drive",
  "transport": "http",
  "url": "https://drive-mcp.example.com",
  "auth": {
    "type": "oauth"
  }
}
```

### SSE Server
```json
{
  "name": "Real-time Server",
  "transport": "sse",
  "url": "https://events.example.com"
}
```

## Security Best Practices

✅ **DO:**
- Use descriptive server names
- Test links before sharing
- Use OAuth for production servers
- Document what your server does
- Provide setup instructions for API keys

❌ **DON'T:**
- Include real API keys or secrets
- Share production credentials
- Use unencrypted HTTP for sensitive data
- Link to untrusted servers

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

