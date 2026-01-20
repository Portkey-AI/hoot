#!/usr/bin/env node

/**
 * Quick Start - Test Infrastructure Demo
 * 
 * This script demonstrates the test infrastructure by:
 * 1. Starting the test MCP server
 * 2. Running some basic tests
 * 3. Showing you how to use it in Hoot
 */

import { TestServerManager } from './helpers/server-manager.js';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Hoot Test Infrastructure - Quick Start               ║
╚════════════════════════════════════════════════════════════════╝
`);

async function quickStart() {
    let server;

    try {
        // Step 1: Start the test server
        console.log('📦 Step 1: Starting test MCP server...\n');

        server = new TestServerManager({
            mcpPort: 9000,
            oauthPort: 9001,
            verbose: false
        });

        await server.start();

        console.log('✅ Test server is running!\n');

        // Step 2: Show available endpoints
        console.log('📝 Step 2: Available endpoints:\n');
        console.log(`   MCP Server:       ${server.mcpUrl}`);
        console.log(`   OAuth Discovery:  ${server.discoveryUrl}`);
        console.log(`   Health Check:     ${server.healthUrl}`);
        console.log('');

        // Step 3: Check health
        console.log('🏥 Step 3: Checking server health...\n');

        const healthResponse = await fetch(server.healthUrl);
        const health = await healthResponse.json();

        console.log(`   Status:    ${health.status}`);
        console.log(`   Server:    ${health.server}`);
        console.log(`   Version:   ${health.version}`);
        console.log(`   Uptime:    ${Math.round(health.uptime)}s`);
        console.log('');

        // Step 4: Check OAuth discovery
        console.log('🔍 Step 4: Checking OAuth discovery...\n');

        const discoveryResponse = await fetch(server.discoveryUrl);
        const discovery = await discoveryResponse.json();

        console.log(`   Authorization: ${discovery.authorization_endpoint}`);
        console.log(`   Token:         ${discovery.token_endpoint}`);
        console.log(`   PKCE Methods:  ${discovery.code_challenge_methods_supported.join(', ')}`);
        console.log('');

        // Step 5: Show credentials
        console.log('🔑 Step 5: Pre-configured test credentials:\n');

        const credentials = server.getTestCredentials();

        console.log('   OAuth (Public):');
        console.log(`     Client ID:     ${credentials.oauth.public.clientId}`);
        console.log(`     Client Secret: (none - uses PKCE only)`);
        console.log('');

        console.log('   OAuth (Confidential):');
        console.log(`     Client ID:     ${credentials.oauth.confidential.clientId}`);
        console.log(`     Client Secret: ${credentials.oauth.confidential.clientSecret}`);
        console.log('');

        console.log('   API Key:');
        console.log(`     Valid Key:     ${credentials.apiKey.valid}`);
        console.log('');

        // Step 6: Test MCP protocol directly
        console.log('🔬 Step 6: Testing MCP protocol directly...\n');
        console.log('   (Simulating OAuth flow and tool execution)\n');

        // Get OAuth token
        console.log('   → Getting OAuth authorization code...');
        const authUrl = new URL(`${server.oauthUrl}/oauth/authorize`);
        authUrl.searchParams.set('client_id', credentials.oauth.public.clientId);
        authUrl.searchParams.set('redirect_uri', 'http://localhost:5173/oauth/callback');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', 'quick-start-test');
        authUrl.searchParams.set('code_challenge', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
        authUrl.searchParams.set('code_challenge_method', 'S256');

        const authResponse = await fetch(authUrl.toString(), { redirect: 'manual' });
        const location = authResponse.headers.get('location');
        const code = new URL(location).searchParams.get('code');
        console.log(`   ✓ Got authorization code: ${code.substring(0, 15)}...`);

        // Exchange for token
        console.log('   → Exchanging code for access token...');
        const tokenResponse = await fetch(`${server.oauthUrl}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'http://localhost:5173/oauth/callback',
                code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
                client_id: credentials.oauth.public.clientId
            })
        });

        const tokens = await tokenResponse.json();
        console.log(`   ✓ Got access token: ${tokens.access_token.substring(0, 15)}...`);
        console.log(`   ✓ Expires in: ${tokens.expires_in}s`);
        console.log('');

        // Initialize MCP
        console.log('   → Initializing MCP connection...');
        const initResponse = await fetch(server.mcpUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access_token}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'initialize',
                params: {
                    protocolVersion: '2025-11-25',
                    capabilities: {},
                    clientInfo: { name: 'Quick Start', version: '1.0' }
                },
                id: 1
            })
        });

        const initResult = await initResponse.json();
        console.log(`   ✓ Connected to: ${initResult.result.serverInfo.name}`);
        console.log('');

        // List tools
        console.log('   → Listing available tools...');
        const toolsResponse = await fetch(server.mcpUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access_token}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/list',
                params: {},
                id: 2
            })
        });

        const toolsResult = await toolsResponse.json();
        console.log(`   ✓ Found ${toolsResult.result.tools.length} tools:`);
        toolsResult.result.tools.forEach((tool, i) => {
            console.log(`      ${i + 1}. ${tool.name} - ${tool.description}`);
        });
        console.log('');

        // Execute a tool
        console.log('   → Executing "echo" tool...');
        const execResponse = await fetch(server.mcpUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access_token}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'echo',
                    arguments: { message: 'Hello from test infrastructure!' }
                },
                id: 3
            })
        });

        const execResult = await execResponse.json();
        const output = JSON.parse(execResult.result.content[0].text);
        console.log(`   ✓ Result: "${output.message}"`);
        console.log('');

        // Step 7: Show how to use in Hoot
        console.log('🎯 Step 7: How to use this in Hoot:\n');
        console.log('   The test server is now running! To test Hoot against it:\n');
        console.log('   1. Start Hoot backend (in another terminal):');
        console.log('      npm run server\n');
        console.log('   2. Start Hoot frontend (in another terminal):');
        console.log('      npm run dev\n');
        console.log('   3. Open Hoot: http://localhost:8009\n');
        console.log('   4. Add server with these settings:');
        console.log('      • Name: Test OAuth Server');
        console.log(`      • URL: ${server.mcpUrl}`);
        console.log('      • Transport: HTTP');
        console.log('      • Auth: OAuth');
        console.log('      • Advanced OAuth Options:');
        console.log(`        - Authorization: ${server.oauthUrl}/oauth/authorize`);
        console.log(`        - Token: ${server.oauthUrl}/oauth/token`);
        console.log(`        - Client ID: ${credentials.oauth.confidential.clientId} (optional)`);
        console.log(`        - Client Secret: ${credentials.oauth.confidential.clientSecret} (optional)`);
        console.log('');
        console.log('   5. Click "Connect" - OAuth flow will complete automatically!');
        console.log('');

        // Step 8: Show stats
        const stats = await server.getStats();
        console.log('📊 Step 8: Current server statistics:\n');
        console.log(`   Access Tokens:   ${stats.accessTokens}`);
        console.log(`   Refresh Tokens:  ${stats.refreshTokens}`);
        console.log(`   Auth Codes:      ${stats.authCodes}`);
        console.log(`   Sessions:        ${stats.sessions}`);
        console.log(`   Registered Clients: ${stats.clients}`);
        console.log('');

        // Success!
        console.log('✅ Quick start complete!\n');
        console.log('💡 The test server will keep running for 60 seconds.');
        console.log('   Use this time to test Hoot against it, or press Ctrl+C to stop.\n');
        console.log('📚 For more information:');
        console.log('   - Read: tests/mock-servers/README.md');
        console.log('   - Example test: tests/example-mcp-lifecycle.test.js');
        console.log('   - Run tests: npm run test:example');
        console.log('');

        // Keep running for 60 seconds
        await new Promise(resolve => setTimeout(resolve, 60000));

    } catch (error) {
        console.error('\n❌ Error during quick start:', error.message);
        console.error('');
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        if (server) {
            console.log('🛑 Stopping test server...\n');
            await server.stop();
            console.log('✅ Test infrastructure demo complete!\n');
        }
    }
}

// Run the quick start
quickStart().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});



