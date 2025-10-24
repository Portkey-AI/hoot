#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read package.json for version info
const packageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf-8')
);

console.log(`
🦉 Starting Hoot v${packageJson.version}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Postman for MCP Servers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Track child processes for cleanup
const processes = [];

// Function to kill all child processes
function cleanup() {
    console.log('\n🦉 Shutting down Hoot...');
    processes.forEach(proc => {
        try {
            proc.kill('SIGTERM');
        } catch (err) {
            // Process might already be dead
        }
    });
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start backend server
console.log('📡 Starting backend server on port 8008...');
const backend = spawn('node', [join(rootDir, 'mcp-backend-server.js')], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' }
});

processes.push(backend);

backend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.log(output);
});

backend.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.error(output);
});

backend.on('error', (err) => {
    console.error('❌ Failed to start backend server:', err.message);
    cleanup();
});

backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`❌ Backend server exited with code ${code}`);
        cleanup();
    }
});

// Helper function to wait for backend to be ready
async function waitForBackend() {
    const maxAttempts = 30; // 30 seconds max
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch('http://localhost:8008/health');
            if (response.ok) {
                return true;
            }
        } catch {
            // Backend not ready yet, wait and retry
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

// Give backend time to start, then wait for health check
setTimeout(async () => {
    console.log('⏳ Waiting for backend to be ready...');
    const backendReady = await waitForBackend();

    if (!backendReady) {
        console.error('❌ Backend failed to start within 30 seconds');
        cleanup();
        return;
    }

    console.log('✅ Backend is ready!');

    // Check if we're in development (src/ exists) or production (using dist/)
    const srcExists = existsSync(join(rootDir, 'src'));
    const mode = srcExists ? 'development' : 'production';

    console.log(`🌐 Starting frontend in ${mode} mode on port 8009...`);

    // Start vite - use dev mode if src exists, preview mode if using built dist/
    const viteCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const viteArgs = srcExists ? ['vite', '--open'] : ['vite', 'preview', '--open', '--port', '8009'];

    const frontend = spawn(viteCommand, viteArgs, {
        cwd: rootDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            // Ensure npm modules are in PATH
            PATH: `${join(rootDir, 'node_modules', '.bin')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
        }
    });

    processes.push(frontend);

    frontend.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) console.log(output);
    });

    frontend.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) console.error(output);
    });

    frontend.on('error', (err) => {
        console.error('❌ Failed to start frontend server:', err.message);
        cleanup();
    });

    frontend.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`❌ Frontend server exited with code ${code}`);
        }
        cleanup();
    });

    // Wait a bit for frontend to fully start, then show success message
    setTimeout(() => {
        const port = srcExists ? 8009 : 8010;
        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Hoot is running!
   
   Backend:  http://localhost:8008
   Frontend: http://localhost:${port}
   
   Press Ctrl+C to stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
    }, 3000);

}, 1000);

