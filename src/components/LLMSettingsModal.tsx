import { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import { Button } from './ui';
import './Modal.css';
import './LLMSettingsModal.css';

interface LLMSettingsModalProps {
    onClose: () => void;
    onSave: (apiKey: string) => void;
    currentApiKey?: string;
}

export function LLMSettingsModal({ onClose, onSave, currentApiKey }: LLMSettingsModalProps) {
    const [apiKey, setApiKey] = useState(currentApiKey || '');
    const [showKey, setShowKey] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    const handleSave = () => {
        if (!apiKey.trim()) {
            alert('Please enter a valid Portkey API key');
            return;
        }
        onSave(apiKey.trim());
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal llm-settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                    }}>
                        <Key size={24} style={{ color: 'var(--theme-accent-primary)' }} />
                        <h2 style={{ margin: 0 }}>LLM Configuration</h2>
                    </div>
                    <p style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 400,
                        marginTop: '4px',
                        marginBottom: '24px'
                    }}>
                        Configure your Portkey API key to enable AI conversations
                    </p>
                </div>

                <div className="modal-body">
                    <div className="settings-section">
                        <div className="form-group">
                            <label className="form-label">API Key</label>
                            <div className="api-key-input-wrapper">
                                <input
                                    id="portkey-api-key"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="api-key-input"
                                    autoComplete="off"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="toggle-visibility"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div className="info-box">
                            <div className="info-box-header">ℹ️ About Portkey</div>
                            <p>
                                Portkey is an LLM gateway that provides observability, caching, and reliability
                                features for OpenAI and other LLM providers.
                            </p>
                            <p>
                                <a
                                    href="https://portkey.ai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="info-link"
                                >
                                    Get your API key at portkey.ai →
                                </a>
                            </p>
                        </div>

                        <div className="info-box security-note">
                            <div className="info-box-header">🔒 Security Note</div>
                            <p>
                                Your API key is stored locally in your browser only. It never leaves your machine
                                and is only used to make direct API calls to Portkey from your browser.
                            </p>
                            <p>
                                Hoot is a local development tool - your key is as safe as any other browser-stored
                                credential.
                            </p>
                        </div>

                        <div className="settings-info">
                            <div className="info-item">
                                <strong>Model:</strong> gpt-4o
                            </div>
                            <div className="info-item">
                                <strong>Provider:</strong> OpenAI via Portkey
                            </div>
                            <div className="info-item">
                                <strong>Storage:</strong> API key stored locally in browser
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={!apiKey.trim()}>
                        Save Configuration
                    </Button>
                </div>
            </div>
        </div>
    );
}
