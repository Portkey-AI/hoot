import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import type { TransportType, AuthType, AuthConfig } from '../types';
import './Modal.css';

interface AddServerModalProps {
  onClose: () => void;
}

export const AddServerModal = memo(function AddServerModal({
  onClose,
}: AddServerModalProps) {
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<TransportType>('sse'); // Default to SSE for browser
  const [command, setCommand] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  // Authentication state
  const [authType, setAuthType] = useState<AuthType>('none');
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const addServer = useAppStore((state) => state.addServer);
  const { connect, isConnecting } = useMCPConnection();

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError('Server name is required');
      return;
    }

    if (transport === 'stdio' && !command.trim()) {
      setError('Command is required for stdio transport');
      return;
    }

    if ((transport === 'sse' || transport === 'http') && !url.trim()) {
      setError('URL is required for SSE/HTTP transport');
      return;
    }

    // Validate auth config
    if (authType === 'headers' && (!headerKey.trim() || !headerValue.trim())) {
      setError('Both header key and value are required for header-based auth');
      return;
    }

    // OAuth validation: token is optional now (SDK will handle authorization flow)
    // No validation needed for OAuth

    // Build auth config
    let auth: AuthConfig | undefined = undefined;
    if (authType !== 'none') {
      auth = { type: authType };

      if (authType === 'headers') {
        auth.headers = {
          [headerKey.trim()]: headerValue.trim(),
        };
      } else if (authType === 'oauth') {
        // Only set access token if provided (otherwise SDK will start OAuth flow)
        if (accessToken.trim()) {
          auth.accessToken = accessToken.trim();
        }
      }
    }

    // Build server config
    const serverConfig = {
      name: name.trim(),
      transport,
      ...(transport === 'stdio' ? { command: command.trim() } : { url: url.trim() }),
      ...(auth && { auth }),
    };

    // Add server to store temporarily to get an ID and test connection
    addServer(serverConfig);

    // Get the newly added server
    const servers = useAppStore.getState().servers;
    const newServer = servers[servers.length - 1];

    // Try to connect immediately
    try {
      const success = await connect(newServer);

      if (success) {
        // Connection successful - close modal
        onClose();
      } else {
        // OAuth redirect is happening (success = false but no error thrown)
        // Keep the server in the list - don't close modal yet
        // The user will be redirected to OAuth and come back via callback
        console.log('🔐 OAuth redirect initiated - keeping server in list');
      }
    } catch (error) {
      // Real connection error - remove the server
      const removeServer = useAppStore.getState().removeServer;
      removeServer(newServer.id);
      setError('Failed to connect. Check configuration and try again.');
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add MCP Server</h2>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-field">
            <label className="form-label">Server Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="My MCP Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label">Transport</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="transport"
                  value="stdio"
                  checked={transport === 'stdio'}
                  onChange={(e) => setTransport(e.target.value as TransportType)}
                  disabled
                  title="stdio requires desktop app (coming soon)"
                />
                <span style={{ opacity: 0.5 }}>stdio (desktop only)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="transport"
                  value="sse"
                  checked={transport === 'sse'}
                  onChange={(e) => setTransport(e.target.value as TransportType)}
                />
                <span>SSE</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="transport"
                  value="http"
                  checked={transport === 'http'}
                  onChange={(e) => setTransport(e.target.value as TransportType)}
                />
                <span>HTTP</span>
              </label>
            </div>
            {transport === 'stdio' && (
              <div className="info-message" style={{ marginTop: '8px' }}>
                stdio transport requires a desktop app. Use SSE or HTTP for browser testing.
              </div>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">
              {transport === 'stdio' ? 'Command' : 'URL'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={
                transport === 'stdio'
                  ? 'node server.js'
                  : 'http://localhost:3000'
              }
              value={transport === 'stdio' ? command : url}
              onChange={(e) =>
                transport === 'stdio'
                  ? setCommand(e.target.value)
                  : setUrl(e.target.value)
              }
            />
          </div>

          {/* Authentication Section */}
          <div className="form-field" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <label className="form-label">Authentication</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="authType"
                  value="none"
                  checked={authType === 'none'}
                  onChange={(e) => setAuthType(e.target.value as AuthType)}
                />
                <span>None</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="authType"
                  value="headers"
                  checked={authType === 'headers'}
                  onChange={(e) => setAuthType(e.target.value as AuthType)}
                />
                <span>Headers</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="authType"
                  value="oauth"
                  checked={authType === 'oauth'}
                  onChange={(e) => setAuthType(e.target.value as AuthType)}
                />
                <span>OAuth</span>
              </label>
            </div>
          </div>

          {/* Header-based Auth Fields */}
          {authType === 'headers' && (
            <>
              <div className="form-field">
                <label className="form-label">Header Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Authorization"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Header Value</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Bearer your-api-key"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                />
              </div>
            </>
          )}

          {/* OAuth Auth Fields */}
          {authType === 'oauth' && (
            <>
              <div className="info-message" style={{ marginTop: '8px', marginBottom: '16px' }}>
                ✓ Full OAuth 2.1 flow with PKCE and automatic token refresh is now supported!
              </div>
              <div className="form-field">
                <label className="form-label">Access Token (Optional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Leave empty to start OAuth flow"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
              <div className="info-message" style={{ marginTop: '8px' }}>
                If you don't provide a token, Hoot will automatically discover OAuth endpoints and redirect you to authorize.
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isConnecting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

