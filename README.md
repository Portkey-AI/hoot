# 🦉 hoot
> **⚠️ early beta** - things might break. if they do, [open an issue](https://github.com/Portkey-AI/hoot/issues).
> 
> **🤝 contributions welcome** - see something that could be better? PRs are appreciated!

testing tool for MCP servers. like postman but for MCP.


https://github.com/user-attachments/assets/76bad3b4-9206-4b68-ba3d-a1e299802740


## why

needed a quick way to test MCP servers without spinning up a whole AI chat interface.

## install

```bash
npx -y @portkey-ai/hoot
```

that's it. opens on localhost:8009

or install globally if you want:
```bash
npm install -g @portkey-ai/hoot
hoot
```

## what works

- connect to MCP servers (http/sse)
- see what tools they have
- execute tools with params
- view responses
- oauth 2.1 if your server needs it
- copy stuff to clipboard
- **🚀 "try in hoot" links** - share one-click server configs ([docs](./docs/TRY_IN_HOOT.md))

## how it works

runs a node.js backend that connects to MCP servers (because CORS is annoying). react frontend talks to the backend over localhost.

```
browser → backend → mcp servers
```

no cors issues. backend handles oauth tokens in sqlite.

### persistence

- **server configs & tools**: saved in browser localStorage (survives page refreshes)
- **oauth tokens**: stored in `~/.hoot/hoot-mcp.db` (persists across npx runs)

your servers stay configured between sessions, even when running with `npx`!

## running from source

```bash
git clone <repo>
npm install
npm run dev:full
```

backend runs on 8008, frontend on 8009.

## debugging

there's a logger in the console:

```javascript
hootLogger.download()  // get logs
```

## 🔒 security

hoot includes built-in security features for safe local development:
- ✅ session-based authentication
- ✅ rate limiting
- ✅ audit logging
- ✅ localhost-only access

runs securely on your local machine. [read more](./SECURITY.md)

## what's missing

- resources (coming)
- prompts (coming)
- keyboard shortcuts (maybe)
- tests (oops)

## tech

react 19, typescript, vite, zustand, express, MCP SDK

## license

MIT

---

made this because i was tired of curl-ing MCP servers. hope it helps.
