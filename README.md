# 🦉 Hoot

[![npm version](https://img.shields.io/npm/v/@portkey-ai/hoot?color=5ccfe6&label=version)](https://www.npmjs.com/package/@portkey-ai/hoot)
[![npm downloads](https://img.shields.io/npm/dm/@portkey-ai/hoot?color=5ccfe6)](https://www.npmjs.com/package/@portkey-ai/hoot)
[![License: MIT](https://img.shields.io/badge/License-MIT-5ccfe6.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@portkey-ai/hoot?color=5ccfe6)](https://nodejs.org)

**MCP Testing Tool** — Like Postman, but for the Model Context Protocol.

Test, debug, and explore MCP servers with a beautiful interface. No AI chat needed.

https://github.com/user-attachments/assets/e3add38e-9636-4f40-99d8-f4a2b8f0f056

> **⚠️ Beta Software** — Hoot is in active development. Found a bug? [Open an issue](https://github.com/Portkey-AI/hoot/issues). Want to contribute? [PRs welcome](./CONTRIBUTING.md)!

## Quick Start

**🌐 Try instantly (no install):**

👉 **[hoot.run](https://hoot.run)** — Opens in your browser, ready to test.

**Or run locally:**

```bash
npx -y @portkey-ai/hoot
```

Opens on `localhost:8009`. One command, zero config.

![npx-hoot](https://github.com/user-attachments/assets/3c8c80e2-6ad3-439e-80eb-e2f6c4d22d8e)


## Features

### Core Testing
- **Connect to any MCP server** — HTTP and SSE transport support
- **Auto-detection** — Just paste a URL, Hoot figures out the rest
- **Execute tools** — Test tools with parameters and view responses
- **Copy-paste friendly** — Everything is clipboard-ready

### Authentication & Security
- **OAuth 2.1** with automatic discovery and compliance testing ([docs](./docs/OAUTH-COMPLIANCE-COMPLETE.md))
- **JWT-based sessions** — Secure local authentication
- **Rate limiting & audit logs** — Built-in security features
- **Localhost-only by default** — Safe for local development

### Smart Features
- **Intelligent tool filtering** — Context-aware tool selection powered by AI
- **Chat interface** — Test tools conversationally with LLM assistance
- **Keyboard shortcuts** — Lightning-fast navigation ([docs](./docs/KEYBOARD_SHORTCUTS.md))
- **8 beautiful themes** — Light & dark modes for every preference ([docs](./docs/THEMES.md))

### Sharing & Collaboration
- **🦉 "Try in Hoot" links** — Share servers with a single URL ([docs](./docs/TRY_IN_HOOT.md))
- **Persistent state** — Your servers and tools stay configured between sessions

## How It Works

Hoot runs a Node.js backend that acts as the MCP client, eliminating CORS issues when connecting to MCP servers from your browser.

```
Browser (React) → Backend (Node.js/Express) → MCP Servers
```

**Architecture highlights:**
- **No CORS headaches** — Backend handles all MCP connections
- **Persistent OAuth tokens** — Stored securely in SQLite (`~/.hoot/hoot-mcp.db`)
- **Session-based auth** — JWT tokens for secure frontend-backend communication
- **Edge-ready** — Deploy to Cloudflare Workers for global hosting ([guide](./docs/CLOUDFLARE_DEPLOYMENT.md))

### Data Persistence

**On hoot.run:**
- **Server configs & tools** — Saved in browser localStorage
- **OAuth tokens** — Managed by the hosted backend
- **Chat history** — Preserved in localStorage

**On local (npx/npm):**
- **Server configs & tools** — Saved in browser localStorage
- **OAuth tokens** — Stored in `~/.hoot/hoot-mcp.db` (persists across npx runs)
- **Chat history** — Preserved in localStorage

Your servers stay configured between sessions!

## Development

**Run from source:**

```bash
git clone https://github.com/Portkey-AI/hoot
cd hoot
npm install
npm run dev:full
```

- Backend runs on `localhost:8008`
- Frontend runs on `localhost:8009`

**Available scripts:**
- `npm run dev:full` — Run both frontend and backend
- `npm run backend` — Backend only
- `npm run dev` — Frontend only
- `npm run build` — Build for npm distribution
- `npm run build:cloudflare` — Build for Cloudflare Workers

### Debugging

Hoot includes a client-side logger accessible from the browser console:

```javascript
hootLogger.download()  // Download logs as JSON
hootLogger.clear()     // Clear logs
```

Backend logs are written to `backend.log`. See [logging docs](./docs/LOGGING.md) for details.

## Documentation

- **[Quick Start Guide](./docs/QUICKSTART.md)** — Get up and running in 5 minutes
- **[Try in Hoot](./docs/TRY_IN_HOOT.md)** — Share servers with one-click links
- **[Authentication](./docs/AUTHENTICATION.md)** — OAuth 2.1 and API key setup
- **[Themes](./docs/THEMES.md)** — Customize your interface
- **[Keyboard Shortcuts](./docs/KEYBOARD_SHORTCUTS.md)** — Work faster
- **[Architecture](./docs/ARCHITECTURE.md)** — How Hoot is built
- **[Security](./docs/SECURITY.md)** — Security features and best practices
- **[Cloudflare Deployment](./docs/CLOUDFLARE_DEPLOYMENT.md)** — Deploy to the edge

[📚 Full Documentation](./docs/)

## Why Hoot?

| Feature | Hoot | Manual curl/testing |
|---------|------|---------------------|
| **OAuth 2.1 support** | ✅ Automatic discovery & flow | ❌ Manual token management |
| **Transport auto-detection** | ✅ HTTP/SSE auto-detected | ❌ Manual configuration |
| **Visual interface** | ✅ Beautiful UI | ❌ Terminal only |
| **Tool filtering** | ✅ AI-powered context-aware | ❌ None |
| **Session persistence** | ✅ Configs & tokens saved | ❌ Reauth every time |
| **Share configurations** | ✅ One-click "Try in Hoot" links | ❌ Copy-paste configs |

## FAQ

<details>
<summary><strong>Does Hoot work with all MCP servers?</strong></summary>

Yes! Hoot supports both HTTP and SSE transports, OAuth 2.1, and API key authentication. We auto-detect server configurations to make connection as seamless as possible.
</details>

<details>
<summary><strong>Is my data secure?</strong></summary>

Yes. Hoot runs entirely on your local machine. OAuth tokens are stored in a local SQLite database (`~/.hoot/hoot-mcp.db`), and all communication happens over localhost. No data is sent to external servers.
</details>

<details>
<summary><strong>Can I use Hoot in production?</strong></summary>

Hoot is designed for development and testing. For production deployments, you can deploy Hoot to Cloudflare Workers for your team. See our [deployment guide](./docs/CLOUDFLARE_DEPLOYMENT.md).
</details>

<details>
<summary><strong>How do I test servers that require OAuth?</strong></summary>

Just add the server URL. Hoot automatically detects OAuth requirements and guides you through the authorization flow. Tokens are stored securely and refreshed automatically.
</details>

<details>
<summary><strong>Can I test multiple servers at once?</strong></summary>

Absolutely! Connect to as many servers as you need. Hoot manages all connections simultaneously and lets you switch between them instantly.
</details>

<details>
<summary><strong>Does Hoot support resources and prompts?</strong></summary>

Not yet, but they're coming soon! Currently, Hoot focuses on tool testing. Resources and prompts are on our roadmap.
</details>

## Roadmap

We're working towards full MCP specification support. Coming soon:

- **Resources** — MCP resource listing and reading
- **Prompts** — MCP prompt testing and execution
- **Electron desktop app** — Native app with stdio transport support
- **Collaborative workspaces** — Share server configs with teams

Want to contribute? Check out [CONTRIBUTING.md](./CONTRIBUTING.md) or [open an issue](https://github.com/Portkey-AI/hoot/issues) with feature requests!

## Technology Stack

- **Frontend** — React 19, TypeScript, Vite, Zustand
- **Backend** — Node.js, Express, MCP SDK
- **Database** — SQLite (better-sqlite3)
- **Deployment** — npm, Cloudflare Workers + Durable Objects
- **AI** — Workers AI for semantic tool filtering

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

**Built by [Portkey](https://portkey.ai)** — Making AI development easier, one tool at a time.

Made this because we were tired of curl-ing MCP servers. Hope it helps! 🦉
