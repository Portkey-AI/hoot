import { memo, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useToolStateStore } from '../stores/toolStateStore';
import { useMCPExecution } from '../hooks/useMCP';
import { useInputMode } from '../hooks/useInputMode';
import { useKeyboardShortcuts, getShortcutHint } from '../hooks/useKeyboardShortcuts';
import { EmptyState as EmptyStateComponent } from './EmptyState';
import { CopyButton } from './CopyButton';
import { JsonViewer } from './JsonViewer';
import { JsonEditor } from './JsonEditor';
import { Input, Textarea, Checkbox, ToggleGroup } from './ui';
import { Wrench } from 'lucide-react';
import type { ExecutionResult, ToolSchema } from '../types';
import './MainArea.css';

// Store execution states per tool to persist across tool switches
const toolExecutionStates = new Map<string, {
    result: ExecutionResult | null;
    resultTab: 'response' | 'raw' | 'request';
    elapsedTime: number;
    isExecuting: boolean;
    abortController: AbortController | null;
}>();

export const MainArea = memo(function MainArea() {
    const selectedServerId = useAppStore((state) => state.selectedServerId);
    const selectedToolName = useAppStore((state) => state.selectedToolName);
    const allTools = useAppStore((state) => state.tools);

    const tools = useMemo(() => {
        if (!selectedServerId) return [];
        return allTools[selectedServerId] || [];
    }, [selectedServerId, allTools]);

    const selectedTool = tools.find((t) => t.name === selectedToolName);

    if (!selectedTool) {
        return <EmptyState />;
    }

    return <ToolExecutionView tool={selectedTool} serverId={selectedServerId!} />;
});

function EmptyState() {
    return (
        <div className="main-area">
            <EmptyStateComponent
                icon={<Wrench size={48} />}
                title="No tool selected"
                description="Select a tool from the sidebar to test its functionality and view results."
            />
        </div>
    );
}

interface ToolExecutionViewProps {
    tool: ToolSchema;
    serverId: string;
}

function ToolExecutionView({ tool, serverId }: ToolExecutionViewProps) {
    const { inputMode, setInputMode } = useInputMode();
    const setToolExecuting = useAppStore((state) => state.setToolExecuting);

    // Get a unique key for this tool
    const toolKey = `${serverId}:${tool.name}`;

    // Get or initialize execution state for this tool
    if (!toolExecutionStates.has(toolKey)) {
        toolExecutionStates.set(toolKey, {
            result: null,
            resultTab: 'response',
            elapsedTime: 0,
            isExecuting: false,
            abortController: null,
        });
    }

    // Force re-render when we need to update from the Map
    const [, forceUpdate] = useState({});

    // Always read from the Map - single source of truth
    const executionState = toolExecutionStates.get(toolKey)!;

    // Helper to update state in Map and force re-render
    const updateExecutionState = useCallback((updates: Partial<typeof executionState>) => {
        const newState = { ...toolExecutionStates.get(toolKey)!, ...updates };
        toolExecutionStates.set(toolKey, newState);
        forceUpdate({});
    }, [toolKey]);

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isDescriptionLong, setIsDescriptionLong] = useState(true); // Start as true to apply clamp
    const descriptionRef = useRef<HTMLParagraphElement>(null);
    const { execute } = useMCPExecution();

    // Tool state store for persisting parameters and execution state
    const getToolParameters = useToolStateStore((state) => state.getToolParameters);
    const saveToolParameters = useToolStateStore((state) => state.saveToolParameters);
    const recordToolExecution = useToolStateStore((state) => state.recordToolExecution);

    // Check if description actually overflows (not just character count)
    useEffect(() => {
        if (descriptionRef.current && tool.description) {
            // Force a reflow to ensure styles are applied, then check if clamped
            requestAnimationFrame(() => {
                if (descriptionRef.current) {
                    const isOverflowing = descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight;
                    setIsDescriptionLong(isOverflowing);
                }
            });
        } else {
            setIsDescriptionLong(false);
        }
    }, [tool.description]);

    // Generate default values from schema
    const defaultValues = useMemo(() => {
        const properties = tool.inputSchema.properties || {};
        const defaults: Record<string, unknown> = {};

        Object.entries(properties).forEach(([key, prop]: [string, any]) => {
            if (prop.default !== undefined) {
                defaults[key] = prop.default;
            } else if (prop.type === 'string') {
                defaults[key] = '';
            } else if (prop.type === 'number' || prop.type === 'integer') {
                defaults[key] = undefined; // Don't pre-fill numbers
            } else if (prop.type === 'boolean') {
                defaults[key] = false;
            } else if (prop.type === 'array') {
                defaults[key] = [];
            } else if (prop.type === 'object') {
                defaults[key] = {};
            }
        });

        return defaults;
    }, [tool.inputSchema]);

    // Load saved parameters or use defaults
    const initialValues = useMemo(() => {
        const saved = getToolParameters(serverId, tool.name);
        if (saved) {
            // Merge saved values with defaults to handle schema changes
            return { ...defaultValues, ...saved };
        }
        return defaultValues;
    }, [serverId, tool.name, defaultValues, getToolParameters]);

    // Single source of truth for input values
    const [inputValues, setInputValues] = useState<Record<string, unknown>>(initialValues);

    // Keep JSON editor content in sync with inputValues
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState('');

    // Load parameters when tool changes
    useEffect(() => {
        // Load saved parameters
        const saved = getToolParameters(serverId, tool.name);
        const values = saved ? { ...defaultValues, ...saved } : defaultValues;
        setInputValues(values);
        setJsonInput('');
        setJsonError('');
        setIsDescriptionExpanded(false);

        // Force re-render to ensure we show correct execution state
        forceUpdate({});
    }, [tool.name, serverId, toolKey, defaultValues, getToolParameters, forceUpdate]);

    // Save parameters whenever they change (debounced effect)
    useEffect(() => {
        // Don't save empty default values
        const hasNonDefaultValues = Object.entries(inputValues).some(([, value]) => {
            if (value === undefined || value === null || value === '') return false;
            if (typeof value === 'boolean' && value === false) return false;
            if (Array.isArray(value) && value.length === 0) return false;
            if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
            return true;
        });

        if (hasNonDefaultValues) {
            const timer = setTimeout(() => {
                saveToolParameters(serverId, tool.name, inputValues);
            }, 500); // Debounce 500ms

            return () => clearTimeout(timer);
        }
    }, [inputValues, serverId, tool.name, saveToolParameters]);

    // Update JSON when inputValues change or when switching to JSON mode
    useEffect(() => {
        if (inputMode === 'json') {
            setJsonInput(JSON.stringify(inputValues, null, 2));
        }
    }, [inputMode, inputValues]);

    // Handle JSON input changes
    const handleJsonChange = (value: string) => {
        setJsonInput(value);
        setJsonError('');

        // Try to parse and update inputValues
        try {
            const parsed = JSON.parse(value);
            setInputValues(parsed);
        } catch (error) {
            // Keep the invalid JSON in the editor, show error on execute
            setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
        }
    };

    const handleExecute = useCallback(async () => {
        try {
            // If in JSON mode and there's a parse error, show it
            if (inputMode === 'json' && jsonError) {
                updateExecutionState({
                    result: {
                        success: false,
                        time: 0,
                        error: `Invalid JSON: ${jsonError}`,
                        timestamp: new Date(),
                    },
                    isExecuting: false,
                });
                return;
            }

            // Clean up input values - remove undefined values
            const cleanedInputs = Object.fromEntries(
                Object.entries(inputValues).filter(([_, value]) => value !== undefined)
            );

            // Create abort controller for cancellation
            const abortController = new AbortController();

            // Capture the current tool key for this execution
            const executingToolKey = toolKey;
            const executingServerId = serverId;
            const executingToolName = tool.name;

            // Start execution - update Map directly
            toolExecutionStates.set(executingToolKey, {
                ...toolExecutionStates.get(executingToolKey)!,
                elapsedTime: 0,
                isExecuting: true,
                abortController,
                result: null,
            });
            forceUpdate({});

            // Mark tool as executing in global state
            setToolExecuting(executingServerId, executingToolName, true);

            const startTime = Date.now();
            const timerInterval = setInterval(() => {
                const currentState = toolExecutionStates.get(executingToolKey);
                if (currentState && currentState.isExecuting) {
                    toolExecutionStates.set(executingToolKey, {
                        ...currentState,
                        elapsedTime: Date.now() - startTime,
                    });
                    // Only force update if we're still viewing this tool
                    if (toolKey === executingToolKey) {
                        forceUpdate({});
                    }
                }
            }, 10); // Update every 10ms for smooth animation

            try {
                const executionResult = await execute(executingServerId, executingToolName, cleanedInputs);

                // Update the state in the Map for this specific tool
                if (!abortController.signal.aborted) {
                    toolExecutionStates.set(executingToolKey, {
                        ...toolExecutionStates.get(executingToolKey)!,
                        result: executionResult,
                        isExecuting: false,
                        abortController: null,
                    });

                    // Only force update if we're still viewing this tool
                    if (toolKey === executingToolKey) {
                        forceUpdate({});
                    }

                    // Record successful execution
                    if (executionResult.success) {
                        recordToolExecution(executingServerId, executingToolName);
                    }
                }
            } catch (execError) {
                // Handle execution errors
                const errorResult = {
                    success: false,
                    time: Date.now() - startTime,
                    error: execError instanceof Error ? execError.message : 'Execution failed',
                    timestamp: new Date(),
                };

                toolExecutionStates.set(executingToolKey, {
                    ...toolExecutionStates.get(executingToolKey)!,
                    result: errorResult,
                    isExecuting: false,
                    abortController: null,
                });

                // Only force update if we're still viewing this tool
                if (toolKey === executingToolKey) {
                    forceUpdate({});
                }
            } finally {
                clearInterval(timerInterval);
                // Always clean up the executing state
                setToolExecuting(executingServerId, executingToolName, false);
            }
        } catch (error) {
            console.error('Execution error:', error);
            updateExecutionState({
                result: {
                    success: false,
                    time: 0,
                    error: error instanceof Error ? error.message : 'Execution failed',
                    timestamp: new Date(),
                },
                isExecuting: false,
                abortController: null,
            });
            setToolExecuting(serverId, tool.name, false);
        }
    }, [inputMode, jsonError, inputValues, toolKey, serverId, tool.name, execute, setToolExecuting, recordToolExecution, updateExecutionState, forceUpdate]);

    const handleCancel = useCallback(() => {
        const currentState = toolExecutionStates.get(toolKey)!;
        if (currentState.abortController) {
            currentState.abortController.abort();
            updateExecutionState({
                result: {
                    success: false,
                    time: currentState.elapsedTime,
                    error: 'Execution cancelled by user',
                    timestamp: new Date(),
                },
                isExecuting: false,
                abortController: null,
            });
            setToolExecuting(serverId, tool.name, false);
        }
    }, [toolKey, serverId, tool.name, setToolExecuting, updateExecutionState]);

    // Register keyboard shortcuts for tool execution
    useKeyboardShortcuts([
        {
            key: 'Enter',
            ctrl: true,
            description: 'Execute tool',
            handler: () => {
                if (!executionState.isExecuting) {
                    handleExecute();
                }
            },
            preventDefault: true,
        },
        {
            key: 'm',
            description: 'Toggle Form/JSON input mode',
            handler: () => {
                setInputMode(inputMode === 'form' ? 'json' : 'form');
            },
        },
    ]);

    return (
        <div className="main-area">
            <div className="main-header">
                <h2>{tool.name}</h2>
                <div className="description-container">
                    <p
                        ref={descriptionRef}
                        className={`main-tool-description ${!isDescriptionExpanded && isDescriptionLong ? 'collapsed' : ''}`}
                    >
                        {tool.description}
                    </p>
                    {isDescriptionLong && (
                        <button
                            type="button"
                            className="description-toggle"
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        >
                            {isDescriptionExpanded ? 'Show less' : '+ Show more'}
                        </button>
                    )}
                </div>
            </div>

            <div className="content-area">
                <section className="input-section">
                    <div className="section-title">Input Parameters</div>

                    <div className="input-form-container">
                        <ToggleGroup
                            value={inputMode}
                            onChange={(value) => setInputMode(value as 'form' | 'json')}
                            options={[
                                { value: 'form', label: 'Form' },
                                { value: 'json', label: 'JSON' },
                            ]}
                        />

                        {inputMode === 'form' ? (
                            <FormInput
                                schema={tool.inputSchema}
                                values={inputValues}
                                onChange={setInputValues}
                            />
                        ) : (
                            <>
                                <JsonEditor
                                    value={jsonInput}
                                    onChange={handleJsonChange}
                                    placeholder="Enter JSON input..."
                                />
                                {jsonError && (
                                    <div className="json-error">
                                        ⚠️ JSON Error: {jsonError}
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            type="button"
                            className={`execute-btn ${executionState.isExecuting ? 'executing' : ''}`}
                            onClick={executionState.isExecuting ? handleCancel : handleExecute}
                            title={executionState.isExecuting ? 'Click to cancel execution' : getShortcutHint('Execute tool', { key: 'Enter', ctrl: true })}
                        >
                            {executionState.isExecuting ? (
                                <>
                                    <span>Executing</span>
                                    <span className="execute-timer">{executionState.elapsedTime}ms</span>
                                    <span className="execute-cancel-hint">(click to cancel)</span>
                                </>
                            ) : (
                                <>
                                    Execute Tool
                                    <kbd className="execute-btn-shortcut">⌘↵</kbd>
                                </>
                            )}
                        </button>
                    </div>
                </section>

                {executionState.result && (
                    <ResultSection
                        result={executionState.result}
                        resultTab={executionState.resultTab}
                        setResultTab={(tab) => updateExecutionState({ resultTab: tab })}
                        toolName={tool.name}
                        input={inputValues}
                    />
                )}
            </div>
        </div>
    );
}

interface FormInputProps {
    schema: {
        properties?: Record<string, any>;
        required?: string[];
    };
    values: Record<string, unknown>;
    onChange: (values: Record<string, unknown>) => void;
}

const FormInput = memo(function FormInput({ schema, values, onChange }: FormInputProps) {
    const properties = schema.properties || {};
    const required = schema.required || [];

    const handleChange = (key: string, prop: any, value: string | boolean) => {
        let parsedValue: unknown = value;

        // Convert values based on schema type
        if (prop.type === 'number' || prop.type === 'integer') {
            parsedValue = value === '' ? undefined : Number(value);
        } else if (prop.type === 'boolean') {
            parsedValue = value;
        } else if (prop.type === 'array' || prop.type === 'object') {
            // For complex types, try to parse as JSON
            try {
                parsedValue = value === '' ? (prop.type === 'array' ? [] : {}) : JSON.parse(value as string);
            } catch {
                parsedValue = value; // Keep as string if invalid JSON
            }
        }

        onChange({
            ...values,
            [key]: parsedValue,
        });
    };

    const getInputValue = (key: string, prop: any): string => {
        const value = values[key];

        if (value === undefined || value === null) {
            return '';
        }

        if (prop.type === 'array' || prop.type === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    };

    return (
        <div className="form-fields">
            {Object.entries(properties).map(([key, prop]) => {
                // Handle boolean as checkbox
                if (prop.type === 'boolean') {
                    return (
                        <div key={key} className="form-field">
                            <Checkbox
                                label={
                                    <>
                                        <span className="param-name" title={prop.description}>
                                            {key}
                                        </span>
                                        {required.includes(key) && <span className="required">*</span>}
                                    </>
                                }
                                checked={Boolean(values[key])}
                                onChange={(e) => handleChange(key, prop, e.target.checked)}
                            />
                        </div>
                    );
                }

                // Handle array/object as textarea
                if (prop.type === 'array' || prop.type === 'object') {
                    return (
                        <Textarea
                            key={key}
                            label={
                                <>
                                    <span className="param-name" title={prop.description}>
                                        {key}
                                    </span>
                                    {required.includes(key) && <span className="required">*</span>}
                                    <span className="field-type">({prop.type})</span>
                                </>
                            }
                            placeholder={prop.description || `Enter JSON ${prop.type}...`}
                            value={getInputValue(key, prop)}
                            onChange={(e) => handleChange(key, prop, e.target.value)}
                            rows={3}
                        />
                    );
                }

                // Handle string, number, integer as input
                return (
                    <Input
                        key={key}
                        label={
                            <>
                                <span className="param-name" title={prop.description}>
                                    {key}
                                </span>
                                {required.includes(key) && <span className="required">*</span>}
                                {(prop.type === 'number' || prop.type === 'integer') && (
                                    <span className="field-type">({prop.type})</span>
                                )}
                            </>
                        }
                        type={prop.type === 'number' || prop.type === 'integer' ? 'number' : 'text'}
                        placeholder={prop.description || `Enter ${key}...`}
                        value={getInputValue(key, prop)}
                        onChange={(e) => handleChange(key, prop, e.target.value)}
                        step={prop.type === 'number' ? 'any' : undefined}
                    />
                );
            })}
        </div>
    );
});

interface ResultSectionProps {
    result: ExecutionResult;
    resultTab: 'response' | 'raw' | 'request';
    setResultTab: (tab: 'response' | 'raw' | 'request') => void;
    toolName: string;
    input: Record<string, unknown>;
}

function ResultSection({
    result,
    resultTab,
    setResultTab,
    toolName,
    input,
}: ResultSectionProps) {
    const resultContent = useMemo(() => {
        switch (resultTab) {
            case 'response':
                // Show error message in a readable format for errors
                if (!result.success && result.error) {
                    return result.error;
                }
                return JSON.stringify(result.data, null, 2);
            case 'raw':
                return JSON.stringify(result, null, 2);
            case 'request':
                return JSON.stringify({ tool: toolName, input }, null, 2);
            default:
                return '';
        }
    }, [resultTab, result, toolName, input]);

    return (
        <section className="result-section animate-fade-in">
            <div className={`result-header ${result.success ? '' : 'error'}`}>
                <div className="result-header-left">
                    <span className={`result-status ${result.success ? '' : 'error'}`}>
                        {result.success ? '✓ Success' : '✗ Error'}
                    </span>
                    <span className="result-time">({result.time}ms)</span>
                </div>
                <CopyButton content={resultContent} label={`Copy ${resultTab}`} size="sm" />
            </div>

            <div className="result-tabs">
                <button
                    className={`result-tab ${resultTab === 'response' ? 'active' : ''}`}
                    onClick={() => setResultTab('response')}
                >
                    Response
                </button>
                <button
                    className={`result-tab ${resultTab === 'raw' ? 'active' : ''}`}
                    onClick={() => setResultTab('raw')}
                >
                    Raw JSON
                </button>
                <button
                    className={`result-tab ${resultTab === 'request' ? 'active' : ''}`}
                    onClick={() => setResultTab('request')}
                >
                    Request
                </button>
            </div>

            <JsonViewer
                content={resultContent}
                className="result-content"
                preserveQuotes={resultTab === 'raw'}
            />
        </section>
    );
}

