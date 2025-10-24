# 🦉 hoot
> **⚠️ early beta** - things might break. if they do, [open an issue](https://github.com/Portkey-AI/hoot/issues).
> 
> **🤝 contributions welcome** - see something that could be better? PRs are appreciated!

testing tool for MCP servers. like postman but for MCP.

## why

needed a quick way to test MCP servers without spinning up a whole AI chat interface.

## install

```bash
npx -y @portkey-ai/hoot
```

that's it. opens on localhost:5173

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

## how it works

runs a node.js backend that connects to MCP servers (because CORS is annoying). react frontend talks to the backend over localhost.

```
browser → backend → mcp servers
```

no cors issues. backend handles oauth tokens in sqlite.

## running from source

```bash
git clone <repo>
npm install
npm run dev:full
```

backend runs on 3002, frontend on 5173.

## debugging

there's a logger in the console:

```javascript
hootLogger.download()  // get logs
```

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
