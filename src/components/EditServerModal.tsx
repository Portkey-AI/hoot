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

    // Multiple headers support
    const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
        server.auth?.type === 'headers' && server.auth.headers
            ? Object.entries(server.auth.headers).map(([key, value]) => ({ key, value }))
            : [{ key: '', value: '' }]
    );

    // Client credentials
    const [clientId, setClientId] = useState(server.auth?.type === 'oauth' && 'client_id' in server.auth ? server.auth.client_id as string : '');
    const [clientSecret, setClientSecret] = useState('');
    const [tokenUrl, setTokenUrl] = useState(server.auth?.type === 'oauth' && 'token_url' in server.auth ? server.auth.token_url as string : '');
    const [useClientCredentials, setUseClientCredentials] = useState(
        !!(server.auth?.type === 'oauth' && 'client_id' in server.auth && server.auth.client_id)
    );

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
        if (authType === 'headers') {
            const validHeaders = headers.filter(h => h.key.trim() && h.value.trim());
            if (validHeaders.length === 0) {
                setError('At least one header with key and value is required for header-based auth');
                return;
            }
        }

        if (authType === 'oauth' && useClientCredentials && (!clientId.trim() || !clientSecret.trim())) {
            setError('Client ID and Client Secret are required for client credentials auth');
            return;
        }

        // Build auth config
        let auth: AuthConfig | undefined = undefined;
        if (authType !== 'none') {
            auth = { type: authType };

            if (authType === 'headers') {
                // Build headers object from array
                auth.headers = headers
                    .filter(h => h.key.trim() && h.value.trim())
                    .reduce((acc, h) => ({ ...acc, [h.key.trim()]: h.value.trim() }), {});
            } else if (authType === 'oauth') {
                if (useClientCredentials && clientId && clientSecret) {
                    // Client credentials OAuth
                    (auth as any).client_id = clientId.trim();
                    (auth as any).client_secret = clientSecret.trim();
                    if (tokenUrl.trim()) {
                        (auth as any).token_url = tokenUrl.trim();
                    }
                } else if (accessToken.trim()) {
                    // Only set access token if provided (otherwise SDK will start OAuth flow)
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
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <span style={{
                            fontSize: '28px',
                            filter: 'drop-shadow(0 2px 8px rgba(92, 207, 230, 0.3))'
                        }}>🦉</span>
                        <h2 style={{ margin: 0 }}>Edit Server</h2>
                    </div>
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
                        <div style={{ marginTop: '16px' }}>
                            <label className="form-label">Headers</label>
                            {headers.map((header, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Header Name (e.g., X-API-Key)"
                                            value={header.key}
                                            onChange={(e) => {
                                                const newHeaders = [...headers];
                                                newHeaders[index].key = e.target.value;
                                                setHeaders(newHeaders);
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Header Value"
                                            value={header.value}
                                            onChange={(e) => {
                                                const newHeaders = [...headers];
                                                newHeaders[index].value = e.target.value;
                                                setHeaders(newHeaders);
                                            }}
                                        />
                                    </div>
                                    {headers.length > 1 && (
                                        <button
                                            onClick={() => setHeaders(headers.filter((_, i) => i !== index))}
                                            style={{
                                                padding: '10px 12px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '6px',
                                                color: 'var(--red-500)',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(92, 207, 230, 0.1)',
                                    border: '1px solid rgba(92, 207, 230, 0.3)',
                                    borderRadius: '6px',
                                    color: 'var(--blue-500)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    width: '100%',
                                    marginTop: '8px'
                                }}
                            >
                                + Add Header
                            </button>
                        </div>
                    )}

                    {/* OAuth Auth Fields */}
                    {authType === 'oauth' && (
                        <div style={{ marginTop: '16px' }}>
                            {/* Client Credentials Toggle */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    gap: '8px'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={useClientCredentials}
                                        onChange={(e) => setUseClientCredentials(e.target.checked)}
                                        style={{ accentColor: 'var(--blue-500)' }}
                                    />
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        Use Client Credentials OAuth
                                    </span>
                                </label>
                            </div>

                            {useClientCredentials ? (
                                <>
                                    <div className="form-field">
                                        <label className="form-label">Client ID</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="your-client-id"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Client Secret</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="your-client-secret"
                                            value={clientSecret}
                                            onChange={(e) => setClientSecret(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Token URL (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="https://api.example.com/oauth/token"
                                            value={tokenUrl}
                                            onChange={(e) => setTokenUrl(e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-field">
                                        <label className="form-label">Access Token (Optional)</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Leave empty to start OAuth flow automatically"
                                            value={accessToken}
                                            onChange={(e) => setAccessToken(e.target.value)}
                                        />
                                    </div>
                                    <div className="info-message" style={{ fontSize: '13px', opacity: 0.8 }}>
                                        Hoot supports OAuth 2.1 with PKCE and automatic token refresh. Leave empty to let Hoot handle the OAuth flow.
                                    </div>
                                </>
                            )}
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
