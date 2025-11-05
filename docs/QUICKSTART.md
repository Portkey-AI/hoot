# Hoot Quick Start Guide

Get up and running with Hoot quickly!

## 🚀 Getting Started

The application runs at: **http://localhost:8009**

## Installation

```bash
npx -y @portkey-ai/hoot
```

Or install globally:
```bash
npm install -g @portkey-ai/hoot
hoot
```

## Transport Support

Hoot supports multiple MCP transports:

- ✅ **HTTP** - Standard REST endpoints (recommended)
- ✅ **SSE (Server-Sent Events)** - Real-time streaming
- ❌ **stdio** - Requires desktop app (not available in browser)

> **Note:** The `stdio` transport needs Node.js APIs like `child_process` to spawn local processes. Browsers can't do this for security reasons. Use HTTP or SSE for browser-based connections.

## 🛠️ Adding Your First Server

### Option 1: Auto-Detection (Recommended)

If you have an MCP server URL, Hoot can auto-detect everything:

1. Click **"+ Add Server"**
2. Enter server URL: `https://mcp.example.com`
3. Click **"Detect & Connect"**
4. Hoot will automatically:
   - Detect transport type (HTTP or SSE)
   - Get server name and version
   - Detect authentication requirements
5. Click **"Add & Connect"**

### Option 2: Manual Configuration

1. Click **"+ Add Server"**
2. Enter server details:
   - Name: `My Server`
   - Transport: **HTTP** or **SSE**
   - URL: `https://mcp.example.com`
3. Configure authentication if needed
4. Click **"Connect"**

## Testing with a Sample Server

Here's how to create a simple test server:

// test-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

const server = new Server(
  { name: 'test-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Add a test tool
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'echo',
    description: 'Echo back the input',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' }
      },
      required: ['message']
    }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'echo') {
    return {
      content: [{
        type: 'text',
        text: `Echo: ${request.params.arguments.message}`
      }]
    };
  }
  throw new Error('Unknown tool');
});

// SSE endpoint
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.listen(8080, () => {
  console.log('MCP SSE server running on http://localhost:8080/sse');
});
```

Install dependencies:
```bash
npm install @modelcontextprotocol/sdk express cors
```

Run:
```bash
node test-server.js
```

Then in Hoot:
- Enter URL: `http://localhost:8080/sse`
- Click "Detect & Connect"
- Start testing!

## 🎯 Running from Source

```bash
git clone <repo>
npm install
npm run dev:full
```

Backend runs on 8008, frontend on 8009.

## 🐛 Troubleshooting

**Server won't connect?**
- Check the server URL is correct
- Ensure CORS is enabled on your MCP server
- Check browser console for errors

**No tools showing?**
- Verify the server implements `tools/list` handler
- Check connection status (green dot = connected)

**Blank screen?**
- Check browser console for errors
- Ensure dev server is running on http://localhost:8009
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

## Next Steps

- Read the [Architecture Overview](ARCHITECTURE.md)
- Learn about [Authentication](AUTHENTICATION.md)
- Explore [Try in Hoot](TRY_IN_HOOT.md) links
- Check [Troubleshooting](TROUBLESHOOTING.md) for common issues

