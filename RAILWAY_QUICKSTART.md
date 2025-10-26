# Railway Deployment - Quick Start

## Deploy Hoot to Railway in 5 Minutes

### Quick Setup

1. **Fork/Clone** this repo to your GitHub account

2. **Create Railway Project**:
   - Go to [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your hoot repository

3. **Configure Backend Service**:
   ```bash
   # Add these environment variables in Railway dashboard:
   PORT=8008
   HOOT_SESSION_TOKEN=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   ```

4. **Note Your Backend URL**:
   - Copy the generated Railway URL (e.g., `https://xxx.railway.app`)

5. **Add Frontend Variable**:
   ```bash
   # In backend service, add:
   FRONTEND_URL=https://xxx.railway.app
   ```

6. **Deploy!**
   - Railway will auto-build and deploy
   - Visit your app at the Railway URL

### Verify It Works

1. Visit your Railway URL
2. Try adding a test MCP server
3. Check browser console for any errors

### Local Development Still Works

```bash
# No configuration needed for local use:
npx @portkey-ai/hoot

# Or:
npm install -g @portkey-ai/hoot
hoot
```

All environment variables have defaults for local development.

### Full Documentation

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.

---

**Note**: The configuration files (`railway.json`, `nixpacks.toml`, `Procfile`) are already set up. You just need to configure environment variables in Railway dashboard.

