import { useState } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface AuthSelectionModalProps {
    serverUrl: string;
    onSelectAuth: (authConfig: AuthConfig) => void;
    onCancel: () => void;
}

interface AuthConfig {
    type: 'headers' | 'client_credentials';
    headers?: Record<string, string>;
    client_id?: string;
    client_secret?: string;
    token_url?: string;
}

type AuthType = 'api_key' | 'bearer' | 'client_credentials' | 'custom';

export function AuthSelectionModal({ serverUrl, onSelectAuth, onCancel }: AuthSelectionModalProps) {
    const [selectedType, setSelectedType] = useState<AuthType>('api_key');

    // API Key / Bearer
    const [headerName, setHeaderName] = useState('X-API-Key');
    const [headerValue, setHeaderValue] = useState('');

    // Client Credentials
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [tokenUrl, setTokenUrl] = useState('');

    // Custom Headers
    const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([
        { key: '', value: '' }
    ]);

    const handleSubmit = () => {
        if (selectedType === 'api_key' || selectedType === 'bearer') {
            const key = selectedType === 'bearer' ? 'Authorization' : headerName;
            const value = selectedType === 'bearer' ? `Bearer ${headerValue}` : headerValue;

            if (!value.trim()) return;

            onSelectAuth({
                type: 'headers',
                headers: { [key]: value }
            });
        } else if (selectedType === 'client_credentials') {
            if (!clientId.trim() || !clientSecret.trim()) return;

            onSelectAuth({
                type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                ...(tokenUrl.trim() && { token_url: tokenUrl })
            });
        } else if (selectedType === 'custom') {
            const headers = customHeaders
                .filter(h => h.key.trim() && h.value.trim())
                .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

            if (Object.keys(headers).length === 0) return;

            onSelectAuth({
                type: 'headers',
                headers
            });
        }
    };

    const addCustomHeader = () => {
        setCustomHeaders([...customHeaders, { key: '', value: '' }]);
    };

    const removeCustomHeader = (index: number) => {
        setCustomHeaders(customHeaders.filter((_, i) => i !== index));
    };

    const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
        const updated = [...customHeaders];
        updated[index][field] = value;
        setCustomHeaders(updated);
    };

    return createPortal(
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="modal-header">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            fontSize: '28px',
                            filter: 'drop-shadow(0 2px 8px rgba(92, 207, 230, 0.3))'
                        }}>🦉</span>
                        <h2 style={{ margin: 0 }}>Authentication Required</h2>
                    </div>
                    <p style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 400,
                        marginTop: '4px',
                        marginBottom: '24px'
                    }}>
                        This server needs authentication. Choose a method:
                    </p>
                </div>

                <div className="modal-body">
                    {/* Server URL Display */}
                    <div style={{
                        background: 'rgba(31, 36, 48, 0.6)',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid rgba(92, 207, 230, 0.2)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        wordBreak: 'break-all',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {serverUrl}
                    </div>

                    {/* Auth Type Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--blue-500)',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                        }}>
                            Auth Method
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { value: 'api_key', label: '🔑 API Key', desc: 'Single header (e.g., X-API-Key)' },
                                { value: 'bearer', label: '🎫 Bearer Token', desc: 'Authorization: Bearer token' },
                                { value: 'client_credentials', label: '🔐 Client Credentials', desc: 'OAuth client ID & secret' },
                                { value: 'custom', label: '⚙️ Custom Headers', desc: 'Multiple custom headers' },
                            ].map(option => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        background: selectedType === option.value
                                            ? 'rgba(92, 207, 230, 0.1)'
                                            : 'rgba(31, 36, 48, 0.6)',
                                        border: `2px solid ${selectedType === option.value
                                            ? 'var(--blue-500)'
                                            : 'rgba(92, 207, 230, 0.2)'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="authType"
                                        value={option.value}
                                        checked={selectedType === option.value}
                                        onChange={(e) => setSelectedType(e.target.value as AuthType)}
                                        style={{ marginRight: '12px', accentColor: 'var(--blue-500)' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            color: 'var(--text-white)',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            marginBottom: '2px'
                                        }}>
                                            {option.label}
                                        </div>
                                        <div style={{
                                            color: 'var(--text-tertiary)',
                                            fontSize: '12px'
                                        }}>
                                            {option.desc}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Auth Configuration Forms */}
                    {selectedType === 'api_key' && (
                        <div>
                            <div className="form-field">
                                <label className="form-label">Header Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={headerName}
                                    onChange={(e) => setHeaderName(e.target.value)}
                                    placeholder="X-API-Key"
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">API Key</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={headerValue}
                                    onChange={(e) => setHeaderValue(e.target.value)}
                                    placeholder="your-api-key-here"
                                />
                            </div>
                        </div>
                    )}

                    {selectedType === 'bearer' && (
                        <div className="form-field">
                            <label className="form-label">Bearer Token</label>
                            <input
                                type="password"
                                className="form-input"
                                value={headerValue}
                                onChange={(e) => setHeaderValue(e.target.value)}
                                placeholder="your-token-here"
                            />
                        </div>
                    )}

                    {selectedType === 'client_credentials' && (
                        <div>
                            <div className="form-field">
                                <label className="form-label">Client ID</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="your-client-id"
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Secret</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    placeholder="your-client-secret"
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Token URL (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={tokenUrl}
                                    onChange={(e) => setTokenUrl(e.target.value)}
                                    placeholder="https://api.example.com/oauth/token"
                                />
                            </div>
                        </div>
                    )}

                    {selectedType === 'custom' && (
                        <div>
                            {customHeaders.map((header, index) => (
                                <div key={index} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label">Header Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={header.key}
                                                onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                                                placeholder="X-Custom-Header"
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label">Value</label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={header.value}
                                                onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                                                placeholder="header-value"
                                            />
                                        </div>
                                        {customHeaders.length > 1 && (
                                            <button
                                                onClick={() => removeCustomHeader(index)}
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
                                </div>
                            ))}
                            <button
                                onClick={addCustomHeader}
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(92, 207, 230, 0.1)',
                                    border: '1px solid rgba(92, 207, 230, 0.3)',
                                    borderRadius: '6px',
                                    color: 'var(--blue-500)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    width: '100%'
                                }}
                            >
                                + Add Header
                            </button>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                    >
                        Connect
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

