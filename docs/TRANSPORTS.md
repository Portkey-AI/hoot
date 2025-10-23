# Transport Implementation Details

## ✅ Proper Streamable HTTP Transport

Based on the official MCP TypeScript SDK documentation, we've implemented a proper **Streamable HTTP Client Transport**.

### Implementation
```typescript
class StreamableHTTPClientTransport implements Transport {
  private url: string;
  private sessionId?: string; // Session management
  
  async send(message: any): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionId && { 'X-MCP-Session-Id': this.sessionId }),
      },
      body: JSON.stringify(message),
    });
    
    // Handle both JSON and streaming responses
    if (contentType?.includes('application/json')) {
      // Single JSON-RPC response
    } else if (contentType?.includes('text/event-stream')) {
      // Streaming SSE response
    }
  }
}
```

### Key Features
1. **Session Management**: Maintains session ID via `X-MCP-Session-Id` header
2. **Dual Response Handling**: Supports both JSON and streaming responses
3. **Error Handling**: Proper error propagation
4. **Browser Compatible**: Uses native Fetch API

## 🔌 Transport Types in Screech

### 1. **stdio** (Desktop Only)
- Uses Node.js `child_process`
- Spawns local MCP server process
- **Requires**: Electron/Tauri
- **Browser**: ❌ Not available (security)

### 2. **SSE** (Server-Sent Events)
- Long-lived HTTP connection
- Server pushes events to client
- **Best for**: Real-time updates, streaming
- **Browser**: ✅ Fully supported
- **Example**: `http://localhost:8080/sse`

### 3. **HTTP** (Streamable HTTP)
- MCP's standard HTTP transport
- Supports both request/response and streaming
- **Best for**: Production servers, load balancing
- **Browser**: ✅ Fully supported
- **Example**: `http://localhost:3000/mcp`

## 🚀 MCP Protocol Support

### According to Official SDK Docs

From `@modelcontextprotocol/sdk`:
- ✅ **Server Side**: `StreamableHTTPServerTransport`
- ✅ **Client Side**: We implement `StreamableHTTPClientTransport`

### Server Example (from docs)
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

### Our Client Implementation
```typescript
const transport = new StreamableHTTPClientTransport(new URL(config.url));
await client.connect(transport);
```

## 📊 Transport Comparison

| Feature | stdio | SSE | Streamable HTTP |
|---------|-------|-----|-----------------|
| Browser Support | ❌ | ✅ | ✅ |
| Sessions | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ |
| Request/Response | ✅ | ✅ | ✅ |
| CORS Issues | N/A | Yes | Yes |
| Performance | ⚡⚡⚡ | ⚡⚡ | ⚡⚡ |
| MCP Standard | ✅ | ✅ | ✅ |

## 🎯 When to Use Each

**stdio**
- Local development
- Desktop apps (Electron/Tauri)
- Maximum performance
- No network overhead

**SSE**
- Browser apps with real-time needs
- Long-running operations
- Server can push notifications
- Simple server implementation

**Streamable HTTP**
- Production deployments
- RESTful architectures
- Load balanced environments
- Standard MCP protocol

## 🔧 Protocol Details

### Streamable HTTP Protocol

1. **Request Format**
```json
POST /mcp
Content-Type: application/json
X-MCP-Session-Id: <optional-session-id>

{ "jsonrpc": "2.0", "method": "tools/list", "id": 1 }
```

2. **Response Formats**

**JSON Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json
X-MCP-Session-Id: <session-id>

{ "jsonrpc": "2.0", "result": {...}, "id": 1 }
```

**Streaming Response:**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
X-MCP-Session-Id: <session-id>

data: {"jsonrpc":"2.0","result":{...},"id":1}

data: {"jsonrpc":"2.0","method":"notifications/progress","params":{...}}
```

## 📚 References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- Our implementation: `src/lib/mcpClient.ts`

