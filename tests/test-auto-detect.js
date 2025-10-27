// Test auto-detect endpoint
// Run with: node tests/test-auto-detect.js

const BACKEND_URL = 'http://localhost:8008';
const TEST_URL = 'https://mcp.deepwiki.com/mcp'; // A known working MCP server

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

async function testAutoDetect() {
    console.log('🔍 Testing auto-detect endpoint...\n');
    
    try {
        // Get session token
        console.log('1️⃣ Getting session token...');
        const token = await getSessionToken();
        console.log('   ✅ Token retrieved\n');

        // Test auto-detect
        console.log('2️⃣ Testing auto-detect for:', TEST_URL);
        const response = await fetch(`${BACKEND_URL}/mcp/auto-detect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hoot-token': token,
            },
            body: JSON.stringify({ url: TEST_URL }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('   ❌ Request failed:', data.error);
            return;
        }

        console.log('   ✅ Auto-detect successful!\n');
        console.log('📊 Detection Results:');
        console.log('   Transport:', data.transport?.toUpperCase());
        console.log('   Server Name:', data.serverInfo?.name);
        console.log('   Version:', data.serverInfo?.version);
        console.log('   Requires OAuth:', data.requiresOAuth ? 'Yes' : 'No');
        console.log('');
        
        console.log('✅ All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('   Make sure the backend is running: npm run backend');
    }
}

testAutoDetect();

