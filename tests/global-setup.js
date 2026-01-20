/**
 * Global Setup for Vitest
 * 
 * This file is optional. Uncomment the globalSetup line in vitest.config.test.js
 * to automatically start/stop the test server for all tests.
 * 
 * Usage:
 * 1. Uncomment in vitest.config.test.js
 * 2. All tests will share a single test server instance
 * 3. Server starts before any tests run
 * 4. Server stops after all tests complete
 */

import { setupTestServer, teardownTestServer } from './helpers/server-manager.js';

let globalServer = null;

export async function setup() {
    console.log('\n🚀 Starting global test server...\n');

    globalServer = await setupTestServer({
        mcpPort: 9000,
        oauthPort: 9001,
        verbose: false
    });

    console.log('✅ Global test server ready\n');

    // Make server info available to all tests via environment
    process.env.TEST_MCP_URL = globalServer.mcpUrl;
    process.env.TEST_OAUTH_URL = globalServer.oauthUrl;
    process.env.TEST_SERVER_RUNNING = 'true';
}

export async function teardown() {
    if (globalServer) {
        console.log('\n🛑 Stopping global test server...\n');
        await teardownTestServer();
        console.log('✅ Global test server stopped\n');
    }
}



