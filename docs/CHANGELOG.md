# Changelog

All notable changes to Hoot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2025-11-02

### Added
- Enhanced URL state management and navigation in App component
  - Improved routing and state preservation across navigation events

### Fixed
- Updated LLM Settings Modal to match product design specifications
  - Aligned modal styling and behavior with design system

## [0.6.0] - 2025-11-01

### Added
- **Theme System**: Modern theme architecture with multiple theme support
  - New theme system with localStorage persistence
  - Ayu Mirage theme integration
  - Smooth theme transitions without flash on load
  - Theme selector in UI
  
- **Advanced Authentication UI**: Enhanced authentication configuration interface
  - New `AuthConfigForm.tsx` component for streamlined auth setup
  - `ServerConfigForm.tsx` for comprehensive server configuration
  - Support for custom OAuth metadata and advanced settings
  - Improved auth selection and configuration flow
  
- **Automatic OAuth Discovery**: Smart OAuth endpoint detection
  - Direct HTTP POST probing for OAuth detection via WWW-Authenticate header
  - Automatic discovery of OAuth endpoints when adding servers
  - Better error handling and user feedback during OAuth flows
  - New OAuth metadata endpoint for connected servers
  
- **Enhanced Modal System**: Improved modal experiences across the application
  - Completely refactored `AddServerModal.tsx` with better UX
  - Significantly enhanced `EditServerModal.tsx` with OAuth support
  - Better error messages and user guidance
  - Support for re-authentication and clearing credentials
  
- **LLM Settings Integration**: New LLM configuration interface
  - New `LLMSettingsModal.tsx` component for LLM configuration
  - `portkeyClient.ts` for Portkey AI integration
  - `toolConverter.ts` for seamless tool conversion between formats
  
- **Hybrid Interface Component**: New flexible interface component
  - New `HybridInterface.tsx` for versatile UI interactions
  - Enhanced styling and layout improvements
  - Better visual hierarchy and component organization

### Changed
- **Application Architecture**: Major componentization and theming improvements
  - Refactored entire application for better maintainability
  - Enhanced `App.tsx` with improved layout and state management
  - Updated `App.css` with comprehensive theme system
  - Improved `ServerSidebar.tsx` with better organization
  
- **Backend Enhancements**: Improved backend server capabilities
  - Enhanced `mcp-backend-server.js` with additional OAuth handling
  - Better error handling and session management
  - Improved authentication flow and token management
  
- **Styling Overhaul**: Modernized UI with new design system
  - New comprehensive styling for `HybridInterface.css`
  - Enhanced `Modal.css` for better modal presentation
  - Updated `ServerSidebar.css` with cleaner design
  - New `LLMSettingsModal.css` for LLM settings interface
  
- **Example Updates**: Updated demo files
  - Improved `try-in-hoot-demo.html` with better examples
  - Enhanced `try-in-hoot-generator.html` with updated UI

### Removed
- **CollapsibleJson Component**: Removed unused component
  - Deleted `CollapsibleJson.tsx` and `CollapsibleJson.css`
  - Streamlined codebase by removing legacy components
  - Cleaned up related imports and references

### Fixed
- Better error messages throughout the application
- Improved OAuth credential management (clear auth now clears backend credentials)
- Enhanced modal update flow when editing servers
- Better handling of authentication failures and retries
- Theme flash prevention on initial load

### Documentation
- Updated examples with new configuration options
- Improved inline documentation for new components

## [0.5.0] - 2025-10-27

### Added
- **OAuth Auto-Detection**: Automatic OAuth detection from server configuration
  - New `AuthSelectionModal` component for choosing between OAuth and API key authentication
  - Automatic detection of OAuth endpoints from server config
  - Smart auth method selection based on server capabilities
  - Tests for OAuth and auto-detection in `tests/test-oauth-detection.js` and `tests/test-auto-detect.js`

- **Enhanced Modal System**: Comprehensive improvements to server management modals
  - Significantly enhanced `AddServerModal` with better OAuth support
  - Improved `EditServerModal` with re-authentication capabilities
  - Better error handling and user feedback throughout modal flows
  - Support for clearing and re-authenticating OAuth credentials

- **Backend Credential Management**: Server-side OAuth credential handling
  - Backend endpoints for clearing OAuth credentials
  - Re-authentication flow that properly clears old credentials
  - Better credential lifecycle management

- **Comprehensive Documentation**: New authentication and detection guides
  - `ADVANCED_AUTH_IMPLEMENTATION.md` - Advanced auth implementation guide
  - `AUTH_DETECTION.md` - Complete auth detection documentation
  - `AUTO_DETECTION.md` - Auto-detection features guide
  - `DETECTION_UI.md` - UI detection patterns documentation
  - `SERVER_NAME_DETECTION.md` - Server name detection guide

### Changed
- Enhanced `TryInHootHandler` with better OAuth support
- Updated Try In Hoot examples with new auth patterns
- Improved OAuth callback UI with better loading states
- Better error messages throughout the application
- Enhanced server sidebar with re-auth capabilities

### Fixed
- OAuth re-authentication now properly clears backend credentials
- Better handling of authentication failures
- Improved error feedback in modals

## [0.4.2] - 2025-10-26

### Added
- Favicon assets and improved branding
- Complete version history in CHANGELOG

### Changed
- Updated package metadata
- Enhanced configuration for environment variables and CORS
- Improved .gitignore with better exclusions

### Fixed
- Port handling improvements
- Reverted problematic Railway configuration changes

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

- **0.6.1** - URL state management enhancements and LLM Settings Modal design updates
- **0.6.0** - Theme system, advanced authentication UI, automatic OAuth discovery, and major componentization improvements
- **0.5.0** - OAuth auto-detection, auth selection modal, enhanced modal system, and backend credential management
- **0.4.2** - Favicon assets, package metadata updates, and configuration improvements
- **0.4.1** - Tool state management with persistent execution history
- **0.4.0** - "Try in Hoot" feature for one-click server integration
- **0.3.0** - UI enhancements, JSON components, and architectural cleanup
- **0.2.1** - Initial release with backend relay architecture and persistent OAuth storage

