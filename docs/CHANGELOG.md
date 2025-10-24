# Changelog

All notable changes to Hoot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-10-23

### Added
- **Node.js Backend Server Architecture**: Introduced a Node.js Express backend that acts as the MCP client, eliminating CORS errors when connecting to MCP servers from the browser
  - New `mcp-backend-server.js` backend server running on port 3002
  - REST API for connecting, disconnecting, listing tools, and executing tools
  - Full support for both HTTP (`StreamableHTTPClientTransport`) and SSE (`SSEClientTransport`) transports
  - Backend relay architecture documented in `BACKEND_ARCHITECTURE.md`
  
- **Persistent OAuth 2.1 Token Storage**: OAuth tokens and client information now persist across application restarts
  - Integrated `better-sqlite3` for secure, persistent storage
  - SQLite database (`.hoot-mcp.db`) stores OAuth tokens, client info, and verifiers
  - WAL (Write-Ahead Logging) mode enabled for better concurrency and data integrity
  - OAuth credentials preserved across disconnect/reconnect cycles
  - Automatic client ID reuse for each server

- **Smart Auto-Reconnect**: Intelligent auto-reconnect feature for saved servers
  - Automatically reconnects to servers with cached tools on app load
  - Skips OAuth redirects during auto-reconnect (silent background reconnection)
  - Uses stored OAuth tokens from backend's SQLite database

- **Development Tools**: New npm scripts for easier development
  - `npm run backend` - Run backend server standalone
  - `npm run dev:full` - Run both frontend and backend concurrently

### Changed
- **OAuth Flow Improvements**: Smoother OAuth authorization experience
  - Eliminated "Authorization Failed" flash message during OAuth redirects
  - OAuth callback now waits for async backend processing to complete
  - Clear progress messages throughout OAuth flow
  - Removed error notifications for expected OAuth redirects
  - Client-side navigation after OAuth completion (preserves React state)

- **MCP Client Architecture**: Refactored to use backend relay
  - `src/lib/mcpClient.ts` now relays requests to backend instead of direct MCP SDK usage
  - New `src/lib/backendClient.ts` for backend API communication
  - Frontend no longer makes direct connections to MCP servers (eliminates CORS)

- **Configuration**: Updated Vite config
  - Explicit frontend port configuration (5173)

### Fixed
- **CORS Errors**: Completely eliminated CORS errors by moving MCP client to Node.js backend
- **OAuth Token Persistence**: Tokens now persist properly across server restarts
- **OAuth Client ID Reuse**: Same client ID is used for each server across connections
- **Redirect Loop Protection**: Added safeguards against OAuth redirect loops
- **Connection State Management**: Fixed race conditions in OAuth connection flow
- **Error Handling**: Improved error detection and user feedback for connection failures

### Documentation
- Added `BACKEND_ARCHITECTURE.md` - Detailed architecture documentation
- Added `MIGRATION_GUIDE.md` - Guide for transitioning to new architecture
- Added `BACKEND_RELAY_COMPLETE.md` - Implementation summary
- Updated `README.md` with new quick start instructions and backend information
- Added `.hoot-mcp.db` to `.gitignore`

### Dependencies
- Added `better-sqlite3` for persistent OAuth storage
- Added `concurrently` for running frontend and backend together

## [0.2.0] - Previous Release

Initial release of Hoot MCP Testing Tool with browser-based MCP client.

---

## Version History

- **0.2.1** - Backend relay architecture with persistent OAuth storage
- **0.2.0** - Initial release

