// Test tool execution
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = 'https://mcp.deepwiki.com/mcp';

async function testToolExecution() {
    console.log('🔍 Testing tool execution...');
    console.log('');

    try {
        const transport = new StreamableHTTPClientTransport(new URL(url));
        const client = new Client(
            { name: 'screech-test', version: '0.1.0' },
            { capabilities: {} }
        );

        console.log('1️⃣ Connecting...');
        await client.connect(transport);
        console.log('   ✅ Connected! Session:', transport.sessionId);
        console.log('');

        console.log('2️⃣ Calling tool: read_wiki_structure...');
        console.log('   Input: { repoName: "facebook/react" }');

        const result = await client.callTool({
            name: 'read_wiki_structure',
            arguments: {
                repoName: 'facebook/react'
            }
        });

        console.log('   ✅ Tool executed!');
        console.log('');
        console.log('📊 Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        await client.close();
        console.log('✅ SUCCESS!');

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.message);
        console.error('');

        if (error.code) {
            console.error('Error code:', error.code);
        }

        if (error.data) {
            console.error('Error data:', JSON.stringify(error.data, null, 2));
        }

        if (error.stack) {
            console.error('Stack trace:');
            console.error(error.stack);
        }
    }
}

testToolExecution();

