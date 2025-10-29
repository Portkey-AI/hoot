import { useState, memo } from 'react';
import type { ServerConfig, TransportType, AuthType, AuthConfig } from '../types';
import * as backendClient from '../lib/backendClient';
import { toast } from '../stores/toastStore';
import './Modal.css';

interface ServerConfigFormProps {
    server: ServerConfig;
    mode: 'add' | 'edit';
    onSubmit: (config: Partial<ServerConfig>) => Promise<void>;
    isSubmitting: boolean;
    error?: string;
}

export const ServerConfigForm = memo(function ServerConfigForm({
    server,
    mode,
    onSubmit,
    isSubmitting,
    error: externalError,
}: ServerConfigFormProps) {
    const [name, setName] = useState(server.name);
    const [transport, setTransport] = useState<TransportType>(server.transport);
    const [command, setCommand] = useState(server.command || '');
    const [url, setUrl] = useState(server.url || '');
    const [error, setError] = useState('');

    // Authentication state
    const hasClientCreds = server.auth?.type === 'oauth' &&
        server.auth && 'client_id' in server.auth &&
        !!(server.auth as any).client_id;

    const [authType, setAuthType] = useState<AuthType>(
        hasClientCreds ? 'oauth_client_credentials' : (server.auth?.type || 'none')
    );

    // Multiple headers support
    const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
        server.auth?.type === 'headers' && server.auth.headers
            ? Object.entries(server.auth.headers).map(([key, value]) => ({ key, value }))
            : [{ key: '', value: '' }]
    );

    // Client credentials
    const [clientId, setClientId] = useState(
        (server.auth?.type === 'oauth' && server.auth && 'client_id' in server.auth)
            ? (server.auth.client_id as string || '')
            : ''
    );
    const [clientSecret, setClientSecret] = useState('');
    const [tokenUrl, setTokenUrl] = useState(
        (server.auth?.type === 'oauth' && server.auth && 'token_url' in server.auth)
            ? (server.auth.token_url as string || '')
            : ''
    );

    // Advanced OAuth settings
    const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
    const [additionalHeaders, setAdditionalHeaders] = useState<Array<{ key: string; value: string }>>(
        server.auth?.type === 'oauth' && server.auth?.additionalHeaders
            ? Object.entries(server.auth.additionalHeaders).map(([key, value]) => ({ key, value }))
            : [{ key: '', value: '' }]
    );
    const [customAuthEndpoint, setCustomAuthEndpoint] = useState(
        (server.auth?.type === 'oauth' && server.auth?.customOAuthMetadata?.authorization_endpoint) || ''
    );
    const [customTokenEndpoint, setCustomTokenEndpoint] = useState(
        (server.auth?.type === 'oauth' && server.auth?.customOAuthMetadata?.token_endpoint) || ''
    );
    const [customClientId, setCustomClientId] = useState(
        (server.auth?.type === 'oauth' && server.auth?.customOAuthMetadata?.client_id) || ''
    );

    // OAuth discovery state
    const [isDiscovering, setIsDiscovering] = useState(false);

    // Auto-detect OAuth based on URL using MCP SDK discovery
    const handleUrlBlur = async () => {
        if (!url.trim() || !url.startsWith('http')) {
            return;
        }

        if (authType !== 'none') {
            return;
        }

        if (transport !== 'sse' && transport !== 'http') {
            return;
        }

        setIsDiscovering(true);
        try {
            const result = await backendClient.discoverOAuth(url, transport);

            if (result.requiresOAuth) {
                console.log('🔍 OAuth detected for URL:', url);
                setAuthType('oauth');
                toast.info('OAuth Required', 'This server requires OAuth authentication');
            }
        } catch (error) {
            console.error('OAuth discovery error:', error);
        } finally {
            setIsDiscovering(false);
        }
    };

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

        if (authType === 'oauth_client_credentials' && (!clientId.trim() || !clientSecret.trim())) {
            setError('Client ID and Client Secret are required for OAuth Client Credentials');
            return;
        }

        // Build auth config
        let auth: AuthConfig | undefined = undefined;
        if (authType !== 'none') {
            auth = { type: authType === 'oauth_client_credentials' ? 'oauth' : authType };

            if (authType === 'headers') {
                auth.headers = headers
                    .filter(h => h.key.trim() && h.value.trim())
                    .reduce((acc, h) => ({ ...acc, [h.key.trim()]: h.value.trim() }), {});
            } else if (authType === 'oauth_client_credentials') {
                (auth as any).client_id = clientId.trim();
                (auth as any).client_secret = clientSecret.trim();
                if (tokenUrl.trim()) {
                    (auth as any).token_url = tokenUrl.trim();
                }
            } else if (authType === 'oauth') {
                // OAuth 2.1 with PKCE - no additional config needed
            }

            // Advanced: Additional headers with OAuth
            if (authType === 'oauth' || authType === 'oauth_client_credentials') {
                const validAdditionalHeaders = additionalHeaders.filter(h => h.key.trim() && h.value.trim());
                if (validAdditionalHeaders.length > 0) {
                    auth.additionalHeaders = validAdditionalHeaders.reduce(
                        (acc, h) => ({ ...acc, [h.key.trim()]: h.value.trim() }),
                        {}
                    );
                }

                // Advanced: Custom OAuth metadata
                if (customAuthEndpoint.trim() || customTokenEndpoint.trim() || customClientId.trim()) {
                    auth.customOAuthMetadata = {};
                    if (customAuthEndpoint.trim()) {
                        auth.customOAuthMetadata.authorization_endpoint = customAuthEndpoint.trim();
                    }
                    if (customTokenEndpoint.trim()) {
                        auth.customOAuthMetadata.token_endpoint = customTokenEndpoint.trim();
                    }
                    if (customClientId.trim()) {
                        auth.customOAuthMetadata.client_id = customClientId.trim();
                    }
                }
            }
        }

        const config: Partial<ServerConfig> = {
            name: name.trim(),
            transport,
            ...(transport === 'stdio' ? { command: command.trim(), url: undefined } : { url: url.trim(), command: undefined }),
            auth,
        };

        await onSubmit(config);
    };

    return (
        <>
            {(error || externalError) && <div className="error-message">{error || externalError}</div>}

            {/* 1. URL or Command based on transport */}
            <div className="form-field">
                <label className="form-label">
                    {transport === 'stdio' ? 'Command' : 'URL'}
                </label>
                {transport === 'stdio' ? (
                    <input
                        type="text"
                        className="form-input"
                        placeholder="node server.js"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                    />
                ) : (
                    <>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="https://example.com/mcp"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onBlur={handleUrlBlur}
                        />
                        {isDiscovering && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                🔍 Checking for OAuth...
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 2. Separator */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }} />

            {/* 3. Server Name */}
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

            {/* 4. Transport Section */}
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
                        <span style={{ opacity: 0.5 }}>stdio (coming soon)</span>
                    </label>
                </div>
            </div>

            {/* 5. Authentication Section */}
            <div className="form-field">
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
                        <span>OAuth 2.1 (PKCE)</span>
                    </label>
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="authType"
                            value="oauth_client_credentials"
                            checked={authType === 'oauth_client_credentials'}
                            onChange={(e) => setAuthType(e.target.value as AuthType)}
                        />
                        <span>OAuth Client Credentials</span>
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
                            padding: '10px 16px',
                            background: 'rgba(92, 207, 230, 0.1)',
                            border: '1px solid rgba(92, 207, 230, 0.3)',
                            borderRadius: '6px',
                            color: 'var(--blue-500)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            marginTop: '8px'
                        }}
                    >
                        + Add Header
                    </button>
                </div>
            )}

            {/* OAuth 2.1 with PKCE */}
            {authType === 'oauth' && (
                <div style={{ marginTop: '16px' }}>
                    <div className="info-message" style={{ fontSize: '13px', opacity: 0.8 }}>
                        Hoot will automatically handle the OAuth flow with PKCE when you connect.
                    </div>

                    {/* Advanced OAuth Settings */}
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(92, 207, 230, 0.2)' }}>
                        <button
                            type="button"
                            onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--blue-500)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: showAdvancedOAuth ? '16px' : 0
                            }}
                        >
                            <span style={{ transform: showAdvancedOAuth ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                            Advanced OAuth Settings
                        </button>

                        {showAdvancedOAuth && (
                            <div style={{ marginTop: '16px' }}>
                                {/* Additional Headers */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label className="form-label" style={{ marginBottom: '8px' }}>
                                        Additional Headers
                                        <span style={{
                                            marginLeft: '8px',
                                            fontSize: '11px',
                                            fontWeight: 400,
                                            color: 'var(--text-tertiary)',
                                            textTransform: 'none',
                                            letterSpacing: 0
                                        }}>
                                            (sent with OAuth requests)
                                        </span>
                                    </label>
                                    {additionalHeaders.map((header, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Header Name (e.g., X-API-Version)"
                                                    value={header.key}
                                                    onChange={(e) => {
                                                        const newHeaders = [...additionalHeaders];
                                                        newHeaders[index].key = e.target.value;
                                                        setAdditionalHeaders(newHeaders);
                                                    }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Header Value"
                                                    value={header.value}
                                                    onChange={(e) => {
                                                        const newHeaders = [...additionalHeaders];
                                                        newHeaders[index].value = e.target.value;
                                                        setAdditionalHeaders(newHeaders);
                                                    }}
                                                />
                                            </div>
                                            {additionalHeaders.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAdditionalHeaders(additionalHeaders.filter((_, i) => i !== index))}
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
                                        type="button"
                                        onClick={() => setAdditionalHeaders([...additionalHeaders, { key: '', value: '' }])}
                                        style={{
                                            padding: '10px 16px',
                                            background: 'rgba(92, 207, 230, 0.1)',
                                            border: '1px solid rgba(92, 207, 230, 0.3)',
                                            borderRadius: '6px',
                                            color: 'var(--blue-500)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            marginTop: '8px'
                                        }}
                                    >
                                        + Add Header
                                    </button>
                                </div>

                                {/* Custom OAuth Metadata */}
                                <div>
                                    <label className="form-label" style={{ marginBottom: '12px' }}>
                                        Custom OAuth Endpoints
                                        <span style={{
                                            marginLeft: '8px',
                                            fontSize: '11px',
                                            fontWeight: 400,
                                            color: 'var(--text-tertiary)',
                                            textTransform: 'none',
                                            letterSpacing: 0
                                        }}>
                                            (overrides auto-discovery)
                                        </span>
                                    </label>
                                    <div className="form-field">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Authorization Endpoint (optional)"
                                            value={customAuthEndpoint}
                                            onChange={(e) => setCustomAuthEndpoint(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Token Endpoint (optional)"
                                            value={customTokenEndpoint}
                                            onChange={(e) => setCustomTokenEndpoint(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Custom Client ID (optional)"
                                            value={customClientId}
                                            onChange={(e) => setCustomClientId(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* OAuth Client Credentials Fields */}
            {authType === 'oauth_client_credentials' && (
                <div style={{ marginTop: '16px' }}>
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
                </div>
            )}

            {/* Submit Button */}
            <div style={{ marginTop: '32px', paddingBottom: '8px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Connecting...' : (mode === 'add' ? 'Add Server' : 'Save & Reconnect')}
                </button>
            </div>
        </>
    );
});

