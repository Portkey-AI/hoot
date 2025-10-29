import { useState } from 'react';

type AuthType = 'none' | 'headers' | 'oauth';
type AuthSubType = 'api_key' | 'bearer' | 'client_credentials' | 'custom';

interface AuthConfigFormProps {
    authType: AuthType;
    onAuthTypeChange: (type: AuthType) => void;
    
    // Header auth
    headers?: Array<{ key: string; value: string }>;
    onHeadersChange?: (headers: Array<{ key: string; value: string }>) => void;
    
    // OAuth
    useClientCredentials?: boolean;
    onClientCredentialsToggle?: (enabled: boolean) => void;
    clientId?: string;
    onClientIdChange?: (value: string) => void;
    clientSecret?: string;
    onClientSecretChange?: (value: string) => void;
    tokenUrl?: string;
    onTokenUrlChange?: (value: string) => void;
    
    // Advanced OAuth
    showAdvancedOAuth?: boolean;
    onAdvancedOAuthToggle?: (show: boolean) => void;
    additionalHeaders?: Array<{ key: string; value: string }>;
    onAdditionalHeadersChange?: (headers: Array<{ key: string; value: string }>) => void;
    customAuthEndpoint?: string;
    onCustomAuthEndpointChange?: (value: string) => void;
    customTokenEndpoint?: string;
    onCustomTokenEndpointChange?: (value: string) => void;
    customClientId?: string;
    onCustomClientIdChange?: (value: string) => void;
    
    // For simplified mode (AuthSelectionModal)
    simplified?: boolean;
    subType?: AuthSubType;
    onSubTypeChange?: (type: AuthSubType) => void;
}

export function AuthConfigForm({
    authType,
    onAuthTypeChange,
    headers = [{ key: '', value: '' }],
    onHeadersChange,
    useClientCredentials = false,
    onClientCredentialsToggle,
    clientId = '',
    onClientIdChange,
    clientSecret = '',
    onClientSecretChange,
    tokenUrl = '',
    onTokenUrlChange,
    showAdvancedOAuth = false,
    onAdvancedOAuthToggle,
    additionalHeaders = [{ key: '', value: '' }],
    onAdditionalHeadersChange,
    customAuthEndpoint = '',
    onCustomAuthEndpointChange,
    customTokenEndpoint = '',
    onCustomTokenEndpointChange,
    customClientId = '',
    onCustomClientIdChange,
    simplified = false,
    subType = 'api_key',
    onSubTypeChange,
}: AuthConfigFormProps) {
    
    // For simplified mode, we manage subtype internally
    const [internalSubType, setInternalSubType] = useState<AuthSubType>(subType || 'api_key');
    const currentSubType = simplified ? (subType || internalSubType) : 'custom';
    
    const handleSubTypeChange = (type: AuthSubType) => {
        setInternalSubType(type);
        if (onSubTypeChange) {
            onSubTypeChange(type);
        }
    };

    const addHeader = () => {
        if (onHeadersChange) {
            onHeadersChange([...headers, { key: '', value: '' }]);
        }
    };

    const removeHeader = (index: number) => {
        if (onHeadersChange && headers.length > 1) {
            onHeadersChange(headers.filter((_, i) => i !== index));
        }
    };

    const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
        if (onHeadersChange) {
            const updated = [...headers];
            updated[index][field] = value;
            onHeadersChange(updated);
        }
    };

    const addAdditionalHeader = () => {
        if (onAdditionalHeadersChange) {
            onAdditionalHeadersChange([...additionalHeaders, { key: '', value: '' }]);
        }
    };

    const removeAdditionalHeader = (index: number) => {
        if (onAdditionalHeadersChange && additionalHeaders.length > 1) {
            onAdditionalHeadersChange(additionalHeaders.filter((_, i) => i !== index));
        }
    };

    const updateAdditionalHeader = (index: number, field: 'key' | 'value', value: string) => {
        if (onAdditionalHeadersChange) {
            const updated = [...additionalHeaders];
            updated[index][field] = value;
            onAdditionalHeadersChange(updated);
        }
    };

    return (
        <div>
            {/* Auth Type Selection */}
            <div className="form-field" style={{ 
                marginTop: simplified ? 0 : '20px', 
                paddingTop: simplified ? 0 : '20px', 
                borderTop: simplified ? 'none' : '1px solid var(--border-color)' 
            }}>
                <label className="form-label">Authentication{simplified ? ' Method' : ''}</label>
                <div className="radio-group">
                    {!simplified && (
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="authType"
                                value="none"
                                checked={authType === 'none'}
                                onChange={(e) => onAuthTypeChange(e.target.value as AuthType)}
                            />
                            <span>None</span>
                        </label>
                    )}
                    {simplified ? (
                        <>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="authSubType"
                                    value="api_key"
                                    checked={currentSubType === 'api_key'}
                                    onChange={(e) => {
                                        handleSubTypeChange(e.target.value as AuthSubType);
                                        onAuthTypeChange('headers');
                                    }}
                                />
                                <span>API Key</span>
                            </label>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="authSubType"
                                    value="bearer"
                                    checked={currentSubType === 'bearer'}
                                    onChange={(e) => {
                                        handleSubTypeChange(e.target.value as AuthSubType);
                                        onAuthTypeChange('headers');
                                    }}
                                />
                                <span>Bearer Token</span>
                            </label>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="authSubType"
                                    value="client_credentials"
                                    checked={currentSubType === 'client_credentials'}
                                    onChange={(e) => {
                                        handleSubTypeChange(e.target.value as AuthSubType);
                                        onAuthTypeChange('oauth');
                                    }}
                                />
                                <span>Client Credentials</span>
                            </label>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="authSubType"
                                    value="custom"
                                    checked={currentSubType === 'custom'}
                                    onChange={(e) => {
                                        handleSubTypeChange(e.target.value as AuthSubType);
                                        onAuthTypeChange('headers');
                                    }}
                                />
                                <span>Custom Headers</span>
                            </label>
                        </>
                    ) : (
                        <>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="authType"
                                    value="headers"
                                    checked={authType === 'headers'}
                                    onChange={(e) => onAuthTypeChange(e.target.value as AuthType)}
                                />
                                <span>Headers</span>
                            </label>
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="authType"
                                    value="oauth"
                                    checked={authType === 'oauth'}
                                    onChange={(e) => onAuthTypeChange(e.target.value as AuthType)}
                                />
                                <span>OAuth</span>
                            </label>
                        </>
                    )}
                </div>
            </div>

            {/* Header-based Auth Fields */}
            {authType === 'headers' && (
                <div style={{ marginTop: '16px' }}>
                    {simplified && (currentSubType === 'api_key' || currentSubType === 'bearer') ? (
                        <>
                            {currentSubType === 'api_key' && (
                                <div className="form-field">
                                    <label className="form-label">Header Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={headers[0]?.key || ''}
                                        onChange={(e) => updateHeader(0, 'key', e.target.value)}
                                        placeholder="X-API-Key"
                                    />
                                </div>
                            )}
                            <div className="form-field">
                                <label className="form-label">{currentSubType === 'api_key' ? 'API Key' : 'Bearer Token'}</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={headers[0]?.value || ''}
                                    onChange={(e) => {
                                        if (currentSubType === 'bearer') {
                                            updateHeader(0, 'key', 'Authorization');
                                            updateHeader(0, 'value', `Bearer ${e.target.value}`);
                                        } else {
                                            updateHeader(0, 'value', e.target.value);
                                        }
                                    }}
                                    placeholder={currentSubType === 'api_key' ? 'your-api-key-here' : 'your-token-here'}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <label className="form-label">Headers</label>
                            {headers.map((header, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Header Name (e.g., X-API-Key)"
                                            value={header.key}
                                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Header Value"
                                            value={header.value}
                                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                        />
                                    </div>
                                    {headers.length > 1 && (
                                        <button
                                            onClick={() => removeHeader(index)}
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
                                onClick={addHeader}
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
                        </>
                    )}
                </div>
            )}

            {/* OAuth Fields */}
            {authType === 'oauth' && (
                <div style={{ marginTop: '16px' }}>
                    {!simplified && (
                        <>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px',
                                background: 'rgba(31, 36, 48, 0.6)',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: '1px solid rgba(92, 207, 230, 0.2)'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={useClientCredentials}
                                    onChange={(e) => onClientCredentialsToggle?.(e.target.checked)}
                                    style={{ accentColor: 'var(--blue-500)' }}
                                />
                                <label style={{ fontSize: '14px', color: 'var(--text-white)', cursor: 'pointer' }}>
                                    Use Client Credentials OAuth
                                </label>
                            </div>
                        </>
                    )}

                    {(simplified && currentSubType === 'client_credentials') || (!simplified && useClientCredentials) ? (
                        <>
                            <div className="form-field">
                                <label className="form-label">Client ID</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={clientId}
                                    onChange={(e) => onClientIdChange?.(e.target.value)}
                                    placeholder="your-client-id"
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Secret</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={clientSecret}
                                    onChange={(e) => onClientSecretChange?.(e.target.value)}
                                    placeholder="your-client-secret"
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Token URL (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={tokenUrl}
                                    onChange={(e) => onTokenUrlChange?.(e.target.value)}
                                    placeholder="https://api.example.com/oauth/token"
                                />
                            </div>
                        </>
                    ) : !simplified && (
                        <div className="info-message">
                            OAuth 2.1 with PKCE will be used. Authorization will happen in a popup window.
                        </div>
                    )}

                    {/* Advanced OAuth Settings (EditServerModal only) */}
                    {!simplified && useClientCredentials && (
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(92, 207, 230, 0.2)' }}>
                            <button
                                onClick={() => onAdvancedOAuthToggle?.(!showAdvancedOAuth)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--blue-500)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: 0
                                }}
                            >
                                <span style={{ transform: showAdvancedOAuth ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                    ▶
                                </span>
                                Advanced OAuth Settings
                            </button>

                            {showAdvancedOAuth && (
                                <div style={{ marginTop: '16px' }}>
                                    {/* Additional Headers */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label className="form-label">Additional Headers (sent with OAuth requests)</label>
                                        {additionalHeaders.map((header, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder="Header Name"
                                                        value={header.key}
                                                        onChange={(e) => updateAdditionalHeader(index, 'key', e.target.value)}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder="Header Value"
                                                        value={header.value}
                                                        onChange={(e) => updateAdditionalHeader(index, 'value', e.target.value)}
                                                    />
                                                </div>
                                                {additionalHeaders.length > 1 && (
                                                    <button
                                                        onClick={() => removeAdditionalHeader(index)}
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
                                            onClick={addAdditionalHeader}
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

                                    {/* Custom OAuth Metadata */}
                                    <div>
                                        <label className="form-label">Custom OAuth Endpoints (overrides auto-discovery)</label>
                                        <div className="form-field">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Authorization Endpoint (optional)"
                                                value={customAuthEndpoint}
                                                onChange={(e) => onCustomAuthEndpointChange?.(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Token Endpoint (optional)"
                                                value={customTokenEndpoint}
                                                onChange={(e) => onCustomTokenEndpointChange?.(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Custom Client ID (optional)"
                                                value={customClientId}
                                                onChange={(e) => onCustomClientIdChange?.(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

