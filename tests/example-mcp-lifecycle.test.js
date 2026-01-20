/**
 * Example: MCP Connection Lifecycle Test
 * 
 * This demonstrates how to use the test infrastructure for comprehensive testing.
 * Run with: npm test -- tests/example-mcp-lifecycle.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestServerManager } from './helpers/server-manager.js';
import { validServerConfigs, toolTestCases, timeouts } from './helpers/test-data.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8008';

describe('MCP Connection Lifecycle (Example)', () => {
    let testServer;
    let sessionToken;

    // Start test MCP server before all tests
    beforeAll(async () => {
        console.log('\n🚀 Setting up test infrastructure...\n');

        testServer = new TestServerManager({
            mcpPort: 9000,
            oauthPort: 9001,
            verbose: false
        });

        await testServer.start();

        // Get session token from Hoot backend
        const tokenResponse = await fetch(`${BACKEND_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user-example' })
        });

        const tokenData = await tokenResponse.json();
        sessionToken = tokenData.token;

        console.log('✅ Test infrastructure ready\n');
    }, timeouts.long);

    // Stop test server after all tests
    afterAll(async () => {
        if (testServer) {
            await testServer.stop();
        }
    }, timeouts.medium);

    describe('Server Health', () => {
        it('should return healthy status', async () => {
            const response = await fetch(testServer.healthUrl);
            const health = await response.json();

            expect(response.status).toBe(200);
            expect(health.status).toBe('healthy');
            expect(health.server).toBe('Test MCP Server');
        }, timeouts.short);

        it('should provide OAuth discovery metadata', async () => {
            const response = await fetch(testServer.discoveryUrl);
            const metadata = await response.json();

            expect(response.status).toBe(200);
            expect(metadata.authorization_endpoint).toBe(`${testServer.oauthUrl}/oauth/authorize`);
            expect(metadata.token_endpoint).toBe(`${testServer.oauthUrl}/oauth/token`);
            expect(metadata.code_challenge_methods_supported).toContain('S256');
        }, timeouts.short);
    });

    describe('Connection Flow', () => {
        const serverId = 'test-server-example';

        it('should auto-detect server capabilities', async () => {
            const response = await fetch(`${BACKEND_URL}/mcp/auto-detect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hoot-token': sessionToken
                },
                body: JSON.stringify({
                    url: testServer.mcpUrl
                })
            });

            const result = await response.json();

            expect(response.status).toBe(200);
            expect(result.transport).toBeDefined();
            // Note: OAuth detection requires attempting a connection
        }, timeouts.medium);

        it('should connect with OAuth (custom endpoints)', async () => {
            const config = {
                serverId,
                serverName: 'Test OAuth Server',
                url: testServer.mcpUrl,
                transport: 'http',
                auth: {
                    type: 'oauth',
                    customOAuthMetadata: testServer.getOAuthEndpoints()
                }
            };

            const response = await fetch(`${BACKEND_URL}/mcp/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hoot-token': sessionToken
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            // First connection will require OAuth authorization
            expect(response.status).toBe(200);

            if (result.needsAuth) {
                expect(result.authorizationUrl).toBeDefined();
                expect(result.authorizationUrl).toContain(testServer.oauthUrl);
                expect(result.authorizationUrl).toContain('code_challenge=');
                expect(result.authorizationUrl).toContain('code_challenge_method=S256');
                console.log('   ℹ️  OAuth authorization required (expected for first connection)');
                console.log('   ℹ️  In production, user would be redirected to:', result.authorizationUrl);
            } else if (result.success) {
                expect(result.message).toBeDefined();
                console.log('   ℹ️  Connected successfully (tokens already cached)');
            }
        }, timeouts.long);
    });

    describe('API Key Authentication (Alternative)', () => {
        const serverId = 'test-server-apikey';

        it('should connect with valid API key', async () => {
            const credentials = testServer.getTestCredentials();

            const config = {
                serverId,
                serverName: 'Test API Key Server',
                url: testServer.mcpUrl,
                transport: 'http',
                auth: {
                    type: 'apiKey',
                    apiKey: credentials.apiKey.valid
                }
            };

            const response = await fetch(`${BACKEND_URL}/mcp/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hoot-token': sessionToken
                },
                body: JSON.stringify(config)
            });

            expect(response.status).toBe(200);
            // API key connections should succeed immediately if backend supports it
        }, timeouts.medium);
    });

    describe('Direct MCP Protocol Testing', () => {
        let accessToken;

        // For this example, we'll simulate having an OAuth token
        beforeAll(async () => {
            // In a real test, you'd go through the full OAuth flow
            // For now, we'll directly call the token endpoint with a pre-authorized code

            // Step 1: Get auth code (the test server auto-approves)
            const authUrl = new URL(`${testServer.oauthUrl}/oauth/authorize`);
            authUrl.searchParams.set('client_id', 'test-client-public');
            authUrl.searchParams.set('redirect_uri', 'http://localhost:5173/oauth/callback');
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('state', 'test-state');
            authUrl.searchParams.set('code_challenge', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
            authUrl.searchParams.set('code_challenge_method', 'S256');

            // Follow redirect to get code
            const authResponse = await fetch(authUrl.toString(), {
                redirect: 'manual'
            });

            const location = authResponse.headers.get('location');
            const redirectUrl = new URL(location);
            const code = redirectUrl.searchParams.get('code');

            // Step 2: Exchange code for token
            const tokenResponse = await fetch(`${testServer.oauthUrl}/oauth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: 'http://localhost:5173/oauth/callback',
                    code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
                    client_id: 'test-client-public'
                })
            });

            const tokenData = await tokenResponse.json();
            accessToken = tokenData.access_token;

            expect(accessToken).toBeDefined();
        }, timeouts.long);

        it('should initialize MCP connection', async () => {
            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'initialize',
                    params: {
                        protocolVersion: '2025-11-25',
                        capabilities: {},
                        clientInfo: {
                            name: 'Hoot Test Client',
                            version: '1.0.0'
                        }
                    },
                    id: 1
                })
            });

            const result = await response.json();

            expect(response.status).toBe(200);
            expect(result.jsonrpc).toBe('2.0');
            expect(result.result.protocolVersion).toBe('2025-11-25');
            expect(result.result.serverInfo.name).toBe('Test MCP Server');
        }, timeouts.medium);

        it('should list available tools', async () => {
            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    params: {},
                    id: 2
                })
            });

            const result = await response.json();

            expect(response.status).toBe(200);
            expect(result.result.tools).toBeInstanceOf(Array);
            expect(result.result.tools.length).toBeGreaterThan(0);

            // Check for expected tools
            const toolNames = result.result.tools.map(t => t.name);
            expect(toolNames).toContain('echo');
            expect(toolNames).toContain('add');
            expect(toolNames).toContain('get_weather');
        }, timeouts.medium);

        it('should execute echo tool', async () => {
            const testCase = toolTestCases.echo;

            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: {
                        name: testCase.name,
                        arguments: testCase.arguments
                    },
                    id: 3
                })
            });

            const result = await response.json();

            expect(response.status).toBe(200);
            expect(result.result.content).toBeDefined();
            expect(result.result.content[0].type).toBe('text');

            const output = JSON.parse(result.result.content[0].text);
            expect(output.message).toBe(testCase.expectedResult.message);
        }, timeouts.medium);

        it('should execute add tool', async () => {
            const testCase = toolTestCases.add;

            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: {
                        name: testCase.name,
                        arguments: testCase.arguments
                    },
                    id: 4
                })
            });

            const result = await response.json();

            expect(response.status).toBe(200);
            const output = JSON.parse(result.result.content[0].text);
            expect(output.sum).toBe(testCase.expectedResult.sum);
        }, timeouts.medium);

        it('should handle tool not found error', async () => {
            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: {
                        name: 'non_existent_tool',
                        arguments: {}
                    },
                    id: 5
                })
            });

            const result = await response.json();

            expect(response.status).toBe(404);
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe(-32602);
            expect(result.error.message).toContain('not found');
        }, timeouts.medium);
    });

    describe('Error Scenarios', () => {
        it('should handle missing authentication', async () => {
            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    params: {},
                    id: 1
                })
            });

            expect(response.status).toBe(401);
            const result = await response.json();
            expect(result.error.code).toBe(-32001);
            expect(result.error.message).toContain('Authentication required');
        }, timeouts.short);

        it('should handle invalid access token', async () => {
            const response = await fetch(testServer.mcpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer invalid-token-123'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    params: {},
                    id: 1
                })
            });

            expect(response.status).toBe(401);
            const result = await response.json();
            expect(result.error.code).toBe(-32001);
        }, timeouts.short);
    });

    describe('Server Statistics', () => {
        it('should provide server stats', async () => {
            const stats = await testServer.getStats();

            expect(stats).toBeDefined();
            expect(typeof stats.accessTokens).toBe('number');
            expect(typeof stats.sessions).toBe('number');

            console.log('   📊 Server stats:', stats);
        }, timeouts.short);
    });
});



