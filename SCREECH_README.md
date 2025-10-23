# 🦇 Screech - Postman for MCP Servers

A **blazingly fast**, lightweight testing tool for Model Context Protocol (MCP) servers. Built for developers who value performance and simplicity.

## ✨ Features

### v0.1 Core Features
- 🚀 **Lightning Fast** - Built with performance in mind using lightweight libraries (Zustand, Vite)
- 🔌 **Multi-Transport Support** - stdio, SSE, and HTTP transports
- 🛠️ **Tool Testing** - Execute MCP tools with form or JSON input modes
- 💾 **Persistent Configuration** - Server configs saved locally for quick access
- 📊 **Request/Response History** - Session-based history (last 100 executions)
- 🎨 **Beautiful Dark Theme** - GPU-accelerated animations for buttery smooth UX
- 🔍 **Tool Search** - Instant filtering of available tools

## 🎯 Performance Optimizations

We've made architectural decisions specifically for snappiness:

1. **Zustand State Management** - 3kb vs Redux's 40kb+
2. **GPU-Accelerated CSS** - Transform-based animations, no JavaScript overhead
3. **React 18 Concurrent Features** - Optimized rendering
4. **Memoized Components** - Prevents unnecessary re-renders
5. **Code Splitting** - Fast initial load
6. **Native Browser APIs** - IndexedDB for persistence, no heavy wrappers

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📖 Usage

### 1. Add a Server
Click **"+ Add Server"** and configure your MCP server:
- **Name**: A friendly name for your server
- **Transport**: Choose stdio, SSE, or HTTP
- **Command/URL**: Connection details

### 2. Connect & Discover Tools
The app automatically discovers available tools when connected.

### 3. Test Tools
- Select a tool from the sidebar
- Choose **Form** or **JSON** input mode
- Fill in parameters
- Click **Execute Tool**
- View results in Response, Raw JSON, or Request tabs

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
- Built-in persistence

### Performance Patterns

**Memoization Strategy**:
```typescript
// Components are memoized to prevent unnecessary re-renders
export const Sidebar = memo(function Sidebar({ onAddServer }) {
  // ...
});
```

**Selective State Updates**:
```typescript
// Zustand selectors only re-render when selected state changes
const servers = useAppStore((state) => state.servers);
```

**GPU Acceleration**:
```css
/* CSS transforms trigger GPU acceleration */
.sidebar {
  transform: translateZ(0);
  will-change: background;
}
```

## 🎨 Design Principles

1. **Minimal Chrome** - No unnecessary UI elements
2. **Instant Feedback** - All interactions < 100ms
3. **Dark Theme** - Easy on the eyes for long sessions
4. **Clear Visual Hierarchy** - Important info stands out
5. **Keyboard Friendly** - Tab navigation and focus states

## 🔌 MCP SDK Integration

Screech uses the official `@modelcontextprotocol/sdk` for server communication:

```typescript
// Singleton pattern for performance
class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  
  async connect(config: ServerConfig): Promise<void> {
    // Efficient connection management
  }
}

export const mcpClient = new MCPClientManager();
```

## 🗺️ Roadmap

### v0.2 (Planned)
- [ ] Resource and prompt testing
- [ ] Import/export collections
- [ ] Keyboard shortcuts
- [ ] Copy as cURL/code snippets
- [ ] Advanced error handling with stack traces

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

