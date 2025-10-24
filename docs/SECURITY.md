# Security Guidelines for Hoot

## Overview

Hoot is a secure local development tool for testing MCP servers. This document outlines the security measures we've implemented to keep your testing environment safe.

## Built-in Security Features

Hoot includes several layers of security protection designed specifically for local development:

### 1. Localhost-Only Access 🏠

- Backend binds exclusively to `localhost:8008`
- Cannot be accessed from external networks
- Protected against remote attack vectors including CVE-2025-49596

### 2. Session Authentication 🔐

- Automatic session token authentication
- Transparent to users - no manual setup required
- Protects against unauthorized localhost access

### 3. CORS Protection 🛡️

- Strict origin validation
- Only accepts requests from Hoot's own frontend
- Prevents cross-site request attacks

### 4. Rate Limiting ⏱️

Sensible rate limits prevent accidental overload:
- 30 requests per minute per server
- Automatically resets every 60 seconds
- More than enough for normal testing workflows

### 5. Audit Logging 📝

All activity is logged to `~/.hoot/audit.log` for transparency:
- Server connections
- Tool executions
- Authentication events

View your audit log: `tail -f ~/.hoot/audit.log`

## Using Hoot Safely

### Quick Tips

Hoot is designed to be secure by default. Just follow these simple guidelines:

**✅ Good to know:**
- Hoot only binds to localhost - it can't be accessed externally
- All requests are authenticated automatically
- Activity is logged for transparency
- Rate limiting prevents accidental overload

**💡 Optional best practices:**
- Review audit logs if you're curious: `tail -f ~/.hoot/audit.log`
- Keep Hoot updated for the latest improvements

## For Developers: Monitoring

Want to see what Hoot is doing under the hood?

```bash
# View audit log
tail -f ~/.hoot/audit.log

# Check backend health
curl http://localhost:8008/health

# Review OAuth tokens
sqlite3 ~/.hoot/hoot-mcp.db "SELECT server_id FROM oauth_tokens;"
```

## Technical Details

### Architecture

Hoot uses a secure client-server architecture:
```
Browser (port 8009) → Backend (localhost:8008) → MCP Servers
```

- Frontend and backend communicate over authenticated localhost connection
- Backend acts as secure proxy to external MCP servers
- All requests require valid session token
- Activity logged for transparency

## Version History

### v0.3.0 (Current)
Enhanced security features for safe local development:
- Session token authentication
- Rate limiting (30 req/min)
- Audit logging to `~/.hoot/audit.log`
- CORS validation
- Comprehensive security documentation

## Questions?

Security questions or found an issue? 
- Open an issue: [github.com/portkey-ai/hoot/issues](https://github.com/portkey-ai/hoot/issues)
- Read the detailed assessment: [SECURITY_ASSESSMENT.md](./SECURITY_ASSESSMENT.md)

---

**Version**: 0.3.0 | **Updated**: October 24, 2025

