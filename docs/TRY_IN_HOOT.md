# Try in Hoot 🦉

The "Try in Hoot" feature allows users to add MCP servers with a single click. Perfect for sharing servers, quick-start examples, or building galleries of available MCP servers.

## Quick Start

### For Users

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

### For MCP Server Authors

**The Easiest Way: Just Share Your URL**

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

## How It Works

When a user clicks a "Try in Hoot" link:

1. Hoot opens and parses the server configuration from the URL
2. A friendly confirmation modal shows the server details (with Hoot branding! 🦉)
3. User confirms and Hoot adds and connects to the server automatically
4. If OAuth is required, the user is redirected to authorize

You can also provide just a URL and Hoot will auto-detect everything:
- Transport type (HTTP or SSE)
- Server name and version
- OAuth requirements

## URL Format

"Try in Hoot" links use a simple URL parameter containing base64-encoded JSON configuration:

```
https://hoot.app/?try=<base64-encoded-config>
```

### Configuration Format

The JSON configuration can be **simple** (just a URL) or **detailed**:

#### Simple Mode (Auto-Detection) - Recommended

```json
{
  "url": "https://mcp.example.com"
}
```

Hoot will automatically detect:
- Transport type (tries HTTP, then SSE)
- Server name and version
- OAuth requirements

#### Full Configuration Mode

```json
{
  "name": "Server Name",
  "transport": "http|sse|stdio",
  "url": "https://api.example.com/mcp",
  "command": "node server.js",
  "auth": {
    "type": "none|headers|oauth",
    "headers": {
      "Authorization": "Bearer token"
    }
  }
}
```

**Required fields:**
- Simple mode: Just `url`
- Full mode: `name` and `transport`

**Transport-specific fields:**
- `url`: Required for `http` and `sse` transports
- `command`: Required for `stdio` transport

**Optional fields:**
- `auth`: Authentication configuration

## Generating Links

### Option A: Interactive Generator (Easiest)

```bash
open examples/try-in-hoot-generator.html
```

Fill in your server details and copy the generated link.

### Option B: Use Code

```javascript
import { generateTryInHootLink } from '@portkey-ai/hoot/lib/tryInHootLinks';

const link = generateTryInHootLink({
  name: "My MCP Server",
  transport: "http",
  url: "https://my-server.com/mcp"
});

console.log(link);
```

### Option C: Manual Bash

```bash
# Create config JSON
config='{"name":"My Server","transport":"http","url":"http://localhost:3000"}'

# Base64 encode
encoded=$(echo -n "$config" | base64)

# Create URL
echo "https://hoot.app/?try=$encoded"
```

## Adding Buttons to Your Documentation

### Markdown (Recommended)

```markdown
[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1)](YOUR_GENERATED_LINK)
```

### HTML

```html
<a href="YOUR_GENERATED_LINK" 
   style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; 
          background: #6366f1; color: white; text-decoration: none; border-radius: 6px; 
          font-weight: 600;">
  <span>🚀</span>
  <span>Try in Hoot</span>
</a>
```

### Example README Integration

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

### Server with API Key Authentication

```json
{
  "name": "GitHub MCP Server",
  "transport": "http",
  "url": "https://github-mcp.example.com",
  "auth": {
    "type": "headers",
    "headers": {
      "Authorization": "Bearer ghp_YourTokenHere"
    }
  }
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

### SSE Server

```json
{
  "name": "Real-time Notifications",
  "transport": "sse",
  "url": "https://notifications-mcp.example.com/events"
}
```

### Stdio Server (Desktop Only)

```json
{
  "name": "Local File Server",
  "transport": "stdio",
  "command": "node /path/to/file-server.js"
}
```

**Note:** stdio transport requires the Hoot desktop app and won't work in the browser.

## Security Considerations

### For Users

⚠️ **Only use "Try in Hoot" links from trusted sources!**

MCP servers can:
- Execute arbitrary code
- Access files and resources
- Make network requests
- Interact with APIs on your behalf

Hoot shows a friendly confirmation modal (with our owl mascot 🦉) before adding any server, displaying:
- Server name (auto-detected or provided)
- Transport type
- URL/command
- Authentication requirements
- A friendly reminder: "Only add servers from trusted sources"

Always review this information carefully before confirming.

### For Server Authors

When creating "Try in Hoot" links:

#### ✅ DO:
- Keep it simple: just share the URL and let Hoot auto-detect
- Use descriptive server names (if providing full config)
- Test links before sharing
- Use OAuth for production servers
- Document what your server does
- Provide setup instructions for API keys

#### ❌ DON'T:
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

## API Reference

### `generateTryInHootLink(config, baseUrl?)`

Generates a "Try in Hoot" URL.

**Parameters:**
- `config: TryInHootConfig` - Server configuration
- `baseUrl?: string` - Base URL (default: current origin)

**Returns:** `string` - Shareable URL

**Example:**
```typescript
const link = generateTryInHootLink({
  name: "My Server",
  transport: "http",
  url: "http://localhost:3000"
});
```

### `generateTryInHootButton(config, baseUrl?)`

Generates HTML for a styled button.

**Returns:** `string` - HTML string

### `generateTryInHootMarkdown(config, baseUrl?)`

Generates a Markdown badge with link.

**Returns:** `string` - Markdown string

### `decodeTryInHootLink(url)`

Decodes a "Try in Hoot" link (useful for testing).

**Parameters:**
- `url: string` - Full URL or encoded parameter

**Returns:** `TryInHootConfig` - Decoded configuration

**Example:**
```typescript
const config = decodeTryInHootLink('https://hoot.app/?try=eyJuYW1l...');
console.log(config.name); // "My Server"
```

## Testing Your Links

1. Generate your link using one of the methods above
2. Test it locally: `http://localhost:8009/?try=<encoded-config>`
3. Open in browser and verify the configuration appears correctly
4. Confirm and test the connection

## Troubleshooting

### "Invalid Link" Error

- Check that your JSON is valid
- Ensure base64 encoding is correct
- Verify all required fields are present

### Connection Fails After Adding

- Verify the server URL is accessible
- Check authentication configuration
- Ensure the server is running and responding to MCP requests

### OAuth Not Working

- Verify your server implements MCP OAuth correctly
- Check that the OAuth endpoints are accessible
- Ensure callback URL is configured properly

## Best Practices

1. **Keep it simple**: Just provide the URL and let Hoot auto-detect the rest
2. **Test your links** before sharing them
3. **Use descriptive names** if providing full configuration
4. **Document prerequisites** (API keys, permissions, etc.)
5. **Keep links updated** if your server configuration changes
6. **Consider hosting a landing page** with server information and the "Try in Hoot" button

## Try the Demo

Open the demo gallery to see the feature in action:
```bash
open examples/try-in-hoot-demo.html
```

## Need Help?

- Open an [issue](https://github.com/Portkey-AI/hoot/issues)
- See [examples](../examples/)

---

**Made with 🦉 by Hoot**
