# Logging Configuration

## Backend

The backend now uses a simple logging system with debug mode support.

### Environment Variables

```bash
# Enable verbose debug logs
DEBUG=true npm run backend

# Default (info level only)
npm run backend
```

### Log Levels

- **debug**: Verbose OAuth operations, token management (only shown when DEBUG=true)
- **info**: Important operations, connections, errors
- **warn**: Warnings
- **error**: Errors

### What's Hidden by Default

When `DEBUG` is not set, these logs are hidden:
- OAuth token loading/saving details
- Code verifier operations
- Client info management
- Token expiry details
- Detailed verifier debugging

### What's Always Shown

- Server startup info
- Connection/disconnection events
- OAuth initiation (when user needs to authenticate)
- Errors and warnings
- Important state changes

## Frontend

Frontend logs are now controlled by Vite's dev mode:

### Development Mode
```bash
npm run dev
```
Shows:
- User ID generation
- Portkey client initialization
- Debug information

### Production Build
```bash
npm run build && npm run preview
```
Hides:
- User ID generation logs
- Portkey initialization logs
- Other development-only logs

## Usage Examples

### Normal Operation
```bash
npm run backend
# Minimal logs - just important events
```

### Debugging OAuth Issues
```bash
DEBUG=true npm run backend
# Verbose logs - see all OAuth operations
```

### Production
```bash
# No DEBUG flag - clean minimal logs
npm start
```

## Custom Logging

The backend uses a simple logger defined in `mcp-backend-server.js`:

```javascript
const log = {
    debug: (...args) => DEBUG && console.log('[DEBUG]', ...args),
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};
```

Replace `console.log` with:
- `log.debug()` - verbose debugging info
- `log.info()` - important information  
- `log.warn()` - warnings
- `log.error()` - errors

