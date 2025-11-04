# Hoot Server

Multi-deployment server for Hoot MCP testing tool.

## 🚀 Deployment Options

### Option 1: Self-Hosted (Node.js + SQLite)

**Best for:** Local development, self-hosting, open source contributions

```bash
npm install
npm run server
```

- **Database:** SQLite at `~/.hoot/hoot-mcp.db`
- **Port:** 8008 (configurable via `PORT` env var)
- **Storage:** Local filesystem

### Option 2: Cloudflare Workers + Durable Objects

**Best for:** Production hosting, global scale, multi-tenant SaaS

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put JWT_PRIVATE_KEY
wrangler secret put JWT_JWKS
wrangler secret put PORTKEY_ORG_ID
wrangler secret put PORTKEY_WORKSPACE_SLUG

# Deploy
npm run deploy:cloudflare
```

- **Database:** Durable Objects (strong consistency)
- **Compute:** Edge functions (global, instant)
- **Storage:** Distributed globally

## 📁 Structure

```
server/
├── adapters/           # Database adapters
│   ├── database.js     # Base interface
│   ├── sqlite.js       # Node.js implementation
│   └── durable-objects.js  # Workers implementation
├── durable-objects/    # Cloudflare DO classes
│   ├── user-data-do.js
│   └── favicon-cache-do.js
├── lib/                # Shared utilities
│   ├── handlers.js     # Route handlers
│   ├── jwt.js          # JWT management
│   ├── utils.js        # Audit logging, rate limiting
│   ├── client-manager.js  # MCP client management
│   └── tool-filter.js  # Tool filtering
├── server-node.js      # Node.js entry point
└── server-worker.js    # Workers entry point
```

## 🔧 Configuration

### Environment Variables (Node.js)

```bash
PORT=8008
FRONTEND_URL=http://localhost:8009
PORTKEY_ORG_ID=your-org-id
PORTKEY_WORKSPACE_SLUG=your-workspace
JWT_PRIVATE_KEY_PATH=./private-key.json
DEBUG=true
```

### Secrets (Cloudflare Workers)

Use `wrangler secret put` to set:
- `JWT_PRIVATE_KEY` - JWT private key (JSON string)
- `JWT_JWKS` - Public keys (JSON string)
- `PORTKEY_ORG_ID` - Portkey organization ID
- `PORTKEY_WORKSPACE_SLUG` - Portkey workspace slug

### JWT Key Generation

```bash
node -e "
const { generateKeyPair, exportJWK } = require('jose');
const { randomUUID } = require('crypto');
const fs = require('fs');

(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  
  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';
  publicJwk.kid = randomUUID();
  
  const privateJwk = await exportJWK(privateKey);
  privateJwk.kid = publicJwk.kid;
  
  fs.writeFileSync('jwks.json', JSON.stringify({ keys: [publicJwk] }, null, 2));
  fs.writeFileSync('private-key.json', JSON.stringify(privateJwk, null, 2));
  
  console.log('✅ Keys generated: jwks.json, private-key.json');
})();
"
```

**⚠️ Important:** Add `private-key.json` to `.gitignore`!

## 🔒 Security Features

- **JWT Authentication** - Stateless, short-lived tokens
- **Rate Limiting** - 30 requests/minute per server
- **Audit Logging** - All auth and tool execution events
- **CORS Protection** - Configured allowed origins
- **Multi-tenant isolation** - User data scoped by UUID

## 🗄️ Database

### SQLite (Node.js)

- **Location:** `~/.hoot/hoot-mcp.db`
- **Mode:** WAL (Write-Ahead Logging)
- **Schema:** Multi-tenant with `user_id` scoping
- **Migration:** Automatic from old schema

### Durable Objects (Workers)

- **Storage:** Per-user Durable Objects
- **Consistency:** Strong (no replication lag)
- **Caching:** In-memory after first read
- **Isolation:** Each user = separate DO instance

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/token` | Get JWT token |
| GET | `/health` | Health check |
| POST | `/mcp/auto-detect` | Auto-detect server config |
| POST | `/mcp/connect` | Connect to MCP server |
| POST | `/mcp/disconnect` | Disconnect from server |
| POST | `/mcp/clear-oauth-tokens` | Clear OAuth credentials |
| GET | `/mcp/server-info/:id` | Get server information |
| GET | `/mcp/oauth-metadata/:id` | Get OAuth metadata |
| POST | `/mcp/favicon` | Fetch server favicon |
| GET | `/mcp/favicon-proxy` | Proxy favicon image |
| GET | `/mcp/tools/:id` | List server tools |
| POST | `/mcp/execute` | Execute tool |
| GET | `/mcp/status/:id` | Get connection status |
| GET | `/mcp/connections` | List all connections |
| POST | `/mcp/tool-filter/initialize` | Initialize tool filter |
| POST | `/mcp/tool-filter/filter` | Filter tools by context |
| GET | `/mcp/tool-filter/stats` | Get filter stats |
| POST | `/mcp/tool-filter/clear-cache` | Clear filter cache |

## 🧪 Development

```bash
# Run server
npm run server

# Run full stack (server + frontend)
npm run dev:full

# Test server only
curl http://localhost:8008/health
```

## 📦 Dependencies

### Node.js Only
- `better-sqlite3` - Fast SQLite driver
- `express` - Web framework

### Workers Only
- Cloudflare runtime APIs
- Durable Objects storage

### Shared
- `@modelcontextprotocol/sdk` - MCP client
- `jose` - JWT operations
- `jsonwebtoken` - JWT validation (Node.js)
- `jwk-to-pem` - Key conversion (Node.js)

## 🔄 Migration from Old Server

The new server structure is **100% backward compatible**:

- ✅ Same API endpoints
- ✅ Same database schema (with automatic migration)
- ✅ Same JWT authentication
- ✅ Same OAuth flow
- ✅ Same environment variables

Just update your `npm run server` command and you're good to go!

## 🤝 Contributing

When adding new features:

1. Add to shared `handlers.js` if possible
2. Update both `server-node.js` and `server-worker.js`
3. Add database methods to both adapters
4. Test in both Node.js and Workers environments

## 📝 License

MIT - See LICENSE file

