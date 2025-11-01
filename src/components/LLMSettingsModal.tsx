import { useState } from 'react';
import { X, Key, Save } from 'lucide-react';
import './LLMSettingsModal.css';

interface LLMSettingsModalProps {
    onClose: () => void;
    onSave: (apiKey: string) => void;
    currentApiKey?: string;
}

export function LLMSettingsModal({ onClose, onSave, currentApiKey }: LLMSettingsModalProps) {
    const [apiKey, setApiKey] = useState(currentApiKey || '');
    const [showKey, setShowKey] = useState(false);

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
            <div className="modal-content llm-settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <Key size={20} />
                        <h2>LLM Configuration</h2>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="settings-section">
                        <h3>Portkey API Key</h3>
                        <p className="settings-description">
                            Enter your Portkey API key to enable real LLM conversations with OpenAI GPT-4o.
                        </p>

                        <div className="form-group">
                            <label htmlFor="portkey-api-key">API Key</label>
                            <div className="api-key-input-wrapper">
                                <input
                                    id="portkey-api-key"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="api-key-input"
                                    autoComplete="off"
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
                    <button className="button-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="button-primary" onClick={handleSave} disabled={!apiKey.trim()}>
                        <Save size={16} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}

