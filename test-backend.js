#!/usr/bin/env node

/**
 * Test script for the MCP backend server
 * Tests basic connectivity and API endpoints
 */

const BASE_URL = 'http://localhost:3002';

async function testEndpoint(name, method, url, body) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   ${method} ${url}`);

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (response.ok) {
            console.log('   ✅ SUCCESS');
            console.log('   Response:', JSON.stringify(data, null, 2));
            return { success: true, data };
        } else {
            console.log('   ⚠️  Failed (expected for some tests)');
            console.log('   Status:', response.status);
            console.log('   Response:', JSON.stringify(data, null, 2));
            return { success: false, data };
        }
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║            MCP Backend Server Test Suite                       ║
╚════════════════════════════════════════════════════════════════╝
`);

    // Test 1: Health Check
    await testEndpoint(
        'Health Check',
        'GET',
        `${BASE_URL}/health`
    );

    // Test 2: List Connections (should be empty)
    await testEndpoint(
        'List Connections (empty)',
        'GET',
        `${BASE_URL}/mcp/connections`
    );

    // Test 3: Status Check (non-existent server)
    await testEndpoint(
        'Check Status (non-existent server)',
        'GET',
        `${BASE_URL}/mcp/status/test-server-123`
    );

    // Test 4: List Tools (should fail - not connected)
    await testEndpoint(
        'List Tools (not connected)',
        'GET',
        `${BASE_URL}/mcp/tools/test-server-123`
    );

    // Test 5: Execute Tool (should fail - not connected)
    await testEndpoint(
        'Execute Tool (not connected)',
        'POST',
        `${BASE_URL}/mcp/execute`,
        {
            serverId: 'test-server-123',
            toolName: 'test-tool',
            arguments: {}
        }
    );

    // Test 6: Disconnect (should work even if not connected)
    await testEndpoint(
        'Disconnect (non-existent server)',
        'POST',
        `${BASE_URL}/mcp/disconnect`,
        {
            serverId: 'test-server-123'
        }
    );

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      Tests Complete                             ║
╚════════════════════════════════════════════════════════════════╝

Note: Some tests are expected to fail (e.g., tools from non-existent servers).
The important thing is that the server responds correctly.

To test with a real MCP server, use the Hoot UI:
  npm run dev:full
`);
}

// Check if backend is running
async function checkBackendRunning() {
    try {
        const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
        return response.ok;
    } catch {
        return false;
    }
}

// Main
(async () => {
    console.log('Checking if backend server is running...');

    const isRunning = await checkBackendRunning();

    if (!isRunning) {
        console.error(`
❌ Backend server is not running on ${BASE_URL}

Please start it first:
  npm run backend

Then run this test again.
`);
        process.exit(1);
    }

    console.log('✅ Backend server is running!\n');

    await runTests();
})();

