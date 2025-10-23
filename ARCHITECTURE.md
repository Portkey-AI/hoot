# Screech Project Structure

## 📁 Directory Layout

```
screech/
├── src/
│   ├── components/          # React components
│   │   ├── Sidebar.tsx      # Server list + tool browser
│   │   ├── Sidebar.css
│   │   ├── MainArea.tsx     # Tool execution interface
│   │   ├── MainArea.css
│   │   ├── AddServerModal.tsx
│   │   └── Modal.css
│   ├── stores/              # State management
│   │   └── appStore.ts      # Zustand store (single source of truth)
│   ├── hooks/               # Custom React hooks
│   │   └── useMCP.ts        # MCP connection & execution hooks
│   ├── lib/                 # Core logic
│   │   └── mcpClient.ts     # MCP SDK wrapper
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   ├── App.tsx              # Root component
│   ├── App.css
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles + CSS variables
│   └── vite-env.d.ts
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── tsconfig.node.json       # TypeScript config for build tools
├── package.json
├── .gitignore
├── SCREECH_README.md        # Main documentation
└── EXAMPLES.md              # Usage examples

## 🔄 Data Flow

```
User Interaction
    ↓
Component (memoized)
    ↓
Zustand Action
    ↓
State Update (selective)
    ↓
Re-render (optimized)
```

## 🎯 Key Performance Optimizations

### 1. State Management
- **Zustand** over Redux (3kb vs 40kb+)
- Selective subscriptions (components only re-render on relevant state changes)
- Persisted storage with partialize (only save what's needed)

### 2. Component Optimization
- Memoization with `React.memo()`
- Functional updates to prevent stale closures
- Lazy loading of modals

### 3. CSS Performance
- GPU-accelerated transforms
- `will-change` for animated elements
- CSS variables for instant theme switching
- Minimal repaints/reflows

### 4. Bundle Optimization
- Vite for fast HMR (Hot Module Replacement)
- Tree-shaking unused code
- Code splitting ready
- Minimal dependencies

## 📦 Dependencies

### Production (Minimal!)
- `react` (19.x) - UI framework
- `react-dom` (19.x) - React DOM rendering
- `zustand` (5.x) - State management (3kb!)
- `@modelcontextprotocol/sdk` - MCP protocol

### Development
- `vite` - Build tool (fast!)
- `typescript` - Type safety
- `@vitejs/plugin-react` - React support

**Total production bundle**: ~150kb (gzipped)

## 🚀 Performance Metrics (Target)

- **First Paint**: < 500ms
- **Interaction to Next Paint**: < 100ms
- **Bundle Size**: < 200kb gzipped
- **Memory Usage**: < 50MB
- **Frame Rate**: 60fps (GPU acceleration)

## 🧪 Testing Strategy (Future)

```
tests/
├── unit/
│   ├── stores/
│   ├── hooks/
│   └── lib/
├── integration/
│   └── components/
└── e2e/
    └── scenarios/
```

## 🎨 CSS Architecture

### Variables System
All colors, spacing, and transitions defined in CSS variables:
- Easy theming
- Instant updates (no JS)
- Consistent design system

### Naming Convention
- Component-based: `.component-name`
- State modifiers: `.active`, `.error`, `.disabled`
- Utility classes: `.animate-fade-in`, `.gpu-accelerated`

### Animation Strategy
- CSS transforms (GPU) over position/margin
- `transition` for simple state changes
- `animation` for complex sequences
- `will-change` for known animations

## 🔌 MCP Integration

### Client Manager Pattern
```typescript
Singleton MCPClientManager
    ├── manages multiple server connections
    ├── connection pooling
    ├── automatic reconnection (future)
    └── error handling
```

### Transport Support
- **stdio**: Local process communication (fastest)
- **SSE**: Server-Sent Events (real-time)
- **HTTP**: Standard REST (cross-platform)

## 🗺️ Component Hierarchy

```
App
├── Sidebar
│   ├── SidebarHeader
│   │   └── AddServerButton → triggers modal
│   ├── ServersList
│   │   └── ServerItem (memoized)
│   └── ToolsList
│       ├── SearchBox
│       └── ToolItem (memoized)
├── MainArea
│   ├── EmptyState (conditional)
│   └── ToolExecutionView
│       ├── SchemaViewer
│       ├── InputSection
│       │   ├── ModeToggle (Form/JSON)
│       │   ├── FormInput
│       │   └── JsonEditor
│       └── ResultSection
│           ├── ResultTabs
│           └── ResultContent
└── AddServerModal (conditional)
```

## 🎯 Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes**: Hot reload instant
3. **Check types**: TypeScript in editor
4. **Build**: `npm run build`
5. **Preview**: `npm run preview`

## 📝 Code Style

- **TypeScript**: Strict mode enabled
- **Functional components**: Hooks-based
- **No default exports**: Named exports only (except App)
- **Memo strategically**: Only for expensive renders
- **CSS Modules**: Scoped styles per component

