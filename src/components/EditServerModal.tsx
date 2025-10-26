import { memo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import type { ServerConfig, TransportType, AuthType, AuthConfig } from '../types';
import * as backendClient from '../lib/backendClient';
import { toast } from '../stores/toastStore';
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

    // OAuth discovery state
    const [isDiscovering, setIsDiscovering] = useState(false);

    // Auto-detect OAuth based on URL using MCP SDK discovery
    const handleUrlBlur = async () => {
        // Only attempt discovery if URL looks valid
        if (!url.trim() || !url.startsWith('http')) {
            return;
        }

        // Only auto-detect if user hasn't manually selected a non-none auth type
        if (authType !== 'none') {
            return;
        }

        // Only discover for SSE and HTTP transports (not stdio)
        if (transport !== 'sse' && transport !== 'http') {
            return;
        }

        setIsDiscovering(true);
        try {
            const result = await backendClient.discoverOAuth(url, transport);

            if (result.requiresOAuth) {
                console.log('🔍 OAuth detected for URL:', url);
                setAuthType('oauth');
                // Show toast notification
                toast.info('OAuth Required', 'This server requires OAuth authentication');
            }
        } catch (error) {
            // Silently fail - don't bother the user with discovery errors
            console.error('OAuth discovery error:', error);
        } finally {
            setIsDiscovering(false);
        }
    };

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

            try {
                const success = await connect(updatedServer);

                if (success) {
                    onClose();
                } else {
                    // Connection returned false - could be OAuth redirect OR an error
                    // Check if the server has an error stored on it
                    const serverAfterConnect = useAppStore.getState().servers.find(s => s.id === server.id);

                    if (serverAfterConnect?.error) {
                        // Real connection error - show descriptive message
                        setError(serverAfterConnect.error);
                    } else {
                        // OAuth redirect is happening - don't show as error
                        console.log('🔐 OAuth redirect initiated');
                    }
                }
            } catch (error) {
                // Unexpected error during connection attempt - show descriptive message
                const errorMessage = error instanceof Error ? error.message : 'Failed to connect with new configuration. Check settings and try again.';
                setError(errorMessage);
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
                        <label className="form-label">
                            {transport === 'stdio' ? 'Command' : 'URL'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="form-input"
                                style={isDiscovering ? { paddingRight: '40px' } : {}}
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
                                onBlur={transport !== 'stdio' ? handleUrlBlur : undefined}
                                autoFocus
                            />
                            {isDiscovering && (
                                <div style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <div className="spinner-small" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Server Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="My MCP Server"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label">Transport</label>
                        <div className="radio-group">
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
                                    value="stdio"
                                    checked={transport === 'stdio'}
                                    onChange={(e) => setTransport(e.target.value as TransportType)}
                                    disabled
                                    title="stdio requires desktop app (coming soon)"
                                />
                                <span style={{ opacity: 0.5 }}>stdio (desktop only)</span>
                            </label>
                        </div>
                        {transport === 'stdio' && (
                            <div className="info-message" style={{ marginTop: '8px' }}>
                                stdio transport requires a desktop app. Use SSE or HTTP for browser testing.
                            </div>
                        )}
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
                        <div className="form-field">
                            <label className="form-label">Access Token (Optional)</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Leave empty to start OAuth flow automatically"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                            />
                            <div className="info-message" style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>
                                Hoot supports OAuth 2.1 with PKCE and automatic token refresh. Leave empty to let Hoot handle the OAuth flow.
                            </div>
                        </div>
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
