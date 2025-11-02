import { useState, useEffect } from 'react';
import { Key, Filter } from 'lucide-react';
import { Button } from './ui';
import { useAppStore } from '../stores/appStore';
import { getFilterStats } from '../lib/toolFilter';
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

    // Tool filter state
    const toolFilterEnabled = useAppStore((state) => state.toolFilterEnabled);
    const toolFilterConfig = useAppStore((state) => state.toolFilterConfig);
    const toolFilterReady = useAppStore((state) => state.toolFilterReady);
    const setToolFilterEnabled = useAppStore((state) => state.setToolFilterEnabled);
    const updateToolFilterConfig = useAppStore((state) => state.updateToolFilterConfig);

    const [localFilterEnabled, setLocalFilterEnabled] = useState(toolFilterEnabled);
    const [localTopK, setLocalTopK] = useState(toolFilterConfig.topK);
    const [localMinScore, setLocalMinScore] = useState(toolFilterConfig.minScore);

    const filterStats = getFilterStats();

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

        // Save API key
        onSave(apiKey.trim());

        // Save tool filter settings
        setToolFilterEnabled(localFilterEnabled);
        updateToolFilterConfig({
            topK: localTopK,
            minScore: localMinScore,
        });

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

                    {/* Semantic Tool Filtering Section */}
                    <div className="settings-section" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Filter size={20} style={{ color: 'var(--theme-accent-primary)' }} />
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Semantic Tool Filtering</h3>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                            Intelligently filter tools based on conversation context, reducing LLM context size while maintaining relevance.
                        </p>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={localFilterEnabled}
                                    onChange={(e) => setLocalFilterEnabled(e.target.checked)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span>Enable intelligent tool filtering</span>
                            </label>
                        </div>

                        {localFilterEnabled && (
                            <>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Maximum Tools</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--theme-accent-primary)' }}>{localTopK}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="50"
                                        step="1"
                                        value={localTopK}
                                        onChange={(e) => setLocalTopK(parseInt(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        <span>10 (Aggressive)</span>
                                        <span>50 (Conservative)</span>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Minimum Score</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--theme-accent-primary)' }}>{localMinScore.toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.20"
                                        max="0.50"
                                        step="0.05"
                                        value={localMinScore}
                                        onChange={(e) => setLocalMinScore(parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        <span>0.20 (More tools)</span>
                                        <span>0.50 (Fewer tools)</span>
                                    </div>
                                </div>

                                <div className="info-box" style={{ marginTop: '16px' }}>
                                    <div className="info-box-header">ℹ️ Filter Status</div>
                                    {filterStats.initialized ? (
                                        <>
                                            <p>
                                                ✅ Filter initialized with <strong>{filterStats.stats?.toolCount || 0}</strong> tools
                                            </p>
                                            <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                                                Using local embeddings for ultra-fast filtering (&lt;5ms per request)
                                            </p>
                                        </>
                                    ) : (
                                        <p>
                                            {toolFilterReady ? '⚠️ Filter initializing...' : '⏳ Filter will initialize when servers connect'}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {!localFilterEnabled && (
                            <div className="info-box" style={{ background: 'var(--bg-secondary)' }}>
                                <p style={{ fontSize: '14px' }}>
                                    When disabled, all available tools will be sent to the LLM. This may exceed context limits for large tool sets.
                                </p>
                            </div>
                        )}
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
