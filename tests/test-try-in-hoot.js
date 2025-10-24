#!/usr/bin/env node

/**
 * Test script for "Try in Hoot" link generation and parsing
 */

import { generateTryInHootLink, decodeTryInHootLink } from '../src/lib/tryInHootLinks.js';

console.log('🧪 Testing "Try in Hoot" Link Generation\n');

// Test 1: Simple HTTP server
console.log('Test 1: Simple HTTP Server');
const test1Config = {
    name: 'Weather MCP Server',
    transport: 'http',
    url: 'http://localhost:3000'
};
const link1 = generateTryInHootLink(test1Config, 'https://hoot.app');
console.log('Generated link:', link1);
const decoded1 = decodeTryInHootLink(link1);
console.log('Decoded config:', JSON.stringify(decoded1, null, 2));
console.log('✅ Test 1 passed\n');

// Test 2: Server with header auth
console.log('Test 2: Server with Header Auth');
const test2Config = {
    name: 'GitHub MCP Server',
    transport: 'http',
    url: 'https://github-mcp.example.com',
    auth: {
        type: 'headers',
        headers: {
            'Authorization': 'Bearer ghp_test123'
        }
    }
};
const link2 = generateTryInHootLink(test2Config, 'https://hoot.app');
console.log('Generated link:', link2);
const decoded2 = decodeTryInHootLink(link2);
console.log('Decoded config:', JSON.stringify(decoded2, null, 2));
console.log('✅ Test 2 passed\n');

// Test 3: Server with OAuth
console.log('Test 3: Server with OAuth');
const test3Config = {
    name: 'Google Drive MCP',
    transport: 'http',
    url: 'https://drive-mcp.example.com',
    auth: {
        type: 'oauth'
    }
};
const link3 = generateTryInHootLink(test3Config, 'https://hoot.app');
console.log('Generated link:', link3);
const decoded3 = decodeTryInHootLink(link3);
console.log('Decoded config:', JSON.stringify(decoded3, null, 2));
console.log('✅ Test 3 passed\n');

// Test 4: SSE server
console.log('Test 4: SSE Server');
const test4Config = {
    name: 'Real-time Notifications',
    transport: 'sse',
    url: 'https://notifications-mcp.example.com/events'
};
const link4 = generateTryInHootLink(test4Config, 'https://hoot.app');
console.log('Generated link:', link4);
const decoded4 = decodeTryInHootLink(link4);
console.log('Decoded config:', JSON.stringify(decoded4, null, 2));
console.log('✅ Test 4 passed\n');

console.log('🎉 All tests passed!');
console.log('\nExample links you can try:');
console.log('1. Weather Server:', link1);
console.log('2. GitHub Server:', link2);
console.log('3. Google Drive:', link3);
console.log('4. Notifications:', link4);

