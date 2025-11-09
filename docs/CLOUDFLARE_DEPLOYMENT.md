# Deploying Hoot to Cloudflare

Complete guide for deploying Hoot with Cloudflare Pages (frontend) + Workers (server).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Cloudflare Pages                                   │
│  https://hoot.pages.dev                             │
│  ├── React Frontend (static)                        │
│  └── Connects to Workers via VITE_BACKEND_URL       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Cloudflare Workers                                 │
│  https://hoot-server.your-subdomain.workers.dev     │
│  ├── server/server-worker.js                        │
│  ├── Durable Objects (user data, favicon cache)     │
│  └── JWT authentication                             │
└─────────────────────────────────────────────────────┘
```

## Step 1: Deploy the Server (Workers)

### 1.1 Install Wrangler

```bash
npm install -g wrangler@latest
wrangler login
```

### 1.2 Generate JWT Keys

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

### 1.3 Set Secrets in Workers

```bash
# Set JWT private key (paste contents of private-key.json)
wrangler secret put JWT_PRIVATE_KEY

# Set JWKS (paste contents of jwks.json)
wrangler secret put JWT_JWKS

# Set Portkey credentials
wrangler secret put PORTKEY_ORG_ID
wrangler secret put PORTKEY_WORKSPACE_SLUG

# Optional: Set Cloudflare API Token (only needed for wrangler dev with remote = true)
# For production deployments, the Workers AI binding handles auth automatically
# wrangler secret put CLOUDFLARE_API_TOKEN
```

### 1.4 Update wrangler.jsonc

**Important:** Set your Cloudflare Account ID for Workers AI support:

```jsonc
{
  "name": "hoot-server",
  "main": "server/server-worker.js",
  "compatibility_date": "2024-11-04",
  "compatibility_flags": ["nodejs_compat"],
  
  // Workers AI binding for semantic tool filtering
  "ai": {
    "binding": "AI"
  },
  
  "durable_objects": {
    "bindings": [
      { "name": "USER_DATA", "class_name": "UserDataDO" },
      { "name": "FAVICON_CACHE", "class_name": "FaviconCacheDO" }
    ]
  },
  
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["UserDataDO", "FaviconCacheDO"]
    }
  ],
  
  "vars": {
    "FRONTEND_URL": "https://hoot.pages.dev",  // Update with your Pages URL
    "CLOUDFLARE_ACCOUNT_ID": "your-account-id-here"  // REQUIRED: Replace with your account ID
  },
  
  "env": {
    "production": {
      "name": "hoot-server-production",
      "vars": { 
        "FRONTEND_URL": "https://hoot.yourdomain.com",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id-here"  // REQUIRED: Replace with your account ID
      },
      "ai": {
        "binding": "AI"
      }
    }
  }
}
```

**Find your Account ID:**
- Cloudflare Dashboard → Overview → Account ID (right sidebar)
- Or run: `wrangler whoami`

### 1.5 Deploy Workers

```bash
npm run deploy:cloudflare
```

**Note the Workers URL** (e.g., `https://hoot-server.your-subdomain.workers.dev`)

## Step 2: Deploy the Frontend (Pages)

### 2.1 Build Frontend

The build script is pre-configured to use the production backend URL (`https://hoot-server-production.portkey-ai.workers.dev`).

To use a custom backend URL, you can either:

**Option A: Override with environment variable**
```bash
VITE_BACKEND_URL=https://hoot-server.your-subdomain.workers.dev npm run build
```

**Option B: Create `.env.production` file (optional)**
```bash
# Create .env.production file to permanently override
cat > .env.production << EOF
VITE_BACKEND_URL=https://hoot-server.your-subdomain.workers.dev
EOF
```

**Option C: Use default (Portkey production)**
```bash
npm run build
```

This creates a `dist/` folder with static files.

### 2.2 Deploy to Cloudflare Pages

#### Option A: Via Wrangler

```bash
npx wrangler pages deploy dist --project-name=hoot
```

#### Option B: Via Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Choose **"Direct Upload"**
4. Upload the `dist/` folder
5. Set **Build command**: `npm run build`
6. Set **Build output directory**: `dist`
7. Add environment variable:
   - Key: `VITE_BACKEND_URL`
   - Value: `https://hoot-server.your-subdomain.workers.dev`

#### Option C: Connect GitHub (Recommended)

1. Connect your GitHub repository
2. Set build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `VITE_BACKEND_URL` = `https://hoot-server.your-subdomain.workers.dev`
3. Cloudflare will auto-deploy on every push!

## Step 3: Configure CORS

Update `wrangler.jsonc` to allow your Pages domain:

```jsonc
{
  "vars": {
    "FRONTEND_URL": "https://hoot.pages.dev"
  }
}
```

Or set it as a secret:

```bash
wrangler secret put FRONTEND_URL
# Paste: https://hoot.pages.dev
```

Redeploy workers:

```bash
npm run deploy:cloudflare
```

## Step 4: Test Deployment

### 4.1 Test Workers Health

```bash
curl https://hoot-server.your-subdomain.workers.dev/health
```

Expected:
```json
{
  "status": "ok",
  "message": "MCP Backend Server is running (Cloudflare Workers)",
  "activeConnections": 0
}
```

### 4.2 Test Frontend

Visit `https://hoot.pages.dev` and:
1. Open DevTools → Network tab
2. Try connecting to a server
3. Verify requests go to your Workers URL

## Environment Variables Summary

### Frontend (.env.production)
```bash
VITE_BACKEND_URL=https://hoot-server.your-subdomain.workers.dev
```

### Workers (wrangler.jsonc or secrets)
```jsonc
{
  "vars": {
    "FRONTEND_URL": "https://hoot.pages.dev"
  }
  // Secrets (set via wrangler secret put):
  // - JWT_PRIVATE_KEY
  // - JWT_JWKS
  // - PORTKEY_ORG_ID
  // - PORTKEY_WORKSPACE_SLUG
}
```

## Custom Domain (Optional)

### For Workers

```jsonc
{
  "routes": [
    {
      "pattern": "api.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

Then update frontend env:
```bash
VITE_BACKEND_URL=https://api.yourdomain.com
```

### For Pages

In Cloudflare Dashboard:
1. Pages → Your Project → **Custom domains**
2. Add `hoot.yourdomain.com`
3. Cloudflare will auto-configure DNS

## Troubleshooting

### Frontend can't connect to Workers

**Error**: `Cannot connect to Hoot backend`

**Fix**: Check CORS - ensure `FRONTEND_URL` in Workers matches your Pages URL

### JWT errors

**Error**: `JWT keys not initialized`

**Fix**: Verify secrets are set:
```bash
wrangler secret list
```

Should show:
- `JWT_PRIVATE_KEY`
- `JWT_JWKS`
- `PORTKEY_ORG_ID`
- `PORTKEY_WORKSPACE_SLUG`

### Build fails

**Error**: `Could not resolve "crypto"`

**Fix**: Ensure `wrangler.jsonc` has:
```jsonc
{
  "compatibility_flags": ["nodejs_compat"]
}
```

### I/O Refcounted Canceler Error

**Error**: `Cannot perform I/O on behalf of a different request. I/O objects (such as streams, request/response bodies, and others) created in the context of one request handler cannot be accessed from a different request's handler.`

**Explanation**: Cloudflare Workers are **stateless** - each request runs in an isolated context. MCP connections cannot be reused across requests.

**Current Solution**: Hoot creates a new MCP client for each request. This means:
- ✅ Works reliably in Workers
- ⚠️ Slightly slower (reconnects each time)
- ✅ OAuth tokens are cached in Durable Objects

**Future Enhancement**: Move MCP client management to Durable Objects for persistent connections.

### Semantic Tool Filtering with Workers AI ✨

**Good news!** Hoot now supports semantic tool filtering on Cloudflare using Workers AI with OpenAI-compatible endpoints!

**How it works:**
- Automatically detects if Workers AI is available (`env.AI` binding)
- Uses the OpenAI provider from `@portkey-ai/mcp-tool-filter` with Workers AI's OpenAI-compatible endpoint
- Provides fast, edge-based semantic filtering with no custom code needed

**Benefits:**
- ✅ Semantic filtering works on Cloudflare (no more falling back to all tools)
- ⚡ Fast & low-latency (runs on Cloudflare's edge network)
- 💰 Cost-effective (~$0.011 per 1,000 filtering requests)
- 🌍 Multiple model options (including multilingual support)
- 🔌 Uses standard OpenAI-compatible API (no custom provider needed)

**Available Models:**
- `@cf/baai/bge-base-en-v1.5` (default) - Good balance, 768-dim
- `@cf/baai/bge-small-en-v1.5` - Faster, 384-dim
- `@cf/baai/bge-large-en-v1.5` - More accurate, 1024-dim
- `@cf/google/embeddinggemma-300m` - Multilingual (100+ languages)
- `@cf/baai/bge-m3` - Multi-functional, multi-lingual, multi-granularity

**Setup:**

1. **Add Workers AI binding** in `wrangler.jsonc` (already included):
```jsonc
{
  "ai": {
    "binding": "AI"
  }
}
```

2. **Set your Cloudflare Account ID**:
```jsonc
{
  "vars": {
    "CLOUDFLARE_ACCOUNT_ID": "your-account-id-here"
  }
}
```

3. **Set Cloudflare API Token** (secret):
```bash
wrangler secret put CLOUDFLARE_API_TOKEN
# Paste your API token (from Cloudflare Dashboard → API Tokens)
```

4. **Optional: Choose a different embedding model**:
```jsonc
{
  "vars": {
    "WORKERS_AI_EMBEDDING_MODEL": "@cf/google/embeddinggemma-300m"
  }
}
```

**How it uses OpenAI-compatible API:**
Workers AI provides OpenAI-compatible endpoints at:
```
https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1
```

Hoot's tool filter uses the existing OpenAI provider with this base URL, making it work seamlessly with Workers AI models!

**Fallback behavior:**
- If Workers AI is not configured, falls back to Node.js behavior (Transformers.js on Node, all tools on Workers)
- The feature gracefully degrades, ensuring Hoot works in all environments

### Local Development with Workers AI

**Good news:** Workers AI works with `wrangler dev` for local development!

**Setup:**

1. **Enable remote mode** in `wrangler.jsonc` (already configured):
```jsonc
{
  "ai": {
    "binding": "AI",
    "remote": true  // Connects to Cloudflare's Workers AI service
  }
}
```

2. **Add your credentials to `.dev.vars`** (create this file in project root):
```bash
# .dev.vars (for local development only - never commit this!)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

3. **Start local development**:
```bash
npm run server:worker  # or: wrangler dev
```

**Important notes:**
- ⚠️ **Not truly local**: `wrangler dev` makes real API calls to Cloudflare's Workers AI service
- 💰 **May incur costs**: Usage during development counts toward your Workers AI usage
- ✅ **Fast testing**: Great for testing semantic filtering without deploying
- 🔒 **Keep .dev.vars private**: Add it to `.gitignore` (already included)

**Alternative for local development:**
If you don't want to use Workers AI credits during development, run the Node.js server instead:
```bash
npm run server  # Uses local Transformers.js embeddings (free)
```

The Node.js server uses free local embeddings with Transformers.js, perfect for development!

### Legacy: Semantic Tool Filtering Without Workers AI (Old Behavior)

### Legacy: Semantic Tool Filtering Without Workers AI (Old Behavior)

**Note:** This section describes the old behavior before Workers AI support was added. With Workers AI enabled (default), semantic filtering now works on Cloudflare!

**Issue (without Workers AI)**: Semantic tool filtering does not work on Cloudflare Workers without Workers AI.

**Explanation**: The `@portkey-ai/mcp-tool-filter` package uses Transformers.js and ONNX Runtime for local embeddings. These dependencies require Node.js APIs that are not available in Cloudflare Workers' V8 isolate environment.

**Old Behavior (if Workers AI disabled)**: 
- ⚠️ The feature is automatically disabled on Workers
- ⚠️ All available tools are sent to the LLM (limited to first 120 if more than 128)
- ✅ You can still use the `@` mention feature to manually pin specific tools/servers

**Alternative (if you don't want to use Workers AI)**:
1. **Use mention feature**: Type `@` in the chat to manually pin specific servers or tools
2. **Deploy to Node.js**: For Transformers.js filtering, deploy the backend using `npm run server`
3. **Hybrid setup**: Run frontend on Cloudflare Pages, backend on a Node.js server

**To disable Workers AI** (not recommended):
Remove the `ai` binding from `wrangler.jsonc` and semantic filtering will fall back to the old behavior.

## Cost Estimate

### Free Tier (Hobbyist)
- **Workers**: 100,000 requests/day (free)
- **Durable Objects**: 1GB storage + 1M requests/month (free)
- **Pages**: Unlimited static hosting (free)

**Total**: $0/month for light usage

### Paid (Production)
- **Workers**: $5/month (10M requests)
- **Durable Objects**: $0.15/million requests + storage
- **Pages**: Free

**Estimate**: ~$10-30/month for 10,000 users

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build
        env:
          VITE_BACKEND_URL: ${{ secrets.VITE_BACKEND_URL }}
      
      - name: Deploy Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Deploy Pages
        run: npx wrangler pages deploy dist --project-name=hoot
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Add these secrets to your GitHub repo:
- `CLOUDFLARE_API_TOKEN`
- `VITE_BACKEND_URL`

---

**You're now running Hoot globally on Cloudflare's edge! 🌍**

