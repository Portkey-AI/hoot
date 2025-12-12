# Testing Custom OAuth Endpoints

## Testing Strategy

### Unit Tests (Current)
✅ **Already Implemented**: `tests/test-custom-oauth.js`
- Tests that backend accepts custom metadata
- Validates OAuth provider configuration
- Ensures no breaking changes to standard OAuth

### Integration Tests (Recommended)

#### Option 1: Mock OAuth Server

Create a simple mock OAuth server for testing:

```javascript
// tests/mock-oauth-server.js
import express from 'express';

const app = express();
const PORT = 8765;

// Mock authorization endpoint
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, state, code_challenge } = req.query;
  
  console.log('📝 Authorization request received:', {
    client_id,
    redirect_uri,
    state,
    code_challenge
  });
  
  // Simulate user authorization - redirect back with code
  const authCode = 'mock_auth_code_' + Date.now();
  res.redirect(`${redirect_uri}?code=${authCode}&state=${state}`);
});

// Mock token endpoint
app.post('/oauth/token', express.json(), (req, res) => {
  const { grant_type, code, code_verifier, client_id } = req.body;
  
  console.log('🔐 Token request received:', {
    grant_type,
    code,
    code_verifier,
    client_id
  });
  
  // Return mock tokens
  res.json({
    access_token: 'mock_access_token_' + Date.now(),
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'mock_refresh_token_' + Date.now(),
    scope: 'read write'
  });
});

// Mock MCP server endpoint
app.post('/mcp', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }
  
  // Handle MCP requests
  res.json({
    jsonrpc: '2.0',
    result: { message: 'Authenticated MCP server response' }
  });
});

app.listen(PORT, () => {
  console.log(`🧪 Mock OAuth server running on http://localhost:${PORT}`);
});
```

**Usage**:
```bash
# Terminal 1: Start mock OAuth server
node tests/mock-oauth-server.js

# Terminal 2: Start Hoot backend
npm run backend

# Terminal 3: Start Hoot frontend
npm run dev

# Configure in Hoot UI:
# URL: http://localhost:8765/mcp
# Auth: OAuth
# Custom Authorization Endpoint: http://localhost:8765/oauth/authorize
# Custom Token Endpoint: http://localhost:8765/oauth/token
```

#### Option 2: Docker Test Environment

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  oauth-server:
    image: ghcr.io/navikt/mock-oauth2-server:latest
    ports:
      - "8765:8765"
    environment:
      - SERVER_PORT=8765
  
  hoot-backend:
    build: .
    ports:
      - "8008:8008"
    depends_on:
      - oauth-server
  
  hoot-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:5173"
    depends_on:
      - hoot-backend
```

#### Option 3: Manual Testing Checklist

**Test Scenarios**:

1. ✅ **Valid Custom Endpoints**
   - Configure valid custom endpoints
   - Verify OAuth flow completes successfully
   - Check tokens are stored and used

2. ✅ **Invalid Endpoints**
   - Configure non-existent endpoints
   - Verify appropriate error handling
   - Check error messages are helpful

3. ✅ **Partial Configuration**
   - Only authorization endpoint provided
   - Only token endpoint provided
   - Should fall back to auto-discovery

4. ✅ **Auto-Discovery Fallback**
   - No custom endpoints provided
   - Should use standard RFC 8414 discovery
   - Should work with compliant OAuth servers

5. ✅ **Mixed Mode**
   - Connect with custom endpoints
   - Disconnect and reconnect with auto-discovery
   - Verify no state pollution

### End-to-End Test Script

```javascript
// tests/e2e-custom-oauth.test.js
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:8008';
const MOCK_OAUTH_URL = 'http://localhost:8765';

async function testCustomOAuthEndpoints() {
  console.log('🧪 E2E Test: Custom OAuth Endpoints\n');
  
  // Step 1: Get session token
  console.log('1. Getting session token...');
  const tokenRes = await fetch(`${BACKEND_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'test-user' })
  });
  const { token } = await tokenRes.json();
  console.log('✅ Session token obtained\n');
  
  // Step 2: Connect to server with custom OAuth endpoints
  console.log('2. Connecting with custom OAuth endpoints...');
  const connectRes = await fetch(`${BACKEND_URL}/mcp/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hoot-token': token
    },
    body: JSON.stringify({
      serverId: 'test-oauth-server',
      serverName: 'Test OAuth Server',
      url: `${MOCK_OAUTH_URL}/mcp`,
      transport: 'http',
      auth: {
        type: 'oauth',
        customOAuthMetadata: {
          authorization_endpoint: `${MOCK_OAUTH_URL}/oauth/authorize`,
          token_endpoint: `${MOCK_OAUTH_URL}/oauth/token`,
          client_id: 'test-client'
        }
      }
    })
  });
  
  const connectResult = await connectRes.json();
  console.log('Connect result:', connectResult);
  
  if (connectResult.needsAuth && connectResult.authorizationUrl) {
    console.log('✅ OAuth flow initiated with custom endpoints');
    console.log('Authorization URL:', connectResult.authorizationUrl);
    
    // Verify custom endpoints are in the URL
    const authUrl = new URL(connectResult.authorizationUrl);
    if (authUrl.origin === MOCK_OAUTH_URL) {
      console.log('✅ Custom authorization endpoint is being used\n');
      return true;
    } else {
      console.log('❌ Wrong authorization endpoint:', authUrl.origin);
      return false;
    }
  } else if (connectResult.success) {
    console.log('✅ Connection succeeded (tokens already cached)\n');
    return true;
  } else {
    console.log('❌ Connection failed:', connectResult.error);
    return false;
  }
}

// Run test
testCustomOAuthEndpoints().then(success => {
  process.exit(success ? 0 : 1);
});
```

### Automated Test with Playwright

```typescript
// tests/playwright/custom-oauth.spec.ts
import { test, expect } from '@playwright/test';

test('Custom OAuth endpoints flow', async ({ page }) => {
  // Navigate to Hoot
  await page.goto('http://localhost:5173');
  
  // Add server
  await page.click('button:has-text("+ Add Server")');
  
  // Fill in server details
  await page.fill('input[placeholder="Server Name"]', 'Custom OAuth Server');
  await page.fill('input[placeholder="Server URL"]', 'http://localhost:8765/mcp');
  await page.selectOption('select[name="transport"]', 'http');
  
  // Select OAuth auth
  await page.selectOption('select[name="authType"]', 'oauth');
  
  // Expand advanced options
  await page.click('button:has-text("Advanced OAuth Options")');
  
  // Fill custom endpoints
  await page.fill(
    'input[placeholder="Authorization Endpoint (optional)"]',
    'http://localhost:8765/oauth/authorize'
  );
  await page.fill(
    'input[placeholder="Token Endpoint (optional)"]',
    'http://localhost:8765/oauth/token'
  );
  
  // Connect
  await page.click('button:has-text("Connect")');
  
  // Should redirect to custom auth endpoint
  await page.waitForURL(/localhost:8765\/oauth\/authorize/);
  
  // Check URL contains PKCE challenge
  const url = page.url();
  expect(url).toContain('code_challenge=');
  expect(url).toContain('code_challenge_method=S256');
  
  // Mock OAuth server will auto-redirect back
  await page.waitForURL(/localhost:5173\/oauth\/callback/);
  
  // Should see server as connected
  await expect(page.locator('.server-status.connected')).toBeVisible();
});
```

## 2. Client ID and Client Secret Support

You're right! We should support full OAuth client credentials. Let me check and update:

<function_calls>
<invoke name="read_file">
<parameter name="target_file">/Users/ra/workspace/hoot/src/types/index.ts


