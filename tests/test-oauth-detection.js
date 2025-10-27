// Test auto-detect with OAuth servers
// Run with: node tests/test-oauth-detection.js

const BACKEND_URL = 'http://localhost:8008';

// Test URLs
const TESTS = [
    { url: 'https://mcp.deepwiki.com/mcp', expected: 'DeepWiki', oauth: false },
    { url: 'https://mcp.notion.com/mcp', expected: 'Notion', oauth: true },
    { url: 'https://mcp.portkey.ai/ws----dem-299bc9/zapier-rohit/mcp', expected: 'Portkey', oauth: true },
];

async function getSessionToken() {
    const response = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Origin': 'http://localhost:8009'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get session token');
    }

    const data = await response.json();
    return data.token;
}

async function testAutoDetect(url, expectedName, expectOAuth) {
    try {
        const token = await getSessionToken();

        const response = await fetch(`${BACKEND_URL}/mcp/auto-detect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hoot-token': token,
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.log(`   ❌ Failed: ${data.error}`);
            return false;
        }

        const nameMatches = data.serverInfo?.name === expectedName;
        const oauthMatches = data.requiresOAuth === expectOAuth;

        if (nameMatches && oauthMatches) {
            console.log(`   ✅ Correct! Name: ${data.serverInfo.name}, OAuth: ${data.requiresOAuth}`);
            return true;
        } else {
            console.log(`   ⚠️  Mismatch:`);
            console.log(`      Expected name: ${expectedName}, Got: ${data.serverInfo?.name}`);
            console.log(`      Expected OAuth: ${expectOAuth}, Got: ${data.requiresOAuth}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🔍 Testing OAuth detection and name extraction...\n');

    let passed = 0;
    let failed = 0;

    for (const test of TESTS) {
        console.log(`Testing: ${test.url}`);
        const result = await testAutoDetect(test.url, test.expected, test.oauth);
        if (result) {
            passed++;
        } else {
            failed++;
        }
        console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
        console.log('✅ All tests passed!');
    } else {
        console.log('⚠️  Some tests failed');
    }
}

runTests();

