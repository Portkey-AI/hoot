# Hoot Test Infrastructure

Production-ready test MCP server with OAuth 2.1 for comprehensive Hoot testing.

## Quick Start

```bash
# Interactive demo
npm run test:quick-start

# Start test server manually
npm run test:server

# Run tests
npm test
```

## Test Server Endpoints

| Endpoint | URL |
|----------|-----|
| MCP | `http://localhost:9000/mcp` |
| Health | `http://localhost:9000/health` |
| OAuth Discovery | `http://localhost:9001/.well-known/oauth-authorization-server` |
| OAuth Authorize | `http://localhost:9001/oauth/authorize` |
| OAuth Token | `http://localhost:9001/oauth/token` |

## Test Credentials

| Type | Client ID | Secret | API Key |
|------|-----------|--------|---------|
| OAuth Public | `test-client-public` | - | - |
| OAuth Confidential | `test-client-confidential` | `test-secret-123` | - |
| API Key | - | - | `test-api-key-valid` |

## Available Tools

| Tool | Description |
|------|-------------|
| `echo` | Echo back input |
| `add` | Add two numbers |
| `get_weather` | Mock weather data |
| `complex_tool` | Nested parameters |
| `long_running_task` | Simulated delay |
| `error_generator` | Generate errors |

## Usage in Tests

```javascript
import { TestServerManager } from './helpers/server-manager.js';
import { validServerConfigs, toolTestCases } from './helpers/test-data.js';

describe('My Tests', () => {
  let server;
  
  beforeAll(async () => {
    server = new TestServerManager();
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  it('should work', async () => {
    // server.mcpUrl, server.oauthUrl, server.getTestCredentials()
  });
});
```

## Manual Testing with Hoot

```bash
# Terminal 1: Test server
npm run test:server

# Terminal 2: Hoot backend  
npm run server

# Terminal 3: Hoot frontend
npm run dev
```

Connect Hoot to `http://localhost:9000/mcp` with OAuth using custom endpoints.

## Architecture

```
tests/
├── mock-servers/
│   └── test-mcp-server.js    # MCP + OAuth server (~900 lines)
├── helpers/
│   ├── server-manager.js     # Server lifecycle
│   └── test-data.js          # Test fixtures
├── example-mcp-lifecycle.test.js
├── global-setup.js
└── quick-start.js
```

## Features

- ✅ Full MCP protocol (2025-11-25 spec)
- ✅ OAuth 2.1 with PKCE (required)
- ✅ Custom OAuth endpoints
- ✅ API key authentication
- ✅ Rate limiting, logging, health checks
- ✅ Comprehensive test fixtures
