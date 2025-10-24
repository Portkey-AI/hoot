# Try in Hoot

The "Try in Hoot" feature allows users to add MCP servers to Hoot with a single click. This is perfect for sharing MCP servers, adding quick-start examples to documentation, or building galleries of available servers.

## How It Works

When a user clicks a "Try in Hoot" link:

1. Hoot opens and parses the server configuration from the URL
2. A confirmation dialog shows the server details (for security)
3. User confirms and Hoot adds the server and connects automatically

## URL Format

"Try in Hoot" links use a simple URL parameter containing base64-encoded JSON configuration:

```
https://hoot.app/?try=<base64-encoded-config>
```

### Configuration Format

The JSON configuration has the following structure:

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
- `name`: Display name for the server
- `transport`: Transport type (`http`, `sse`, or `stdio`)

**Transport-specific fields:**
- `url`: Required for `http` and `sse` transports
- `command`: Required for `stdio` transport

**Optional fields:**
- `auth`: Authentication configuration (see below)

## Generating Links

### Programmatically (TypeScript/JavaScript)

Hoot provides utilities for generating "Try in Hoot" links:

```typescript
import { generateTryInHootLink } from './lib/tryInHootLinks';

const link = generateTryInHootLink({
  name: "Weather MCP Server",
  transport: "http",
  url: "https://weather-mcp.example.com"
});

console.log(link);
// Output: https://hoot.app/?try=eyJuYW1lIjoiV2VhdGhlciBNQ1A...
```

### Manually

1. Create your configuration JSON
2. Base64 encode it
3. Append as `?try=` parameter to Hoot URL

**Example (using command line):**

```bash
# Create config
echo '{"name":"Weather Server","transport":"http","url":"http://localhost:3000"}' | base64

# Use the output in URL:
# https://hoot.app/?try=eyJuYW1lIjoiV2VhdGhlciBTZXJ2ZXIiLCJ0cmFuc3BvcnQiOiJodHRwIiwidXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIn0=
```

## Adding Buttons to Your Documentation

### HTML Button

```html
<a href="https://hoot.app/?try=eyJuYW1lIjoiV2VhdGhlciBTZXJ2ZXIi..." 
   style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
  <span>🚀</span>
  <span>Try in Hoot</span>
</a>
```

Or use the generator:

```typescript
import { generateTryInHootButton } from './lib/tryInHootLinks';

const html = generateTryInHootButton({
  name: "Weather MCP Server",
  transport: "http",
  url: "https://weather-mcp.example.com"
});
```

### Markdown Badge

```markdown
[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1)](https://hoot.app/?try=eyJuYW1lIjoiV2VhdGhlciBTZXJ2ZXIi...)
```

Or use the generator:

```typescript
import { generateTryInHootMarkdown } from './lib/tryInHootLinks';

const markdown = generateTryInHootMarkdown({
  name: "Weather MCP Server",
  transport: "http",
  url: "https://weather-mcp.example.com"
});
```

## Examples

### Simple HTTP Server

```json
{
  "name": "Weather MCP Server",
  "transport": "http",
  "url": "https://weather-mcp.example.com"
}
```

**Link:** [Try Weather Server](https://hoot.app/?try=eyJuYW1lIjoiV2VhdGhlciBNQ1AgU2VydmVyIiwidHJhbnNwb3J0IjoiaHR0cCIsInVybCI6Imh0dHBzOi8vd2VhdGhlci1tY3AuZXhhbXBsZS5jb20ifQ==)

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

### Server with OAuth

```json
{
  "name": "Google Drive MCP",
  "transport": "http",
  "url": "https://drive-mcp.example.com",
  "auth": {
    "type": "oauth"
  }
}
```

**Note:** For OAuth servers, users will be prompted to authenticate through the OAuth flow after adding the server.

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

Hoot shows a confirmation dialog before adding any server from a link, displaying:
- Server name
- Transport type
- URL/command
- Authentication requirements

Always review this information carefully before confirming.

### For Server Authors

When creating "Try in Hoot" links:

1. **Never include sensitive credentials** in the URL
   - ❌ Don't: Include API keys or tokens in `auth.headers`
   - ✅ Do: Use OAuth or prompt users to add their own keys

2. **Use HTTPS for production servers**
   - Ensure your MCP server uses TLS/SSL

3. **Document what your server does**
   - Be transparent about capabilities and data access
   - Link to source code and documentation

4. **Consider rate limiting**
   - Protect your server from abuse
   - Implement proper authentication

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
2. Test it locally: `http://localhost:5173/?try=<encoded-config>`
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

## Integration Examples

### GitHub README

```markdown
# My MCP Server

A powerful MCP server for X, Y, and Z.

[![Try in Hoot](https://img.shields.io/badge/Try%20in-Hoot-6366f1)](https://hoot.app/?try=YOUR_ENCODED_CONFIG)

## Installation

Or add manually:
...
```

### Documentation Site

```html
<div class="quickstart">
  <h2>Quick Start</h2>
  <p>Try our MCP server instantly:</p>
  <a href="https://hoot.app/?try=YOUR_ENCODED_CONFIG" class="try-button">
    🚀 Try in Hoot
  </a>
</div>
```

### MCP Server Gallery

```html
<div class="server-card">
  <h3>Weather Server</h3>
  <p>Get weather data for any location</p>
  <a href="https://hoot.app/?try=...">Try in Hoot</a>
</div>
```

## Best Practices

1. **Test your links** before sharing them
2. **Use descriptive names** for your servers
3. **Document prerequisites** (API keys, permissions, etc.)
4. **Keep links updated** if your server configuration changes
5. **Consider hosting a landing page** with server information and the "Try in Hoot" button

## Future Enhancements

Planned features:
- Deep linking for specific tools within a server
- QR codes for easy mobile access
- Server configuration templates
- Link expiration and versioning
- Analytics for link usage (opt-in)

## Contributing

Have ideas for improving "Try in Hoot"? See [CONTRIBUTING.md](../CONTRIBUTING.md).

