// Test connection to deepwiki MCP server
// Run with: node test-connection.js

const url = 'https://mcp.deepwiki.com/mcp';

async function testConnection() {
    console.log('🔍 Testing connection to:', url);
    console.log('');

    try {
        // Test 1: Initialize handshake
        console.log('1️⃣ Sending initialize request...');
        const initResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'screech-test',
                        version: '0.1.0',
                    },
                },
                id: 1,
            }),
        });

        console.log('   Status:', initResponse.status, initResponse.statusText);
        console.log('   Headers:', Object.fromEntries(initResponse.headers.entries()));

        if (!initResponse.ok) {
            const text = await initResponse.text();
            console.log('   Body:', text);
            throw new Error(`HTTP ${initResponse.status}: ${initResponse.statusText}`);
        }

        const initResult = await initResponse.json();
        console.log('   ✅ Initialize result:', JSON.stringify(initResult, null, 2));
        console.log('');

        // Extract session ID if present
        const sessionId = initResponse.headers.get('x-mcp-session-id');
        if (sessionId) {
            console.log('   📝 Session ID:', sessionId);
        }

        // Test 2: List tools
        console.log('2️⃣ Listing tools...');
        const toolsResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                ...(sessionId && { 'X-MCP-Session-Id': sessionId }),
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/list',
                params: {},
                id: 2,
            }),
        });

        console.log('   Status:', toolsResponse.status, toolsResponse.statusText);

        if (!toolsResponse.ok) {
            const text = await toolsResponse.text();
            console.log('   Body:', text);
            throw new Error(`HTTP ${toolsResponse.status}: ${toolsResponse.statusText}`);
        }

        const toolsResult = await toolsResponse.json();
        console.log('   ✅ Tools result:', JSON.stringify(toolsResult, null, 2));
        console.log('');

        // Summary
        console.log('✅ SUCCESS! Server is responsive');
        console.log('');
        console.log('📊 Summary:');
        console.log('   - Server URL:', url);
        console.log('   - Protocol:', 'JSON-RPC 2.0');
        console.log('   - Transport:', 'HTTP POST');
        if (toolsResult.result?.tools) {
            console.log('   - Available tools:', toolsResult.result.tools.length);
            console.log('');
            console.log('🛠️  Available Tools:');
            toolsResult.result.tools.forEach((tool, i) => {
                console.log(`   ${i + 1}. ${tool.name}: ${tool.description || 'No description'}`);
            });
        }

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.message);
        console.error('');

        if (error.cause) {
            console.error('Cause:', error.cause);
        }

        // Check for common issues
        if (error.message.includes('fetch')) {
            console.error('💡 Tip: This might be a network or DNS issue');
        } else if (error.message.includes('405')) {
            console.error('💡 Tip: Server doesn\'t accept POST requests at this endpoint');
        } else if (error.message.includes('CORS')) {
            console.error('💡 Tip: CORS issue (expected in browser, but Node.js should work)');
        }
    }
}

testConnection();

