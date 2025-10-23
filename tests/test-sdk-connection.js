// Test connection using the MCP SDK directly
// Run with: node test-sdk-connection.js

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = 'https://mcp.deepwiki.com/mcp';

async function testWithSDK() {
    console.log('🔍 Testing connection with MCP SDK...');
    console.log('URL:', url);
    console.log('');

    try {
        // Create transport
        const transport = new StreamableHTTPClientTransport(new URL(url));

        // Create client
        const client = new Client(
            {
                name: 'screech-test',
                version: '0.1.0',
            },
            {
                capabilities: {},
            }
        );

        console.log('1️⃣ Connecting...');
        await client.connect(transport);
        console.log('   ✅ Connected!');
        console.log('   Session ID:', transport.sessionId);
        console.log('');

        console.log('2️⃣ Listing tools...');
        const toolsResult = await client.listTools();
        console.log('   ✅ Tools received!');
        console.log('');

        console.log('📊 Summary:');
        console.log('   - Total tools:', toolsResult.tools.length);
        console.log('');

        console.log('🛠️  Available Tools:');
        toolsResult.tools.forEach((tool, i) => {
            console.log(`   ${i + 1}. ${tool.name}`);
            console.log(`      ${tool.description || 'No description'}`);
            if (tool.inputSchema) {
                const props = tool.inputSchema.properties || {};
                const propCount = Object.keys(props).length;
                if (propCount > 0) {
                    console.log(`      Parameters: ${Object.keys(props).join(', ')}`);
                }
            }
            console.log('');
        });

        console.log('✅ SUCCESS! Server is fully functional with Screech!');

        // Close connection
        await client.close();

    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.message);
        console.error('');
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    }
}

testWithSDK();

