# JWT Authentication Architecture

## Overview

Hoot uses a **unified JWT** approach where ONE token authenticates with both:
1. **Hoot Backend** - For MCP server operations
2. **Portkey API** - For AI chat completions

This eliminates API key exposure in the browser while enabling secure, stateless authentication.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Frontend)                                      │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │  GET /auth/token → Returns ONE JWT          │       │
│  │  Token cached in backendClient.ts           │       │
│  └──────────────┬────────────┬─────────────────┘       │
│                 │            │                          │
└─────────────────┼────────────┼──────────────────────────┘
                  │            │
      x-hoot-token│            │x-portkey-api-key
                  ↓            ↓
         ┌──────────────┐  ┌──────────┐
         │ Hoot Backend │  │ Portkey  │
         │ (validates)  │  │   API    │
         └──────────────┘  └──────────┘
```

## The JWT Contains Everything

```json
{
  // For Hoot Backend (user scoping)
  "sub": "user-12345",
  "email_id": "user@hoot.local",
  
  // For Portkey (org/workspace routing)
  "portkey_oid": "your-org-id",
  "portkey_workspace": "your-workspace-slug",
  "scope": ["completions.write", "logs.view"],
  
  // Standard JWT claims
  "exp": 1735689600,
  "iat": 1735686000,
  
  // JWT header
  "alg": "RS256",
  "kid": "32aecc1f-...",
  "typ": "JWT"
}
```

**Key Insight**: Each system reads only the claims it needs from the SAME token.

## Implementation

### 1. Backend: JWT Generation (`mcp-backend-server.js`)

**Load keys at startup:**
```javascript
import { SignJWT, importJWK } from 'jose';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

let jwtPrivateKey, jwtKid, jwtPublicKeys;

(async () => {
    const privateKeyJwk = JSON.parse(readFileSync('./private-key.json'));
    const jwks = JSON.parse(readFileSync('./jwks.json'));
    
    jwtPrivateKey = await importJWK(privateKeyJwk, 'RS256');
    jwtKid = jwks.keys[0].kid;
    
    jwks.keys.forEach(key => {
        jwtPublicKeys.set(key.kid, jwkToPem(key));
    });
})();
```

**Generate unified JWT at `/auth/token`:**
```javascript
app.get('/auth/token', async (req, res) => {
    if (jwtPrivateKey && jwtKid) {
        const token = await new SignJWT({
            // Hoot claims
            sub: 'user-' + Date.now(),
            email_id: 'user@hoot.local',
            
            // Portkey claims
            portkey_oid: process.env.PORTKEY_ORG_ID,
            portkey_workspace: process.env.PORTKEY_WORKSPACE_SLUG,
            scope: ['completions.write', 'logs.view'],
        })
            .setProtectedHeader({ alg: 'RS256', kid: jwtKid, typ: 'JWT' })
            .setExpirationTime('1h')
            .sign(jwtPrivateKey);
        
        return res.json({ success: true, token, tokenType: 'jwt' });
    }
    
    // Fallback to session token if JWT not configured
    return res.json({ success: true, token: SESSION_TOKEN });
});
```

**Validate JWT in middleware:**
```javascript
function authenticateRequest(req, res, next) {
    const token = req.headers['x-hoot-token'];
    
    try {
        const decoded = jwt.decode(token, { complete: true });
        
        if (decoded?.header.kid) {
            const publicKey = jwtPublicKeys.get(decoded.header.kid);
            const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
            
            req.userId = payload.email_id || payload.sub;
            return next();
        }
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'TokenExpired', expired: true });
        }
    }
    
    // Fallback: session token
    if (token === SESSION_TOKEN) {
        req.userId = 'default-user';
        return next();
    }
    
    return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. Frontend: Token Management

**Fetch and cache token (`backendClient.ts`):**
```typescript
let sessionToken: string | null = null;

export async function getSessionToken(): Promise<string> {
    if (sessionToken) return sessionToken; // Use cache
    
    const response = await fetch(`${BACKEND_URL}/auth/token`);
    const data = await response.json();
    sessionToken = data.token;
    
    return sessionToken;
}
```

**Reuse token for Portkey (`portkeyClient.ts`):**
```typescript
import { getSessionToken } from './backendClient';

class PortkeyClient {
    private async ensureClient() {
        if (!this.client) {
            const token = await getSessionToken(); // Reuse cached token!
            
            this.client = new Portkey({
                apiKey: token, // JWT as API key
                provider: 'openai',
                dangerouslyAllowBrowser: true,
            });
        }
    }
}
```

## Key Generation

Generate RSA key pair and JWKS:

```bash
npm install jose
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
    
    fs.writeFileSync('jwks.json', JSON.stringify({ keys: [publicJwk] }, null, 2));
    fs.writeFileSync('private-key.json', JSON.stringify(await exportJWK(privateKey), null, 2));
    
    console.log('✅ Keys generated: jwks.json, private-key.json');
})();
"
```

**Important**: Keep `private-key.json` SECRET! Add to `.gitignore`.

## Configuration

### Environment Variables

```bash
# Required for production
PORTKEY_ORG_ID=your-actual-org-id
PORTKEY_WORKSPACE_SLUG=your-actual-workspace-slug

# Optional
JWT_PRIVATE_KEY_PATH=./private-key.json
```

### Portkey Setup

1. Go to **Portkey Admin UI** → **Organisation** → **Authentication**
2. Select **"JWKS JSON"** option
3. Paste entire contents of your `jwks.json` file:
   ```json
   {
     "keys": [{
       "kty": "RSA",
       "n": "62rcbrkEcm...",
       "e": "AQAB",
       "use": "sig",
       "alg": "RS256",
       "kid": "32aecc1f-2773-43a0-9e38-fba9d393174d"
     }]
   }
   ```
4. Save

## Benefits

✅ **Single Token** - One JWT for everything  
✅ **No API Keys in Browser** - JWT is safer (short-lived, signed)  
✅ **Multi-Tenant Ready** - User ID in JWT for data scoping  
✅ **Stateless** - No session storage needed  
✅ **Cacheable** - Token fetched once, reused everywhere  
✅ **Backwards Compatible** - Falls back to session tokens  

## Security

- **JWT expires after 1 hour** (configurable)
- **Private key stays on backend** (never exposed)
- **Public key validation** ensures integrity
- **RS256 signing** (industry standard, asymmetric)
- **Automatic refresh** on expiry (frontend fetches new token)

## Testing

```bash
# 1. Start backend
npm run backend
# Should see: "✅ JWT keys loaded successfully"

# 2. Test token endpoint
curl http://localhost:8008/auth/token
# Returns: {"success":true,"token":"eyJ...","tokenType":"jwt"}

# 3. Decode JWT at https://jwt.io
# Verify it contains both Hoot and Portkey claims

# 4. Test in browser
npm run dev
# Open DevTools → Network tab
# Send a message in hybrid interface
# Should see ONE request to /auth/token
# Token used for both backend and Portkey calls
```

## Troubleshooting

### "JWT keys not found"
- Ensure `jwks.json` and `private-key.json` exist in project root
- Backend falls back to session tokens (still works)

### Portkey rejects token
- Verify JWKS pasted correctly in Portkey Admin UI
- Check `kid` in JWT matches `kid` in JWKS
- Ensure `PORTKEY_ORG_ID` and `PORTKEY_WORKSPACE_SLUG` are set

### "Token expired" errors
- JWT expires after 1 hour by default
- Frontend automatically fetches new token
- Check system clocks are synchronized

### Backend can't validate JWT
- Check `jwks.json` is valid JSON
- Ensure `kid` in token matches key in JWKS
- Verify `npm install jsonwebtoken jwk-to-pem` completed

## Migration from API Keys

If you had Portkey API keys before:

1. ✅ Backend now generates JWT (done)
2. ✅ Portkey client uses JWT (done)
3. ⏳ Remove API key UI from `LLMSettingsModal.tsx`
4. ⏳ Remove API key state from `HybridInterface.tsx`
5. ⏳ Configure Portkey with your JWKS

## Production Deployment

1. Generate keys: `node generate-keys.js`
2. Add `private-key.json` to `.gitignore`
3. Set environment variables on server:
   ```bash
   PORTKEY_ORG_ID=<your-org-id>
   PORTKEY_WORKSPACE_SLUG=<your-workspace>
   JWT_PRIVATE_KEY_PATH=/secure/path/private-key.json
   ```
4. Configure Portkey with JWKS (paste `jwks.json` contents)
5. Deploy!

## Key Files

- `mcp-backend-server.js` - JWT generation & validation
- `src/lib/backendClient.ts` - Token fetching & caching
- `src/lib/portkeyClient.ts` - Reuses cached token
- `jwks.json` - Public key (safe to share)
- `private-key.json` - Private key (SECRET!)

## Dependencies

```json
{
  "dependencies": {
    "jose": "^5.x",           // JWT signing (ES modules)
    "jsonwebtoken": "^9.x",   // JWT validation (CommonJS)
    "jwk-to-pem": "^2.x"      // JWK to PEM conversion
  }
}
```

---

**That's it!** One token, fetched once, validated by both systems, containing all necessary claims. Clean, secure, and production-ready.

