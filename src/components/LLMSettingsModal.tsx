import { useState, useEffect } from 'react';
import { Key, Filter, Settings } from 'lucide-react';
import { Button, Tabs, ToggleGroup, Switch, APIKeyInput } from './ui';
import { useAppStore } from '../stores/appStore';
import './Modal.css';
import './LLMSettingsModal.css';

interface LLMSettingsModalProps {
    onClose: () => void;
    onSave: (apiKey: string) => void;
    currentApiKey?: string;
}

export function LLMSettingsModal({ onClose, onSave, currentApiKey }: LLMSettingsModalProps) {
    const [apiKey, setApiKey] = useState(currentApiKey || '');
    const [activeTab, setActiveTab] = useState('llm');

    // Tool filter state
    const toolFilterEnabled = useAppStore((state) => state.toolFilterEnabled);
    const toolFilterConfig = useAppStore((state) => state.toolFilterConfig);
    const setToolFilterEnabled = useAppStore((state) => state.setToolFilterEnabled);
    const updateToolFilterConfig = useAppStore((state) => state.updateToolFilterConfig);

    const [localFilterEnabled, setLocalFilterEnabled] = useState(toolFilterEnabled);
    const [localTopK, setLocalTopK] = useState(toolFilterConfig.topK.toString());
    const [localMinScore, setLocalMinScore] = useState(toolFilterConfig.minScore.toString());

    // Prevent body scroll when modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            // Restore original overflow or remove inline style if it was empty
            if (originalOverflow) {
                document.body.style.overflow = originalOverflow;
            } else {
                document.body.style.removeProperty('overflow');
            }
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
            topK: parseInt(localTopK),
            minScore: parseFloat(localMinScore),
        });

        onClose();
    };

    const topKOptions = [
        { value: '10', label: 'Aggressive' },
        { value: '20', label: 'Moderate' },
        { value: '30', label: 'Balanced' },
        { value: '50', label: 'Conservative' },
    ];

    const minScoreOptions = [
        { value: '0.20', label: 'Relaxed' },
        { value: '0.30', label: 'Standard' },
        { value: '0.40', label: 'Strict' },
        { value: '0.50', label: 'Very Strict' },
    ];

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
                        <Settings size={24} style={{ color: 'var(--theme-accent-primary)' }} />
                        <h2 style={{ margin: 0 }}>Settings</h2>
                    </div>
                    <p style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 400,
                        marginTop: '4px',
                        marginBottom: '24px'
                    }}>
                        Configure Portkey API Key and Semantic Filtering
                    </p>
                </div>

                <div className="modal-body">
                    <Tabs
                        tabs={[
                            { value: 'llm', label: 'LLM Settings', icon: <Key size={16} /> },
                            { value: 'filtering', label: 'Tool Filtering', icon: <Filter size={16} /> },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                    >
                        {(tab) => {
                            if (tab === 'llm') {
                                return (
                                    <div className="tab-content-wrapper">
                                        <div className="form-section">
                                            <APIKeyInput
                                                label="Portkey API Key"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="sk-..."
                                                helperText="Get your free API key at portkey.ai"
                                                autoFocus
                                                required
                                            />
                                        </div>

                                        <div className="info-section">
                                            <div className="info-box">
                                                <div className="info-box-header">ℹ️ What is Portkey?</div>
                                                <p>
                                                    Portkey is an LLM gateway providing observability, caching, and reliability. Hoot uses it to connect to GPT-4o for the AI chat interface.
                                                </p>
                                                <p style={{ marginTop: '8px', fontSize: '12px' }}>
                                                    <strong>Model:</strong> GPT-4o &nbsp;&nbsp;•&nbsp;&nbsp;
                                                    <strong>Storage:</strong> Browser localStorage &nbsp;&nbsp;•&nbsp;&nbsp;
                                                    <strong>Security:</strong> Never leaves your machine
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (tab === 'filtering') {
                                return (
                                    <div className="tab-content-wrapper">
                                        <div className="info-section" style={{ marginBottom: '0', marginTop: 0 }}>
                                            <div className="info-box">
                                                <div className="info-box-header">💡 How It Works</div>
                                                <p>
                                                    Semantic filtering ranks tools by relevance using sentence embeddings. Only top-ranked tools are sent to the LLM, reducing token usage while maintaining accuracy.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="form-section">
                                            <div className="form-group">
                                                <Switch
                                                    label="Enable Semantic Filtering"
                                                    checked={localFilterEnabled}
                                                    onChange={(e) => setLocalFilterEnabled(e.target.checked)}
                                                    helperText="Automatically select relevant tools based on conversation context"
                                                />
                                            </div>

                                            {localFilterEnabled && (
                                                <>
                                                    <div className="form-group">
                                                        <ToggleGroup
                                                            label="Filter Strength"
                                                            options={topKOptions}
                                                            value={localTopK}
                                                            onChange={setLocalTopK}
                                                            helperText="How many tools to include after filtering"
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <ToggleGroup
                                                            label="Match Sensitivity"
                                                            options={minScoreOptions}
                                                            value={localMinScore}
                                                            onChange={setLocalMinScore}
                                                            helperText="How closely tools must match your query"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {!localFilterEnabled && (
                                            <div className="info-section">
                                                <div className="info-box warning-box">
                                                    <div className="info-box-header">⚠️ Warning</div>
                                                    <p>
                                                        All tools will be sent to the LLM. May exceed OpenAI's 128 tool limit for large toolsets.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return null;
                        }}
                    </Tabs>
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
