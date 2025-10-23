# CORS Issues & Solutions

## 🚫 The Problem

When connecting to `https://mcp.deepwiki.com/mcp`, you're seeing CORS errors:

```
Access to fetch at 'https://mcp.deepwiki.com/mcp' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

This is a **browser security feature** - not a bug in Screech!

## ✅ Solutions

### 1. Use Vite Proxy (Development)

I've added a proxy to `vite.config.ts`. Now use:
- URL: `http://localhost:3000/api/mcp` (instead of the direct URL)
- The proxy will forward to `https://mcp.deepwiki.com/mcp` without CORS issues

### 2. Ask Server Owner to Enable CORS

The server needs these headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 3. Use a Local MCP Server

Create your own MCP server that you control:

```javascript
// local-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors()); // ✅ CORS enabled!
app.use(express.json());

const server = new Server(
  { name: 'local-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'echo',
    description: 'Echo back your input',
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
      content: [{ type: 'text', text: `Echo: ${request.params.arguments.message}` }]
    };
  }
  throw new Error('Unknown tool');
});

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.listen(8080, () => {
  console.log('✅ MCP server at http://localhost:8080/sse');
  console.log('✅ No CORS issues!');
});
```

Run:
```bash
npm install @modelcontextprotocol/sdk express cors
node local-mcp-server.js
```

Then in Screech:
- URL: `http://localhost:8080/sse`
- Works perfectly! ✅

### 4. Build Electron Desktop App

Desktop apps don't have CORS restrictions! This is why tools like Postman use Electron.

Would you like me to set up an Electron version?

### 5. Browser Extension (Advanced)

Use a CORS-bypass extension like "CORS Unblock" (dev only, not for production)

## 🎯 Recommended Approach

**For Development:**
1. Use the Vite proxy I just added
2. Or run a local MCP server (see above)

**For Production:**
1. Build an Electron/Tauri desktop app
2. Or ensure MCP servers you connect to have CORS enabled

## 🚀 Quick Test Now

1. Restart the dev server:
   ```bash
   npm run dev
   ```

2. In Screech, add server with:
   - URL: `http://localhost:3000/api/mcp`
   - This will proxy through Vite!

Or create a local test server with the code above. No CORS issues! 🎉

