# Screech v0.1 - Browser Version

## 🚀 Getting Started

The application should now be running at: **http://localhost:3000**

## ⚠️ Important: Transport Limitations

### Browser Version (Current)
The browser version currently supports:
- ✅ **SSE (Server-Sent Events)** - Recommended
- ✅ **HTTP** - Standard REST endpoints
- ❌ **stdio** - Requires desktop app (not available in browser)

### Why stdio doesn't work in browser?
The `stdio` transport needs Node.js APIs like `child_process` to spawn local processes. Browsers can't do this for security reasons.

## 🛠️ Testing the App

### Option 1: Use SSE/HTTP MCP Server
If you have an MCP server running on SSE or HTTP, you can test immediately:

1. Click **"+ Add Server"**
2. Enter server details:
   - Name: `My Test Server`
   - Transport: **SSE** or **HTTP**
   - URL: `http://localhost:8080/sse` (your server URL)
3. Click **Connect**

### Option 2: Create a Simple SSE MCP Server

Create a test server:

```javascript
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

Then in Screech:
- Add Server
- Transport: SSE
- URL: `http://localhost:8080/sse`

## 🎯 Next Steps

### For Full stdio Support:
We'll need to build a **desktop version** using:
- **Electron** (like Postman)
- **Tauri** (lightweight Rust-based)

This would give us:
- Full stdio support
- Local file system access
- Native OS integration
- Better performance

### Quick Workaround: Backend Proxy
Alternatively, we could create a small Node.js backend that:
1. Accepts connections from the browser
2. Proxies to stdio MCP servers
3. Returns results via WebSocket/SSE

Would you like me to:
1. **Build an Electron version** (full desktop app)?
2. **Create a backend proxy** (browser + Node.js backend)?
3. **Continue with SSE/HTTP only** (simplest, works now)?

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
- Ensure dev server is running on http://localhost:3000
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

