# Example MCP Server Configurations

Here are some example MCP server configurations you can use to test Screech:

## Example 1: Local stdio Server

**Server Name**: Local Test Server
**Transport**: stdio
**Command**: `node dist/index.js`

## Example 2: SSE Server

**Server Name**: Remote SSE Server
**Transport**: SSE
**URL**: `http://localhost:8080/sse`

## Example 3: HTTP Server

**Server Name**: HTTP API Server
**Transport**: HTTP
**URL**: `http://localhost:3001/mcp`

## Creating Your Own Test Server

### Simple Node.js MCP Server

```javascript
// server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'example-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register a simple tool
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'greet',
      description: 'Greet someone',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of person to greet',
          },
        },
        required: ['name'],
      },
    },
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'greet') {
    const name = request.params.arguments.name;
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${name}!`,
        },
      ],
    };
  }
  throw new Error('Unknown tool');
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

Run with: `node server.js`

Then in Screech:
- Add Server
- Transport: stdio
- Command: `node /path/to/server.js`

## Performance Tips

1. **Local stdio servers** are fastest (no network overhead)
2. **SSE** is good for real-time updates
3. **HTTP** is easiest for cross-platform testing

## Testing Multiple Servers

Screech lets you connect to multiple servers simultaneously. Try:
- A local development server (stdio)
- A staging server (SSE)
- A production server (HTTP)

Switch between them instantly from the sidebar!

