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
```

### 1.4 Update wrangler.toml

```toml
name = "hoot-server"
main = "server/server-worker.js"
compatibility_date = "2024-11-04"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { name = "USER_DATA", class_name = "UserDataDO" },
  { name = "FAVICON_CACHE", class_name = "FaviconCacheDO" }
]

[[migrations]]
tag = "v1"
new_classes = ["UserDataDO", "FaviconCacheDO"]

[vars]
FRONTEND_URL = "https://hoot.pages.dev"  # Update with your Pages URL

[env.production]
name = "hoot-server-production"
vars = { FRONTEND_URL = "https://hoot.yourdomain.com" }
```

### 1.5 Deploy Workers

```bash
npm run deploy:cloudflare
```

**Note the Workers URL** (e.g., `https://hoot-server.your-subdomain.workers.dev`)

## Step 2: Deploy the Frontend (Pages)

### 2.1 Create `.env.production`

```bash
# Create .env.production file
cat > .env.production << EOF
VITE_BACKEND_URL=https://hoot-server.your-subdomain.workers.dev
EOF
```

### 2.2 Build Frontend

```bash
npm run build
```

This creates a `dist/` folder with static files.

### 2.3 Deploy to Cloudflare Pages

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

Update `wrangler.toml` to allow your Pages domain:

```toml
[vars]
FRONTEND_URL = "https://hoot.pages.dev"
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

### Workers (wrangler.toml or secrets)
```toml
[vars]
FRONTEND_URL = "https://hoot.pages.dev"

# Secrets (set via wrangler secret put):
# - JWT_PRIVATE_KEY
# - JWT_JWKS
# - PORTKEY_ORG_ID
# - PORTKEY_WORKSPACE_SLUG
```

## Custom Domain (Optional)

### For Workers

```toml
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
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

**Fix**: Ensure `wrangler.toml` has:
```toml
compatibility_flags = ["nodejs_compat"]
```

### I/O Refcounted Canceler Error

**Error**: `Cannot perform I/O on behalf of a different request. I/O objects (such as streams, request/response bodies, and others) created in the context of one request handler cannot be accessed from a different request's handler.`

**Explanation**: Cloudflare Workers are **stateless** - each request runs in an isolated context. MCP connections cannot be reused across requests.

**Current Solution**: Hoot creates a new MCP client for each request. This means:
- ✅ Works reliably in Workers
- ⚠️ Slightly slower (reconnects each time)
- ✅ OAuth tokens are cached in Durable Objects

**Future Enhancement**: Move MCP client management to Durable Objects for persistent connections.

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

