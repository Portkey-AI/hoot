# 🦉 Hoot - Postman for MCP Servers

A **blazingly fast**, lightweight testing tool for Model Context Protocol (MCP) servers. Built for developers who value performance and simplicity.

## ✨ Features

### v0.1 Core Features
- 🚀 **Lightning Fast** - Built with performance in mind using lightweight libraries (Zustand, Vite)
- 🔌 **Multi-Transport Support** - SSE and HTTP transports (stdio via Electron coming soon)
- 🛠️ **Tool Testing** - Execute MCP tools with form or JSON input modes
- 💾 **Session Management** - Server configs and execution history
- 🎨 **Beautiful Ayu Mirage Theme** - Carefully crafted developer-friendly design
- 🔍 **Tool Search** - Instant filtering of available tools

## 🎯 Performance Optimizations

We've made architectural decisions specifically for snappiness:

1. **Zustand State Management** - 3kb vs Redux's 40kb+
2. **GPU-Accelerated CSS** - Transform-based animations, no JavaScript overhead
3. **React 18 Concurrent Features** - Optimized rendering
4. **Memoized Components** - Prevents unnecessary re-renders
5. **Official MCP SDK** - StreamableHTTPClientTransport support
6. **Native Browser APIs** - Fast and lightweight

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Visit **http://localhost:3000** and start testing!

## 📖 Usage

### 1. Add a Server
Click **"+ Add Server"** and configure your MCP server:
- **Name**: A friendly name for your server
- **Transport**: Choose SSE or HTTP
- **URL**: Connection endpoint

### 2. Connect & Discover Tools
The app automatically discovers available tools when connected.

### 3. Test Tools
- Select a tool from the sidebar
- Choose **Form** or **JSON** input mode
- Fill in parameters
- Click **Execute Tool**
- View results in Response, Raw JSON, or Request tabs

## 🎨 Design System

### Ayu Mirage Bordered Palette
- **Deep blue-gray backgrounds** - Easy on the eyes
- **Cyan/blue accents** - Clear call-to-actions
- **Inter + JetBrains Mono** - Professional typography
- **Smooth animations** - GPU-accelerated for 60fps

### Character
- **🦉 Owl mascot** - Wise and observant
- **Developer-focused** - Monospace where it matters
- **Professional yet friendly** - Clean with personality

## 🏗️ Architecture

```
src/
├── components/       # React components (memoized for performance)
│   ├── Sidebar.tsx
│   ├── MainArea.tsx
│   └── AddServerModal.tsx
├── stores/          # Zustand state management
│   └── appStore.ts
├── hooks/           # Custom React hooks
│   └── useMCP.ts
├── lib/             # MCP client integration
│   └── mcpClient.ts
└── types/           # TypeScript definitions
    └── index.ts
```

### State Management Philosophy

We use **Zustand** for global state because:
- Minimal boilerplate
- No context hell
- Excellent performance
- Tiny bundle size (3kb)

## 🔌 MCP SDK Integration

Hoot uses the official `@modelcontextprotocol/sdk`:

```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
await client.connect(transport);
```

## 🗺️ Roadmap

### v0.2 (Planned)
- [ ] Electron app for stdio transport
- [ ] Resource and prompt testing
- [ ] Import/export collections
- [ ] Keyboard shortcuts
- [ ] Request history persistence

### v0.3 (Future)
- [ ] Request diffing
- [ ] Batch execution
- [ ] Custom themes
- [ ] Plugin system

## 🤝 Contributing

We welcome contributions! Focus areas:
- Performance optimizations
- New transport types
- UI/UX improvements
- Bug fixes

## 📝 License

MIT

## 🙏 Acknowledgments

Built with:
- [React 18](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [MCP SDK](https://modelcontextprotocol.io/) - Protocol implementation

---

**Made with ⚡ for developers who value speed**

Visit us at **http://localhost:3000** 🦉

