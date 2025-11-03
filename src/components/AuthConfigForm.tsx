import { useState } from 'react';
import { Button, Input } from './ui';

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
                                <Input
                                    label="Header Name"
                                    value={headers[0]?.key || ''}
                                    onChange={(e) => updateHeader(0, 'key', e.target.value)}
                                    placeholder="X-API-Key"
                                />
                            )}
                            <Input
                                label={currentSubType === 'api_key' ? 'API Key' : 'Bearer Token'}
                                type="password"
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
                        </>
                    ) : (
                        <>
                            <label className="form-label">Headers</label>
                            {headers.map((header, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <Input
                                        placeholder="Header Name (e.g., X-API-Key)"
                                        value={header.key}
                                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                    />
                                    <Input
                                        type="password"
                                        placeholder="Header Value"
                                        value={header.value}
                                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                    />
                                    {headers.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeHeader(index)}
                                        >
                                            ✕
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addHeader}
                                style={{ width: '100%' }}
                            >
                                + Add Header
                            </Button>
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
                                <label style={{ fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                    Use Client Credentials OAuth
                                </label>
                            </div>
                        </>
                    )}

                    {(simplified && currentSubType === 'client_credentials') || (!simplified && useClientCredentials) ? (
                        <>
                            <Input
                                label="Client ID"
                                value={clientId}
                                onChange={(e) => onClientIdChange?.(e.target.value)}
                                placeholder="your-client-id"
                            />
                            <Input
                                label="Client Secret"
                                type="password"
                                value={clientSecret}
                                onChange={(e) => onClientSecretChange?.(e.target.value)}
                                placeholder="your-client-secret"
                            />
                            <Input
                                label="Token URL (optional)"
                                value={tokenUrl}
                                onChange={(e) => onTokenUrlChange?.(e.target.value)}
                                placeholder="https://api.example.com/oauth/token"
                            />
                        </>
                    ) : !simplified && (
                        <div className="info-message">
                            OAuth 2.1 with PKCE will be used. Authorization will happen in a popup window.
                        </div>
                    )}

                    {/* Advanced OAuth Settings (EditServerModal only) */}
                    {!simplified && useClientCredentials && (
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(92, 207, 230, 0.2)' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAdvancedOAuthToggle?.(!showAdvancedOAuth)}
                                style={{
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
                            </Button>

                            {showAdvancedOAuth && (
                                <div style={{ marginTop: '16px' }}>
                                    {/* Additional Headers */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label className="form-label">Additional Headers (sent with OAuth requests)</label>
                                        {additionalHeaders.map((header, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                <Input
                                                    placeholder="Header Name"
                                                    value={header.key}
                                                    onChange={(e) => updateAdditionalHeader(index, 'key', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Header Value"
                                                    value={header.value}
                                                    onChange={(e) => updateAdditionalHeader(index, 'value', e.target.value)}
                                                />
                                                {additionalHeaders.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeAdditionalHeader(index)}
                                                    >
                                                        ✕
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={addAdditionalHeader}
                                            style={{ width: '100%' }}
                                        >
                                            + Add Header
                                        </Button>
                                    </div>

                                    {/* Custom OAuth Metadata */}
                                    <div>
                                        <label className="form-label">Custom OAuth Endpoints (overrides auto-discovery)</label>
                                        <div className="form-field">
                                            <Input
                                                placeholder="Authorization Endpoint (optional)"
                                                value={customAuthEndpoint}
                                                onChange={(e) => onCustomAuthEndpointChange?.(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <Input
                                                placeholder="Token Endpoint (optional)"
                                                value={customTokenEndpoint}
                                                onChange={(e) => onCustomTokenEndpointChange?.(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <Input
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

