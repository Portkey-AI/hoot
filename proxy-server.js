import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8009'], // Vite dev server ports
    credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint - must come BEFORE proxy middleware
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({
        status: 'ok',
        message: 'Hoot CORS Proxy is running',
        port: PORT,
    });
});

// Proxy middleware for MCP servers
app.use('/proxy', createProxyMiddleware({
    changeOrigin: true,
    selfHandleResponse: false,
    router: (req) => {
        const targetUrl = req.query.target;
        if (!targetUrl || typeof targetUrl !== 'string') {
            console.error('[Proxy] Missing target URL');
            return 'http://localhost:3001';
        }

        try {
            const url = new URL(targetUrl);
            const origin = `${url.protocol}//${url.host}`;
            console.log(`[Proxy] ${req.method} → ${targetUrl}`);
            console.log(`[Proxy] Routing to: ${origin}`);
            return origin;
        } catch (err) {
            console.error('[Proxy] Invalid URL:', targetUrl);
            return 'http://localhost:3001';
        }
    },
    pathRewrite: (path, req) => {
        const targetUrl = req.query.target;
        if (!targetUrl || typeof targetUrl !== 'string') {
            return path;
        }

        try {
            const url = new URL(targetUrl);
            const newPath = url.pathname + url.search + url.hash;
            console.log(`[Proxy] Path: ${newPath}`);
            return newPath;
        } catch (err) {
            console.error('[Proxy] Path error:', err);
            return path;
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`[Proxy] Response: ${proxyRes.statusCode}`);
        proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
        proxyRes.headers['access-control-allow-credentials'] = 'true';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, *';
    },
    onError: (err, req, res) => {
        console.error(`[Proxy Error] ${err.message}`);

        if (!res.headersSent) {
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': req.headers.origin || '*',
                'Access-Control-Allow-Credentials': 'true',
            });
            res.end(JSON.stringify({
                error: 'Proxy Error',
                message: err.message,
            }));
        }
    },
}));

// 404 handler
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Express Error]', err);
    if (!res.headersSent) {
        res.status(500).json({
            error: 'Server Error',
            message: err.message,
        });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
🦉 Hoot CORS Proxy Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Running on: http://localhost:${PORT}
✓ Health check: http://localhost:${PORT}/health
✓ Proxy endpoint: http://localhost:${PORT}/proxy?target=<URL>

This proxy allows Hoot to connect to MCP servers
without CORS issues. Keep this running alongside
the Hoot UI.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Kill the process using: lsof -ti:${PORT} | xargs kill -9`);
        process.exit(1);
    } else {
        console.error('\n❌ Server error:', err);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🦉 Shutting down proxy server...');
    server.close(() => {
        console.log('✓ Proxy server stopped');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🦉 Shutting down proxy server...');
    server.close(() => {
        console.log('✓ Proxy server stopped');
        process.exit(0);
    });
});
