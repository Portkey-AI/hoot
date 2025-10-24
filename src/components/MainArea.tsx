import { memo, useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useMCPExecution } from '../hooks/useMCP';
import { EmptyState as EmptyStateComponent } from './EmptyState';
import { CopyButton } from './CopyButton';
import { Wrench } from 'lucide-react';
import type { ExecutionResult, ToolSchema } from '../types';
import './MainArea.css';

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
    const inputMode = useAppStore((state) => state.inputMode);
    const setInputMode = useAppStore((state) => state.setInputMode);
    const [result, setResult] = useState<ExecutionResult | null>(null);
    const [resultTab, setResultTab] = useState<'response' | 'raw' | 'request'>('response');
    const [elapsedTime, setElapsedTime] = useState(0);
    const { execute, isExecuting } = useMCPExecution();

    // Generate default values from schema
    const defaultValues = useMemo(() => {
        const properties = tool.inputSchema.properties || {};
        const defaults: Record<string, unknown> = {};

        Object.entries(properties).forEach(([key, prop]: [string, any]) => {
            if (prop.default !== undefined) {
                defaults[key] = prop.default;
            } else if (prop.type === 'string') {
                defaults[key] = '';
            } else if (prop.type === 'number') {
                defaults[key] = 0;
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

    // Single source of truth for input values
    const [inputValues, setInputValues] = useState<Record<string, unknown>>(defaultValues);

    // Keep JSON editor content in sync with inputValues
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState('');

    // Reset state when tool changes
    useEffect(() => {
        setResult(null);
        setInputValues(defaultValues);
        setJsonInput('');
        setJsonError('');
        setResultTab('response');
    }, [tool.name, defaultValues]);

    // Update JSON when inputValues change or when switching to JSON mode
    useMemo(() => {
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

    const handleExecute = async () => {
        try {
            // If in JSON mode and there's a parse error, show it
            if (inputMode === 'json' && jsonError) {
                setResult({
                    success: false,
                    time: 0,
                    error: `Invalid JSON: ${jsonError}`,
                    timestamp: new Date(),
                });
                return;
            }

            // Start timer
            setElapsedTime(0);
            const startTime = Date.now();
            const timerInterval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 10); // Update every 10ms for smooth animation

            try {
                const executionResult = await execute(serverId, tool.name, inputValues);
                setResult(executionResult);
            } finally {
                clearInterval(timerInterval);
            }
        } catch (error) {
            console.error('Execution error:', error);
            setResult({
                success: false,
                time: 0,
                error: error instanceof Error ? error.message : 'Execution failed',
                timestamp: new Date(),
            });
        }
    };

    return (
        <div className="main-area">
            <div className="main-header">
                <h2>{tool.name}</h2>
                <p>{tool.description}</p>
            </div>

            <div className="content-area">
                <section className="input-section">
                    <div className="section-title">Input Parameters</div>

                    <div className="mode-toggle">
                        <button
                            className={`mode-btn ${inputMode === 'form' ? 'active' : ''}`}
                            onClick={() => setInputMode('form')}
                        >
                            Form
                        </button>
                        <button
                            className={`mode-btn ${inputMode === 'json' ? 'active' : ''}`}
                            onClick={() => setInputMode('json')}
                        >
                            JSON
                        </button>
                    </div>

                    {inputMode === 'form' ? (
                        <FormInput
                            schema={tool.inputSchema}
                            values={inputValues}
                            onChange={setInputValues}
                        />
                    ) : (
                        <>
                            <textarea
                                className="json-editor"
                                value={jsonInput}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                placeholder="Enter JSON input..."
                                spellCheck={false}
                            />
                            {jsonError && (
                                <div className="json-error">
                                    ⚠️ JSON Error: {jsonError}
                                </div>
                            )}
                        </>
                    )}

                    <button
                        className={`execute-btn ${isExecuting ? 'executing' : ''}`}
                        onClick={handleExecute}
                        disabled={isExecuting}
                    >
                        {isExecuting ? (
                            <>
                                <span>Executing</span>
                                <span className="execute-timer">{elapsedTime}ms</span>
                            </>
                        ) : (
                            'Execute Tool'
                        )}
                    </button>
                </section>

                {result && (
                    <ResultSection
                        result={result}
                        resultTab={resultTab}
                        setResultTab={setResultTab}
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

    return (
        <div className="form-fields">
            {Object.entries(properties).map(([key, prop]) => (
                <div key={key} className="form-field">
                    <label className="form-label">
                        {key} {required.includes(key) && <span className="required">*</span>}
                    </label>
                    <input
                        type={prop.type === 'number' ? 'number' : 'text'}
                        className="form-input"
                        placeholder={prop.description || ''}
                        value={(values[key] as string) || ''}
                        onChange={(e) =>
                            onChange({
                                ...values,
                                [key]: prop.type === 'number' ? Number(e.target.value) : e.target.value,
                            })
                        }
                    />
                </div>
            ))}
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

            <pre className="result-content">{resultContent}</pre>
        </section>
    );
}

