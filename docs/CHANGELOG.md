# Changelog

All notable changes to Hoot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.11.2] - 2025-11-09

### Fixed
- **Favicon Loading Performance**: Added frontend caching to eliminate redundant favicon requests
  - Implemented persistent favicon cache in app store to prevent repeated fetches
  - Fixed issue where favicons were reloaded every time switching between Test Tools and Chat tabs
  - Reduced network requests by caching favicon URLs in localStorage
  - Eliminated 70ms delay on tab switches caused by uncached POST requests

## [0.11.1] - 2025-11-09

### Changed
- **Configuration Format Migration**: Migrated from `wrangler.toml` to `wrangler.jsonc`
  - Updated to use JSON with Comments format (recommended by Cloudflare)
  - Migrated using official `wrangler-cfg` tool
  - Preserved all configuration settings and comments
  - Updated documentation to reference `wrangler.jsonc`

### Fixed
- **JWT Expiration Handling**: Improved JWT token expiration detection and error handling
  - Workers backend now properly detects expired tokens and returns specific `TokenExpired` error
  - Enhanced JWT verification to distinguish between expired vs invalid tokens
  - Consistent error handling across Node.js and Workers backends
  - Frontend auto-refresh logic now works more reliably with expired tokens

## [0.11.0] - 2025-11-07

### Added
- **Workers AI Support**: Semantic tool filtering powered by Cloudflare Workers AI
  - Integrated Workers AI for intelligent tool filtering when deployed on Cloudflare
  - Local development support with automatic fallback to non-semantic filtering
  - Enhanced tool filtering capabilities with natural language understanding
  - Improved tool selection accuracy for LLM interactions

### Fixed
- **OAuth Detection**: Improved OAuth endpoint detection reliability
  - Better handling of OAuth metadata responses
  - Enhanced error recovery during OAuth discovery
  - More robust authentication flow initialization

## [0.10.1] - 2025-11-05

### Added
- **Welcome Modal**: New user onboarding experience with welcome modal on first launch

### Changed
- **Package Security**: Excluded sensitive JWT key files (private-key.json, public-jwk.json, jwks.json) from npm package distribution

### Fixed
- Server URL now properly displays in browser URL bar when navigating between servers

## [0.10.0] - 2025-11-05

### Added
- **JWT-Based Authentication System**: Comprehensive JWT authentication with secure token management
  - New JWT authentication library (`server/lib/jwt.js`) with token generation and verification
  - RSA key pair generation and management for secure signing
  - JWKS endpoint for public key distribution
  - Token expiration (24 hours) and validation
  - Integration with backend authentication flows
  
- **Cloudflare Workers Deployment**: Full support for deploying to Cloudflare's edge network
  - New Cloudflare Workers server implementation (`server/server-worker.js`)
  - Durable Objects for stateful backend operations
    - `MCPConnectionPoolDO` for connection management on the edge
    - `UserDataDO` for user data persistence
    - `FaviconCacheDO` for favicon caching
  - Cloudflare Workers adapter (`server/adapters/connection-pool-workers.js`)
  - Database adapter for Cloudflare D1 (`server/adapters/database.js`)
  - SQLite adapter with Cloudflare-specific optimizations
  - Wrangler configuration (`wrangler.toml`) for deployment
  - Complete deployment documentation (`CLOUDFLARE_DEPLOYMENT.md`)
  - New npm scripts: `dev:worker` and `deploy:cloudflare`

- **Pinning Feature**: Pin important servers and tools for quick access
  - Pin/unpin servers in the sidebar for persistent top placement
  - Pin/unpin tools in chat interface for easy access
  - Visual pin indicators in UI
  - Pinned state persists across sessions
  - Tools show immediately when adding a new server

- **Enhanced Logging System**: Comprehensive backend logging for debugging and monitoring
  - New logging library (`server/lib/logger.js`) with configurable levels
  - Structured logging with timestamps and categories
  - File-based logging (`backend.log`) with automatic rotation
  - Console output for development
  - Detailed logging documentation (`LOGGING.md`)

- **Automatic Theme Switching**: Smart theme selection based on system preferences
  - Detects system light/dark mode preference on first load
  - Automatically selects Arctic Night (dark) or Nordic Snow (light)
  - Seamless transition between system preference and manual selection

### Changed
- **Backend Architecture**: Major refactor to support multiple deployment targets
  - Unified connection pool architecture (`server/lib/connection-pool.js`)
  - Adapter pattern for Node.js and Cloudflare Workers environments
  - Node.js connection pool adapter (`server/adapters/connection-pool-node.js`)
  - Shared handlers library (`server/lib/handlers.js`) for request processing
  - Client manager (`server/lib/client-manager.js`) for MCP client lifecycle
  - Environment-agnostic database and storage abstractions
  - Better separation of concerns and modularity

- **Server Organization**: Improved multi-server management
  - Pinned servers appear at the top of the sidebar
  - Better visual hierarchy for server list
  - Enhanced server metadata and state management

### Fixed
- Try in Hoot modal now respects current theme selection
- Server tools now appear immediately after adding a server (no refresh needed)

### Documentation
- Added `CLOUDFLARE_DEPLOYMENT.md` - Complete guide for deploying to Cloudflare Workers
- Added `JWT_AUTHENTICATION.md` - JWT authentication implementation details
- Added `LOGGING.md` - Backend logging system documentation
- Updated `BACKEND_ARCHITECTURE.md` - Documented new adapter pattern and multi-environment support
- Updated `README.md` - Added Cloudflare deployment information

## [0.9.0] - 2025-11-03

### Added
- **Three New Light Themes**: Nordic Snow, Ayu Light, and DuoTone Light for users who prefer light mode
- **Smart Default Theme Selection**: Automatically detects system preference (dark/light mode) and defaults to Arctic Night (dark) or Nordic Snow (light)
- **Visual Theme Indicators**: Theme switcher dropdown now visually distinguishes dark themes (darker background) from light themes (lighter background)
- **New CSS Variable**: `--theme-text-on-accent` for proper text contrast on colored buttons and accent backgrounds across all themes

### Changed
- **Theme Rename**: "Arctic Ice" renamed to "Arctic Night" for better clarity and pairing with "Nordic Snow"
- **Execute Button Styling**: Now uses primary accent color instead of green, making it consistent with other primary action buttons
- **Theme Switcher Icon**: Updated to match behavior and styling of other header icons (keyboard shortcuts, docs, etc.)
- **Emoji Updates**: Replaced square-rendering emojis with universally supported circular emojis (🌑 Arctic Night, 🌀 Ayu Mirage, ✨ DuoTone Light)
- **Form Spacing**: Added consistent 20px bottom margins to Input and ToggleGroup components for better visual separation

### Fixed
- **Light Theme Text Contrast**: Fixed all instances of `--text-white` being used incorrectly, which caused invisible text on light themes
  - Updated 15+ component CSS files to use appropriate semantic color variables
  - Buttons, modals, forms, and other UI elements now display correctly on light themes
- **Placeholder Text Colors**: Lightened placeholder colors in all three light themes for proper subtle appearance
  - Nordic Snow: `#9199a1` (light cool gray)
  - Ayu Light: `#b8bdc4` (light neutral gray)
  - DuoTone Light: `#afa79a` (light warm gray)

## [0.8.3] - 2025-11-03

### Fixed
- Fixed message roles in HybridInterface from 'assistant' to 'system' for system messages
- Added `dist/` directory to `.gitignore` to prevent build artifacts from being committed to version control

## [0.8.2] - 2025-11-03

### Fixed
- Fixed theme loading in production builds by bundling theme CSS files inline instead of loading from external paths

### Changed
- Theme CSS files are now bundled as inline strings in the JavaScript bundle for reliable loading across all environments
- Removed external theme file references from HTML, improving portability and reliability

## [0.8.1] - 2025-11-03

### Fixed
- Fixed npm/npx installation error by migrating `@portkey-ai/mcp-tool-filter` dependency from local file reference to published npm package (v1.0.0)
- Resolved `ERR_MODULE_NOT_FOUND` error that occurred when installing Hoot via `npx -y @portkey-ai/hoot`

## [0.8.0] - 2025-11-02

### Added
- **Markdown Rendering**: Full markdown support for LLM responses
  - Integrated `react-markdown` with `remark-gfm`, `rehype-highlight`, and `rehype-raw`
  - Real-time streaming markdown with proper formatting during response generation
  - Sanitization of incomplete markdown during streaming to prevent rendering issues
  - Code syntax highlighting in code blocks
  - Proper rendering of links, lists, headings, and other markdown elements
  
- **Enhanced Tool Call Cards**: Rich tool execution display
  - Server favicon display in tool call cards
  - Server name and execution time metadata
  - Accent-colored borders (30% opacity default, 100% on hover)
  - Clickable cards that open Live API viewer sidebar
  - Cached favicon fetching for optimal performance
  
- **Compact Filter Metrics Card**: Improved tool filtering visibility
  - Inline badge showing filtered tool count and execution time
  - Hover card with detailed tool breakdown by server
  - Server favicons and tool counts in hover details
  - Smooth animation and professional styling
  
- **Keyboard Shortcuts**: Comprehensive keyboard navigation
  - `/` - Focus message input (with visual hint)
  - `⌘K / Ctrl+K` - Clear chat history (with visual hint on button)
  - `Escape` - Blur from message input
  - All shortcuts documented in keyboard shortcuts modal
  - `getShortcutHint` integration for consistent tooltips
  
- **Tool Filter Debug Logging**: Console logs for debugging
  - Input context logged before filtering
  - Response from filtering library logged after
  - Helps debug filtering behavior and performance

### Changed
- **Claude-Style UI Overhaul**: Modern, clean interface design
  - Removed message avatars for cleaner look
  - User messages in rounded bubbles (aligned right, max-width 70%)
  - Assistant messages in full-width plain text
  - JetBrains Mono font for all assistant and tool messages
  - Tool calls as prominent cards (no expand/collapse)
  - Reduced message gap (1.5rem → 1rem)
  - Better visual hierarchy and information density
  
- **Improved Input Experience**:
  - Sticky input container that stays at bottom while scrolling
  - Perfect vertical alignment of textarea and send button
  - Visual keyboard shortcut hint (`/`) when input is empty
  - Fixed send button dimensions (42x42px) for consistency
  - Background and border restored for better visual separation
  
- **Scrollbar Positioning**: 
  - Moved scrollbar to chat-pane (parent) for rightmost positioning
  - Scrollbar no longer indented with centered chat content
  - Chat content remains centered with proper margins
  
- **Simplified Tool Call Flow**:
  - Removed redundant "I need to use some tools" message
  - Removed intermediate "Calling tool: tool_name" message
  - Only shows final tool result card with all metadata
  
- **Clear Chat Enhancement**:
  - Removed confirmation dialog for faster workflow
  - Added keyboard shortcut with visual hint
  - Instant clear action

### Fixed
- Markdown not showing during streaming response
- Assistant message icon disappearing after stream completes
- Layout shifting when filter metrics rendered
- Filter metrics showing after LLM response instead of before
- Duplicate filter metrics card display
- Scrollbar positioning with centered content
- Vertical alignment of message input and send button
- Keyboard hint overlapping with button text

## [0.7.2] - 2025-11-02

### Changed
- Improved asset references across the application for better performance

### Fixed
- Enhanced error handling in tool filter functionality
- Improved robustness of tool filtering operations

## [0.7.1] - 2025-11-02

### Added
- **New UI Components**: Enhanced component library with reusable elements
  - New `APIKeyInput` component for secure API key input with show/hide functionality
  - New `Tabs` component for tab-based navigation
  - Component stories for Storybook integration
  - Exported components in UI library index

### Changed
- **LLM Settings Modal**: Major refactoring with improved user experience
  - New tab-based structure for better organization
  - Enhanced filter settings interface
  - Improved layout and styling consistency
  - Better integration with new UI components
  
- **Styling Improvements**: Consistent theme variable usage
  - Updated `HybridInterface.css` for improved layout
  - Refactored `LLMSettingsModal.css` with cleaner structure
  - Enhanced `ServerSidebar.css` with optimized properties
  - Cleaned up unused CSS rules
  - Better consistency across components

### Fixed
- Layout consistency across different components
- CSS property optimization in ServerSidebar

## [0.7.0] - 2025-11-02

### Added
- **Intelligent Tool Filtering**: Context-aware tool selection for LLM interactions
  - Integrated `@portkey-ai/mcp-tool-filter` for intelligent tool filtering
  - New `toolFilter.ts` library for filtering tools based on user context
  - New `useToolFilter` hook for managing tool filter state
  - Filter metrics and performance tracking displayed in UI
  - Backend tool filtering support via `mcp-backend-tool-filter.js`
  - Filter controls in HybridInterface (Filter and Clear buttons)
  - Automatic tool filtering based on user query context
  
- **Chat Message Persistence**: Conversations now persist across sessions
  - Chat history automatically saved to localStorage
  - Restored conversations on app reload
  - Seamless continuation of previous sessions
  
- **Enhanced Chat Interface**: Improved messaging capabilities
  - System message support for better context
  - Filter metrics displayed inline with chat messages
  - Tool usage statistics (tools used vs. total available)
  - Detailed tool information in filter metrics

### Changed
- **HybridInterface Enhancements**: Major improvements to chat interface
  - Refactored message handling with persistent storage
  - Enhanced UI with filter controls
  - Improved message display with metrics
  - Better tool call visualization
  
- **LLM Settings Modal**: Extended functionality
  - Enhanced configuration options
  - Better integration with tool filtering
  - Improved user experience
  
- **Backend Architecture**: Enhanced backend capabilities
  - New tool filtering endpoint support
  - Better integration with MCP tool filter
  - Improved tool conversion utilities

### Fixed
- Tool context management in chat sessions
- Message persistence across page reloads
- Filter state synchronization

### Removed
- Deprecated `faviconUtils.ts` - Cleanup of unused utility

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

- **0.11.2** - Fixed favicon loading performance with frontend caching
- **0.11.1** - Configuration migration to wrangler.jsonc and improved JWT expiration handling
- **0.11.0** - Workers AI support for semantic tool filtering and improved OAuth detection
- **0.10.1** - Welcome modal, package security improvements, and server URL display fixes
- **0.10.0** - JWT authentication, Cloudflare Workers deployment, pinning feature, enhanced logging, and backend architecture refactor
- **0.9.0** - Three new light themes, smart theme selection, visual theme indicators, and comprehensive theme system improvements
- **0.8.3** - Fixed message roles and added dist/ to .gitignore
- **0.8.2** - Fixed theme loading in production builds with inline CSS bundling
- **0.8.1** - Fixed npm/npx installation error with mcp-tool-filter dependency
- **0.8.0** - Markdown rendering, Claude-style UI overhaul, enhanced tool call cards, keyboard shortcuts, and improved input experience
- **0.7.2** - Improved asset references and enhanced error handling in tool filter functionality
- **0.7.1** - New UI components (APIKeyInput, Tabs) and styling improvements across components
- **0.7.0** - Intelligent tool filtering, chat message persistence, and enhanced chat interface
- **0.6.1** - URL state management enhancements and LLM Settings Modal design updates
- **0.6.0** - Theme system, advanced authentication UI, automatic OAuth discovery, and major componentization improvements
- **0.5.0** - OAuth auto-detection, auth selection modal, enhanced modal system, and backend credential management
- **0.4.2** - Favicon assets, package metadata updates, and configuration improvements
- **0.4.1** - Tool state management with persistent execution history
- **0.4.0** - "Try in Hoot" feature for one-click server integration
- **0.3.0** - UI enhancements, JSON components, and architectural cleanup
- **0.2.1** - Initial release with backend relay architecture and persistent OAuth storage

