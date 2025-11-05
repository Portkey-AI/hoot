# Cross-Runtime Server Development Guidelines

Hoot's server runs on **both Node.js and Cloudflare Workers**. Follow these guidelines to maintain compatibility.

---

## Core Principles

**1. Business logic → `server/lib/handlers.js` (shared)**  
**2. Storage → `DatabaseAdapter` interface (abstracted)**  
**3. Connections → `ConnectionPool` interface (abstracted)**  
**4. New endpoints → Add to BOTH entry points**

---

## File Organization

```
server/
├── server-node.js              ← Node.js (Express)
├── server-worker.js            ← Workers (fetch handler)
│
├── lib/                        ← Shared business logic
│   ├── handlers.js             ← MCP operations (USE THIS)
│   ├── jwt.js, utils.js, ...  ← Shared utilities
│   └── connection-pool.js      ← Abstract interface
│
├── adapters/                   ← Runtime-specific implementations
│   ├── database.js             ← Base interface
│   ├── sqlite.js               ← Node.js implementation
│   ├── durable-objects.js      ← Workers implementation
│   ├── connection-pool-node.js
│   └── connection-pool-workers.js
│
└── durable-objects/            ← Workers-only storage
```

---

## Adding New Functionality

### Business Logic
✅ Add to `server/lib/handlers.js`:
```javascript
export async function newFeature({ serverId, connectionPool, db }) {
  // Shared logic that works in both runtimes
  return result;
}
```

❌ Don't put logic in entry points:
```javascript
// BAD - duplicating logic
app.post('/endpoint', async (req, res) => {
  const client = await pool.getClient(serverId);
  // ... business logic here ...
});
```

### Database Operations
✅ Add method to all three files:
```javascript
// 1. server/adapters/database.js (interface)
async saveNewData(userId, data) { throw new Error('Not implemented'); }

// 2. server/adapters/sqlite.js (Node.js)
async saveNewData(userId, data) { /* SQLite implementation */ }

// 3. server/adapters/durable-objects.js (Workers)
async saveNewData(userId, data) { /* DO implementation */ }
```

### API Endpoints
✅ Add to BOTH entry points using shared handler:
```javascript
// server-node.js
app.post('/mcp/new', async (req, res) => {
  const result = await newFeature({ ...req.body, userId: req.userId, db, connectionPool });
  res.json(result);
});

// server-worker.js
if (pathname === '/mcp/new' && method === 'POST') {
  const body = await request.json();
  const result = await newFeature({ ...body, userId, db, connectionPool });
  return jsonResponse(result);
}
```

---

## Runtime Differences

| Capability | Node.js | Workers | Solution |
|------------|---------|---------|----------|
| File I/O | ✅ `fs.readFileSync()` | ❌ | Use env vars for Workers |
| Persistent memory | ✅ Across requests | ❌ Per-request only | Use Durable Objects |
| Database | SQLite file | Durable Objects | Use `DatabaseAdapter` |
| Child processes | ✅ `execSync()` | ❌ | Avoid or abstract |

### Compatible APIs (use these):
- `fetch()` - networking
- `crypto.subtle` - cryptography  
- `TextEncoder/TextDecoder` - text processing
- Web Streams API

### Incompatible (avoid):
- Node.js `fs`, `child_process`, `net`
- Packages that depend on the above

---

## Quick Checklist

When making server changes:

```
[ ] Logic in shared handlers (lib/)
[ ] Database via DatabaseAdapter interface
[ ] Connections via ConnectionPool interface
[ ] New endpoint added to BOTH entry points
[ ] Tested in Node.js (npm run dev:backend)
[ ] Tested in Workers (wrangler deploy --env staging)
[ ] Same response structure in both
```

---

## Decision Tree

```
Adding business logic?     → server/lib/handlers.js
Adding database operation? → DatabaseAdapter + both implementations  
Adding connection feature? → ConnectionPool + both implementations
Adding API endpoint?       → Both entry points + shared handler
Runtime-specific code?     → Document why, keep minimal
```

---

## Testing

```bash
# Node.js
npm run dev:backend
curl http://localhost:8008/your-endpoint

# Workers
wrangler deploy --env staging
curl https://your-worker.workers.dev/your-endpoint
```

Verify identical behavior in both.

---

## Common Mistakes

❌ Direct database access: `db.db.prepare('SELECT...')`  
✅ Use adapter: `await db.getOAuthTokens(userId, serverId)`

❌ Direct connection access: `pool.connections.get(id)`  
✅ Use interface: `await pool.getClient(serverId)`

❌ Logic in entry points  
✅ Logic in shared handlers

❌ Testing only one runtime  
✅ Test both before committing

---

**Goal**: Write once, run everywhere. Use abstractions, test both runtimes.

