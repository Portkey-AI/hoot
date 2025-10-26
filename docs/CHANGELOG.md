# Changelog

All notable changes to Hoot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2025-10-25

### Added
- **Tool State Management**: Persistent state management for tools across sessions
  - Automatic parameter persistence with debouncing for improved user experience
  - Execution history tracking (last execution time and execution count)
  - Visual indicators for tool execution status and saved parameters
  - localStorage-based storage for tool execution details
  - New `toolStateStore.ts` for managing tool state
  - Comprehensive documentation in `TOOL_STATE.md`
  - Tests for tool state functionality in `tests/test-tool-state.ts`

### Changed
- Enhanced UI to display tool execution status and saved parameters
- Improved parameter preservation between sessions

### Documentation
- Added `TOOL_STATE.md` - Comprehensive documentation for tool state management

## [0.4.0] - 2025-10-25

### Added
- **"Try in Hoot" Feature**: One-click server integration via shareable links
  - URL parsing for "Try in Hoot" links (hash-based and query-based formats)
  - New `TryInHootHandler.tsx` component for handling link-based server additions
  - Automatic OAuth discovery and token handling
  - Session token management in backend
  - Link generation and parsing utilities in `lib/tryInHootLinks.ts`
  - Comprehensive documentation:
    - `TRY_IN_HOOT.md` - Complete feature documentation
    - `TRY_IN_HOOT_QUICKSTART.md` - Quick start guide
    - `DESIGN_GUIDE.md` - Design guidelines
    - `SECURITY.md` - Security documentation
    - `SECURITY_ASSESSMENT.md` - Security assessment
  - Demo pages:
    - `try-in-hoot-demo.html` - Interactive demo
    - `try-in-hoot-generator.html` - Link generator tool
  - Tests for link generation and parsing

### Changed
- Enhanced Add Server modal to support automatic OAuth discovery
- Improved backend authentication flow
- Updated backend client for better session token management
- Updated package.json keywords to include "try-in-hoot"

### Documentation
- Updated README.md with "Try in Hoot" feature information

## [0.3.0] - 2025-10-24

### Added
- **UI Enhancements**: Modern, polished user interface
  - Footer component with branding and links
  - Improved styling across components
  - Better visual hierarchy and spacing
  - Enhanced empty state visuals

- **JSON Editing and Viewing**: New components for better data handling
  - New `JsonEditor.tsx` component with syntax highlighting
  - New `JsonViewer.tsx` component for formatted JSON display
  - Improved parameter input and output visualization

### Changed
- Removed deprecated proxy server (`proxy-server.js`)
  - Simplified architecture by removing proxy-based connection method
  - All connections now use the backend relay architecture
- Enhanced connection error handling
  - Clearer feedback during OAuth redirects
  - Better distinction between connection failures and OAuth flows
- Improved modal styling and user experience
- Updated database persistence to use home directory (`~/.hoot/hoot-mcp.db`)
  - Better cross-session persistence
  - Cleaner workspace directory

### Fixed
- Server removal on connection failure
  - Servers with incorrect configuration are now automatically removed
  - Keeps server list clean and only shows successfully connected servers
- Improved OAuth redirect handling in Add/Edit Server modals

### Documentation
- Updated `BACKEND_ARCHITECTURE.md` - Removed proxy references
- Updated `MIGRATION_GUIDE.md` - Simplified migration path
- Updated `QUICKSTART.md` - Streamlined quick start without proxy
- Updated `STORAGE.md` - Documented new storage location
- Added `PUBLISHING.md` - Publishing guidelines

### Removed
- `proxy-server.js` and all proxy-related code
- `src/lib/proxy.ts` - No longer needed with backend architecture
- Proxy-related npm scripts from package.json

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

---

## Version History

- **0.4.1** - Tool state management with persistent execution history
- **0.4.0** - "Try in Hoot" feature for one-click server integration
- **0.3.0** - UI enhancements, JSON components, and architectural cleanup
- **0.2.1** - Initial release with backend relay architecture and persistent OAuth storage

