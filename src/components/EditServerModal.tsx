import { memo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import type { ServerConfig, TransportType, AuthType, AuthConfig } from '../types';
import './Modal.css';

interface EditServerModalProps {
    server: ServerConfig;
    onClose: () => void;
}

export const EditServerModal = memo(function EditServerModal({
    server,
    onClose,
}: EditServerModalProps) {
    const [name, setName] = useState(server.name);
    const [transport, setTransport] = useState<TransportType>(server.transport);
    const [command, setCommand] = useState(server.command || '');
    const [url, setUrl] = useState(server.url || '');
    const [error, setError] = useState('');

    // Authentication state
    const [authType, setAuthType] = useState<AuthType>(server.auth?.type || 'none');
    const [headerKey, setHeaderKey] = useState('');
    const [headerValue, setHeaderValue] = useState('');
    const [accessToken, setAccessToken] = useState('');

    const updateServer = useAppStore((state) => state.updateServer);
    const { connect, disconnect, isConnecting } = useMCPConnection();

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

        // Disconnect if currently connected
        if (server.connected) {
            await disconnect(server.id);
        }

        // Update server configuration
        updateServer(server.id, {
            name: name.trim(),
            transport,
            ...(transport === 'stdio' ? { command: command.trim(), url: undefined } : { url: url.trim(), command: undefined }),
            auth,
        });

        // Try to reconnect with new configuration
        const updatedServer = useAppStore.getState().servers.find(s => s.id === server.id);
        if (updatedServer) {
            // Store serverId in session storage for OAuth callback
            if (updatedServer.auth?.type === 'oauth') {
                sessionStorage.setItem('oauth_server_id', updatedServer.id);
            }

            const success = await connect(updatedServer);

            if (success) {
                onClose();
            } else {
                setError('Failed to connect with new configuration. Check settings and try again.');
            }
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Server</h2>
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
                                ✓ Full OAuth 2.1 flow with PKCE and automatic token refresh is supported!
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
                        {isConnecting ? 'Connecting...' : 'Save & Reconnect'}
                    </button>
                </div>
            </div>
        </div>
    );
});
