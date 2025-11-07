import { useState, useEffect } from 'react';
import { Settings, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { Button, Tabs, ToggleGroup, Switch } from './ui';
import { Modal } from './Modal';
import { useAppStore } from '../stores/appStore';
import { getPortkeyClient, getDisplayModelName } from '../lib/portkeyClient';
import './Modal.css';
import './LLMSettingsModal.css';

interface LLMSettingsModalProps {
    onClose: () => void;
}

// Cache models in memory for the entire session
let cachedModels: string[] | null = null;
const MODELS_STORAGE_KEY = 'hoot-available-models';
const SELECTED_MODEL_KEY = 'hoot-selected-model';
const MODELS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function LLMSettingsModal({ onClose }: LLMSettingsModalProps) {
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(
        () => localStorage.getItem(SELECTED_MODEL_KEY) || '@openai/gpt-4o-mini'
    );
    const [activeTab, setActiveTab] = useState('model');

    // Tool filter state
    const toolFilterEnabled = useAppStore((state) => state.toolFilterEnabled);
    const toolFilterConfig = useAppStore((state) => state.toolFilterConfig);
    const setToolFilterEnabled = useAppStore((state) => state.setToolFilterEnabled);
    const updateToolFilterConfig = useAppStore((state) => state.updateToolFilterConfig);

    const [localFilterEnabled, setLocalFilterEnabled] = useState(toolFilterEnabled);
    const [localTopK, setLocalTopK] = useState(toolFilterConfig.topK.toString());
    const [localMinScore, setLocalMinScore] = useState(toolFilterConfig.minScore.toFixed(2));

    // Sync local state with store when modal opens
    useEffect(() => {
        setLocalFilterEnabled(toolFilterEnabled);
        setLocalTopK(toolFilterConfig.topK.toString());
        setLocalMinScore(toolFilterConfig.minScore.toFixed(2)); // Keep 2 decimal places

        console.log('🔧 Modal sync:', {
            topK: toolFilterConfig.topK.toString(),
            minScore: toolFilterConfig.minScore.toFixed(2),
        });
    }, [toolFilterEnabled, toolFilterConfig]);

    // Function to fetch models (used by both initial load and refresh)
    const fetchModels = async (forceRefresh = false) => {
        let staleCache: string[] | null = null;

        try {
            // Check memory cache first (skip if force refresh)
            if (!forceRefresh && cachedModels) {
                console.log('✅ Using cached models from memory');
                setAvailableModels(cachedModels);
                return;
            }

            // Check localStorage cache (skip if force refresh)
            if (!forceRefresh) {
                const cached = localStorage.getItem(MODELS_STORAGE_KEY);
                if (cached) {
                    try {
                        const { models, timestamp } = JSON.parse(cached);
                        const age = Date.now() - timestamp;

                        if (age < MODELS_CACHE_DURATION) {
                            console.log(`✅ Using cached models from localStorage (${Math.floor(age / 1000 / 60)}min old)`);
                            cachedModels = models;
                            setAvailableModels(models);
                            return;
                        } else {
                            // Save stale cache as fallback
                            staleCache = models;
                            console.log('⏰ Cache expired, will try to refresh...');
                        }
                    } catch (e) {
                        console.warn('Failed to parse cached models:', e);
                    }
                }
            } else {
                // Get stale cache for fallback
                const cached = localStorage.getItem(MODELS_STORAGE_KEY);
                if (cached) {
                    try {
                        const { models } = JSON.parse(cached);
                        staleCache = models;
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            // Fetch fresh models
            console.log('🔄 Fetching models from Portkey...');
            const client = getPortkeyClient();
            const response = await client.listModels();

            // Extract model IDs from response
            const modelIds = response.data?.map((model: any) => model.id) || [];

            if (modelIds.length === 0) {
                throw new Error('No models returned from API');
            }

            // Cache in memory and localStorage
            cachedModels = modelIds;
            localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify({
                models: modelIds,
                timestamp: Date.now()
            }));

            setAvailableModels(modelIds);
            console.log(`✅ Loaded ${modelIds.length} models from Portkey`);
        } catch (error) {
            console.error('Failed to load models:', error);

            // Only use stale cache if it exists - don't use fallback for first load
            if (staleCache && staleCache.length > 0) {
                console.log('⚠️ Using stale cache due to API failure');
                cachedModels = staleCache;
                setAvailableModels(staleCache);
            } else {
                // For initial load with no cache, show error state
                console.error('❌ No cached models and API failed');
                setAvailableModels([]);
            }
        }
    };

    // Load available models on mount (with caching)
    useEffect(() => {
        const loadModels = async () => {
            setIsLoadingModels(true);
            await fetchModels(false);
            setIsLoadingModels(false);
        };

        loadModels();
    }, []);

    // Handle manual refresh
    const handleRefreshModels = async () => {
        setIsRefreshing(true);
        await fetchModels(true); // Force refresh
        setIsRefreshing(false);
    };

    // Handle model selection
    const handleSelectModel = (model: string) => {
        setSelectedModel(model);
        localStorage.setItem(SELECTED_MODEL_KEY, model);
        console.log(`✅ Selected model: ${model}`);

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('model-changed', { detail: { model } }));
    };

    const handleSave = () => {
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

    // Handle Enter key to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                // Don't trigger if user is in an input field (let them type normally)
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [localFilterEnabled, localTopK, localMinScore]); // Dependencies for handleSave

    return (
        <Modal onClose={onClose}>
            <div className="llm-settings-modal">
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
                        Configure Model and Tool Filtering
                    </p>
                </div>

                <div className="modal-body">
                    <Tabs
                        tabs={[
                            { value: 'model', label: 'Model', icon: <Sparkles size={16} /> },
                            { value: 'filtering', label: 'Tool Filtering', icon: <Filter size={16} /> },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                    >
                        {(tab) => {
                            if (tab === 'model') {
                                return (
                                    <div className="tab-content-wrapper">
                                        {/* LLM Model Section */}
                                        <div className="info-section" style={{ marginBottom: '0', marginTop: 0 }}>
                                            <div className="info-box">
                                                <div className="info-box-header">
                                                    <Sparkles size={14} style={{ marginRight: '6px' }} />
                                                    Current Model
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginTop: '12px',
                                                    padding: '12px',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div>
                                                        <div style={{
                                                            fontSize: '16px',
                                                            fontWeight: 600,
                                                            color: 'var(--text-primary)',
                                                            marginBottom: '4px'
                                                        }}>
                                                            {getDisplayModelName(selectedModel)}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            Authenticated via JWT • Portkey Gateway
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        padding: '4px 8px',
                                                        background: 'var(--theme-accent-primary)',
                                                        color: 'white',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: 600
                                                    }}>
                                                        ACTIVE
                                                    </div>
                                                </div>

                                                {isLoadingModels ? (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        fontSize: '13px',
                                                        color: 'var(--text-secondary)',
                                                        fontStyle: 'italic'
                                                    }}>
                                                        Loading available models...
                                                    </div>
                                                ) : availableModels.length > 0 ? (
                                                    <div style={{ marginTop: '12px' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '8px'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: 'var(--text-secondary)',
                                                                fontWeight: 500
                                                            }}>
                                                                Available models ({availableModels.length}):
                                                            </div>
                                                            <button
                                                                onClick={handleRefreshModels}
                                                                disabled={isRefreshing}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '4px 8px',
                                                                    background: 'var(--bg-tertiary)',
                                                                    border: '1px solid var(--border-color)',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    color: 'var(--text-secondary)',
                                                                    cursor: isRefreshing ? 'not-allowed' : 'pointer',
                                                                    opacity: isRefreshing ? 0.6 : 1
                                                                }}
                                                                title="Refresh models list"
                                                            >
                                                                <RefreshCw
                                                                    size={12}
                                                                    style={{
                                                                        animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                                                                    }}
                                                                />
                                                                Refresh
                                                            </button>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: '6px'
                                                        }}>
                                                            {availableModels.slice(0, 10).map((model) => (
                                                                <button
                                                                    key={model}
                                                                    onClick={() => handleSelectModel(model)}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        background: model === selectedModel
                                                                            ? 'var(--theme-accent-primary)'
                                                                            : 'var(--bg-tertiary)',
                                                                        color: model === selectedModel
                                                                            ? 'white'
                                                                            : 'var(--text-secondary)',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        fontFamily: 'monospace',
                                                                        border: model === selectedModel
                                                                            ? 'none'
                                                                            : '1px solid var(--border-color)',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (model !== selectedModel) {
                                                                            e.currentTarget.style.background = 'var(--bg-secondary)';
                                                                            e.currentTarget.style.borderColor = 'var(--theme-accent-primary)';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (model !== selectedModel) {
                                                                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                                                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                                                        }
                                                                    }}
                                                                >
                                                                    {getDisplayModelName(model)}
                                                                </button>
                                                            ))}
                                                            {availableModels.length > 10 && (
                                                                <span style={{
                                                                    padding: '4px 8px',
                                                                    color: 'var(--text-secondary)',
                                                                    fontSize: '11px',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    +{availableModels.length - 10} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (tab === 'filtering') {
                                return (
                                    <div className="tab-content-wrapper"
                                    >
                                        {/* Tool Filtering Section */}
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
                    <Button variant="primary" onClick={handleSave}>
                        Save Configuration
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
