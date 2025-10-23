# 🦉 Hoot - MCP Testing Tool

**Postman for MCP Servers** - A fast, lightweight tool for testing Model Context Protocol servers.

## ✨ Features

- 🚀 **Fast & Lightweight** - Browser-based UI with Node.js backend
- 🔐 **Full OAuth 2.1 Support** - PKCE, automatic token refresh, secure storage
- 🌐 **No CORS Issues** - Backend relay architecture eliminates CORS problems
- 🎨 **Beautiful UI** - Ayu Mirage theme, smooth animations
- 📋 **Tool Testing** - Execute tools, view results, copy responses
- 💾 **Persistent Storage** - Servers, tools, and history cached locally
- 🐛 **Dev Logger** - Download console logs for debugging
- ⚡ **Real-time Feedback** - Live execution timer, toast notifications
- 🎯 **Smart UX** - Empty states, error boundaries, loading skeletons

## 🚀 Quick Start

### Run with npx (Recommended)
```bash
npx -y @portkey-ai/hoot
```

That's it! This command will:
- ✅ Install Hoot if not already installed
- ✅ Start the backend server on `http://localhost:3002`
- ✅ Start the frontend UI on `http://localhost:5173`
- ✅ Open your browser automatically

Press `Ctrl+C` to stop both servers.

### Install Globally (Alternative)
```bash
npm install -g @portkey-ai/hoot
hoot
```

### Development Setup
If you want to contribute or develop locally:

```bash
# Clone the repository
git clone https://github.com/yourusername/hoot.git
cd hoot

# Install dependencies
npm install

# Start both backend and frontend
npm run dev:full

# Or start them separately
npm run backend  # Terminal 1
npm run dev      # Terminal 2
```

This starts:
- **Backend MCP Server** on `http://localhost:3002` (handles MCP connections)
- **Hoot UI** on `http://localhost:5173` (Vite dev server)

## 📖 Usage

1. **Start Hoot** - Run `npx -y @portkey-ai/hoot`
2. **Add Server** - Click "+ Add Server"
3. **Configure**:
   - Name: "My MCP Server"
   - Transport: HTTP or SSE
   - URL: https://your-mcp-server.com
   - Auth: None / Headers / OAuth
4. **Connect** - Server appears in sidebar with tool count
5. **Select Tool** - Click any tool to test it
6. **Execute** - Fill params, click "EXECUTE TOOL"
7. **View Results** - Response, Raw JSON, or Request tabs

## 🏗️ Architecture

Hoot uses a **backend relay architecture** to eliminate CORS issues:

```
Browser App (React) → Backend Server (Node.js) → MCP Servers
     (UI)                  (MCP Client)           (External)
```

- **Frontend**: React UI running in browser
- **Backend**: Node.js server with MCP SDK (handles actual connections)
- **Communication**: REST API over localhost (no CORS issues)

See [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md) for detailed architecture documentation.

## 🌐 No More CORS Issues!

The backend relay architecture completely eliminates CORS issues. The Node.js backend acts as the MCP client and communicates server-to-server with MCP servers, while the browser UI simply relays requests through the local backend.

**Benefits**:
- ✅ Works with any MCP server (no CORS configuration needed)
- ✅ More secure (credentials stay on backend)
- ✅ Better performance (persistent connections)
- ✅ Full OAuth 2.1 support maintained

**Old CORS Proxy (deprecated)**: The old proxy method is still available via `npm run dev:with-proxy`, but the backend relay is now the recommended approach.

**See [docs/BACKEND_ARCHITECTURE.md](./docs/BACKEND_ARCHITECTURE.md) for detailed architecture documentation.**

## 🔐 OAuth 2.1 Support

Hoot supports full OAuth 2.1 authorization flow:

- ✅ Authorization redirect with PKCE
- ✅ Automatic token exchange  
- ✅ Token refresh
- ✅ Secure storage (SQLite database)
- ✅ Multiple servers with different auth

**See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for details.**

## 🎨 UI Features

### Toasts
- Connection errors
- Execution errors  
- Proxy status changes
- Copy failures

### Empty States
- No servers: "Add your first server"
- No tools: "Server doesn't expose tools"
- No tool selected: "Select a tool to test"

### Live Feedback
- **Execute button timer**: Shows elapsed time during execution
- **Spinning icons**: Refresh actions
- **Copy buttons**: One-click copy with checkmark feedback
- **Status dots**: Green (connected) / Gray (disconnected)

### Dev Logger
```javascript
// In browser console:
hootLogger.download()  // Download logs to file
hootLogger.get()       // View in console
hootLogger.clear()     // Clear logs
hootLogger.count()     // Get log count
```

## 📂 Project Structure

```
hoot/
├── bin/
│   └── hoot.js          # CLI entry point
├── src/
│   ├── components/      # React components
│   │   ├── ServerSidebar.tsx
│   │   ├── ToolsSidebar.tsx
│   │   ├── MainArea.tsx
│   │   └── ...
│   ├── stores/          # Zustand state management
│   │   ├── appStore.ts
│   │   └── toastStore.ts
│   ├── hooks/           # Custom React hooks
│   │   ├── useMCP.ts
│   │   └── useAutoReconnect.ts
│   ├── lib/             # Core libraries
│   │   ├── mcpClient.ts      # MCP SDK wrapper
│   │   ├── backendClient.ts  # Backend API client
│   │   ├── oauthProvider.ts  # OAuth implementation
│   │   └── logger.ts         # Dev logger
│   └── types/           # TypeScript types
├── docs/                # Documentation
│   ├── ARCHITECTURE.md
│   ├── AUTHENTICATION.md
│   ├── BACKEND_ARCHITECTURE.md
│   └── ...
├── mcp-backend-server.js  # Backend MCP relay server
└── package.json
```

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)
- [Authentication & OAuth](./docs/AUTHENTICATION.md)
- [Design System](./docs/DESIGN_HOOT.md)
- [Quick Start Guide](./docs/QUICKSTART.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Full Documentation Index](./docs/README.md)

## 🛠️ npm Scripts

```bash
npx -y @portkey-ai/hoot  # Run Hoot (recommended)
npm start                # Start both backend + frontend
npm run dev              # Start Hoot UI only
npm run backend          # Start backend server only
npm run dev:full         # Start both (concurrently)
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🔧 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **MCP SDK** - Model Context Protocol
- **Express** - Proxy server
- **Lucide React** - Icons

## 📊 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 🐛 Debugging

### Enable Dev Logger
Automatically enabled in development. Access via browser console:
```javascript
hootLogger.download()
```

### Check Proxy Status
```bash
curl http://localhost:3001/health
```

### View Console Logs
All MCP operations are logged with emojis:
- 🦉 Proxy server
- 🔧 Transport creation
- 🔌 Connections
- 🔐 OAuth flows
- ✓ Success
- ❌ Errors

## 📝 Roadmap

### v0.2 (Current)
- [x] Full OAuth 2.1 support
- [x] CORS proxy
- [x] UI polish (toasts, empty states, copy buttons)
- [x] Live execution timer
- [x] Dev logger

### v0.3 (Planned)
- [ ] Resource testing UI
- [ ] Prompt testing UI  
- [ ] Keyboard shortcuts (Cmd+K, Cmd+E)
- [ ] Browser extension (CORS bypass)

### v1.0 (Future)
- [ ] Electron app (stdio transport support)
- [ ] Encrypted credential storage
- [ ] Advanced testing features

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

- **MCP SDK** - [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Ayu Theme** - Color palette inspiration
- **Lucide** - Beautiful icons

---

Made with 🦉 by developers, for developers.
