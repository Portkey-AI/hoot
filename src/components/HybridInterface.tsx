import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Send, Sparkles, Code2, Maximize2, Minimize2, Settings } from 'lucide-react';
import { LLMSettingsModal } from './LLMSettingsModal';
import { CollapsibleJson } from './CollapsibleJson';
import { getPortkeyClient, hasPortkeyClient, type ChatMessage } from '../lib/portkeyClient';
import { convertAllMCPToolsToOpenAI, findServerForTool } from '../lib/toolConverter';
import { mcpClient } from '../lib/mcpClient';
import './HybridInterface.css';

interface Message {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolCall?: {
        id: string;
        name: string;
        arguments: string;
    };
    toolResult?: {
        id: string;
        name: string;
        result: string;
    };
    apiRequest?: any;
    apiResponse?: any;
}

const PORTKEY_API_KEY_STORAGE_KEY = 'hoot-portkey-api-key';

export function HybridInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: hasPortkeyClient()
                ? "👋 Hi! I'm connected to GPT-4o and can use your MCP tools. What would you like to do?"
                : "👋 Hi! Please configure your Portkey API key in settings to get started.",
        },
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
    const [showApiPane, setShowApiPane] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState<string>(
        () => localStorage.getItem(PORTKEY_API_KEY_STORAGE_KEY) || ''
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const servers = useAppStore((state) => state.servers);
    const tools = useAppStore((state) => state.tools);

    const connectedServers = servers.filter((s) => s.connected);
    const availableTools = Object.values(tools).flat();
    const hasApiKey = !!apiKey;

    // Initialize Portkey client if we have an API key
    useEffect(() => {
        if (apiKey) {
            getPortkeyClient({ apiKey });
        }
    }, [apiKey]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSaveApiKey = (newApiKey: string) => {
        setApiKey(newApiKey);
        localStorage.setItem(PORTKEY_API_KEY_STORAGE_KEY, newApiKey);
        getPortkeyClient({ apiKey: newApiKey });

        // Update welcome message
        setMessages([
            {
                role: 'assistant',
                content: "👋 Great! I'm now connected to GPT-4o. I can use your MCP tools. What would you like to do?",
            },
        ]);
    };

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        if (!hasApiKey) {
            alert('Please configure your Portkey API key in settings first.');
            setShowSettings(true);
            return;
        }

        if (connectedServers.length === 0) {
            alert('Please connect to at least one MCP server in the Test Tools tab first.');
            return;
        }

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);

        try {
            const client = getPortkeyClient();
            if (!client) throw new Error('Portkey client not initialized');

            // Convert MCP tools to OpenAI format
            const openaiTools = convertAllMCPToolsToOpenAI(tools);

            // Build conversation history
            const conversationMessages: ChatMessage[] = messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

            conversationMessages.push({
                role: 'user',
                content: input,
            });

            const apiRequest = {
                model: 'gpt-4o',
                messages: conversationMessages,
                tools: openaiTools.length > 0 ? openaiTools : undefined,
            };

            // Make API call
            const response: any = await client.createChatCompletion({
                messages: conversationMessages,
                tools: openaiTools.length > 0 ? openaiTools : undefined,
            });

            const choice = response.choices[0];
            const assistantMessage = choice.message;

            // Check if the LLM wants to call tools
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Add assistant message with tool calls
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: assistantMessage.content || 'I need to use some tools to help with that.',
                        apiRequest,
                        apiResponse: response,
                    },
                ]);

                // Execute each tool call
                for (const toolCall of assistantMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = toolCall.function.arguments;

                    // Show tool call message
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'tool',
                            content: `Calling tool: ${toolName}`,
                            toolCall: {
                                id: toolCall.id,
                                name: toolName,
                                arguments: toolArgs,
                            },
                            apiRequest: { function: toolName, arguments: toolArgs },
                        },
                    ]);

                    // Find which server has this tool
                    const serverId = findServerForTool(toolName, tools);
                    if (!serverId) {
                        throw new Error(`Tool ${toolName} not found on any connected server`);
                    }

                    // Execute the tool
                    try {
                        const result = await mcpClient.executeTool(serverId, toolName, JSON.parse(toolArgs));

                        // Show tool result
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: 'tool',
                                content: `Tool result: ${toolName}`,
                                toolResult: {
                                    id: toolCall.id,
                                    name: toolName,
                                    result: JSON.stringify(result, null, 2),
                                },
                                apiResponse: result,
                            },
                        ]);

                        // Continue conversation with tool result
                        const toolResultMessages: ChatMessage[] = [
                            ...conversationMessages,
                            {
                                role: 'assistant',
                                content: assistantMessage.content || null,
                                tool_calls: assistantMessage.tool_calls,
                            } as any,
                            {
                                role: 'tool',
                                content: JSON.stringify(result),
                                tool_call_id: toolCall.id,
                            },
                        ];

                        const followUpResponse: any = await client.createChatCompletion({
                            messages: toolResultMessages,
                            tools: openaiTools.length > 0 ? openaiTools : undefined,
                        });

                        const followUpMessage = followUpResponse.choices[0].message;

                        // Add final assistant message
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: followUpMessage.content || 'Done!',
                                apiRequest: { messages: toolResultMessages },
                                apiResponse: followUpResponse,
                            },
                        ]);
                    } catch (error: any) {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: `❌ Error executing tool ${toolName}: ${error.message}`,
                            },
                        ]);
                    }
                }
            } else {
                // No tool calls, just add assistant response
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: assistantMessage.content || 'I apologize, I could not generate a response.',
                        apiRequest,
                        apiResponse: response,
                    },
                ]);
            }
        } catch (error: any) {
            console.error('Error in LLM conversation:', error);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `❌ Error: ${error.message || 'Failed to process your request'}`,
                },
            ]);
        } finally {
            setIsProcessing(false);
        }
    };

    const selectedMsg = selectedMessage !== null ? messages[selectedMessage] : null;

    return (
        <div className="hybrid-interface">
            <div className="hybrid-header">
                <div className="hybrid-header-content">
                    <Sparkles size={20} />
                    <Code2 size={20} />
                    <div>
                        <h2>Hybrid Mode: GPT-4o + MCP Tools</h2>
                        <p>
                            {hasApiKey ? '✅' : '⚠️'} API Key{' '}
                            {hasApiKey && (
                                <>
                                    • {connectedServers.length} server{connectedServers.length !== 1 ? 's' : ''} •{' '}
                                    {availableTools.length} tool{availableTools.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <div className="hybrid-controls">
                    <button
                        className="settings-button"
                        onClick={() => setShowSettings(true)}
                        title="Configure API Key"
                    >
                        <Settings size={16} />
                        Settings
                    </button>
                    <button className="toggle-pane-button" onClick={() => setShowApiPane(!showApiPane)}>
                        {showApiPane ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        {showApiPane ? 'Hide' : 'Show'} API
                    </button>
                </div>
            </div>

            <div className="hybrid-content">
                <div className={`chat-pane ${!showApiPane ? 'full-width' : ''}`}>
                    <div className="chat-messages-hybrid">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`chat-message-hybrid chat-message-${message.role} ${index === selectedMessage ? 'selected' : ''
                                    } ${message.apiRequest || message.apiResponse ? 'has-api-data' : ''}`}
                                onClick={() =>
                                    message.apiRequest || message.apiResponse ? setSelectedMessage(index) : null
                                }
                            >
                                {message.role === 'user' && <div className="message-avatar-hybrid user">You</div>}
                                {message.role === 'assistant' && (
                                    <div className="message-avatar-hybrid assistant">
                                        <Sparkles size={14} />
                                    </div>
                                )}
                                {message.role === 'tool' && (
                                    <div className="message-avatar-hybrid tool">
                                        <Code2 size={14} />
                                    </div>
                                )}

                                <div className="message-content-hybrid">
                                    <div className="message-text-hybrid">{message.content}</div>
                                    {(message.apiRequest || message.apiResponse) && (
                                        <div className="api-indicator">
                                            <Code2 size={12} />
                                            Click to view API details
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isProcessing && (
                            <div className="chat-message-hybrid chat-message-assistant">
                                <div className="message-avatar-hybrid assistant">
                                    <Sparkles size={14} />
                                </div>
                                <div className="message-content-hybrid">
                                    <div className="typing-indicator-hybrid">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-container-hybrid">
                        <div className="chat-input-wrapper-hybrid">
                            <textarea
                                className="chat-input-hybrid"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={
                                    hasApiKey
                                        ? 'Ask me anything about your MCP tools...'
                                        : 'Configure API key in settings first...'
                                }
                                rows={1}
                                disabled={isProcessing || !hasApiKey}
                            />
                            <button
                                className="chat-send-button-hybrid"
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing || !hasApiKey}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {showApiPane && (
                    <div className="api-pane">
                        <div className="api-pane-header">
                            <Code2 size={16} />
                            <span>Live API Calls</span>
                        </div>

                        <div className="api-pane-content">
                            {selectedMsg ? (
                                <>
                                    {selectedMsg.apiRequest && (
                                        <div className="api-block">
                                            <div className="api-block-header request">
                                                <span>→ Request</span>
                                                <span className="api-method">POST /chat/completions</span>
                                            </div>
                                            <CollapsibleJson
                                                data={selectedMsg.apiRequest}
                                                title="Request Body"
                                                defaultCollapsed={false}
                                            />
                                        </div>
                                    )}

                                    {selectedMsg.apiResponse && (
                                        <div className="api-block">
                                            <div className="api-block-header response">
                                                <span>← Response</span>
                                                <span className="api-status">200 OK</span>
                                            </div>
                                            <CollapsibleJson
                                                data={selectedMsg.apiResponse}
                                                title="Response Body"
                                                defaultCollapsed={false}
                                            />
                                        </div>
                                    )}

                                    {selectedMsg.toolCall && (
                                        <div className="api-block">
                                            <div className="api-block-header tool-call">
                                                <span>🔧 Tool Call</span>
                                                <span className="tool-name">{selectedMsg.toolCall.name}</span>
                                            </div>
                                            <CollapsibleJson
                                                data={
                                                    typeof selectedMsg.toolCall.arguments === 'string'
                                                        ? JSON.parse(selectedMsg.toolCall.arguments)
                                                        : selectedMsg.toolCall.arguments
                                                }
                                                title="Arguments"
                                                defaultCollapsed={false}
                                            />
                                        </div>
                                    )}

                                    {selectedMsg.toolResult && (
                                        <div className="api-block">
                                            <div className="api-block-header tool-result">
                                                <span>✅ Tool Result</span>
                                                <span className="tool-name">{selectedMsg.toolResult.name}</span>
                                            </div>
                                            <CollapsibleJson
                                                data={
                                                    typeof selectedMsg.toolResult.result === 'string'
                                                        ? JSON.parse(selectedMsg.toolResult.result)
                                                        : selectedMsg.toolResult.result
                                                }
                                                title="Result"
                                                defaultCollapsed={false}
                                            />
                                        </div>
                                    )}

                                    {!selectedMsg.apiRequest &&
                                        !selectedMsg.apiResponse &&
                                        !selectedMsg.toolCall &&
                                        !selectedMsg.toolResult && (
                                            <div className="api-empty">
                                                <Code2 size={32} />
                                                <p>No API data for this message</p>
                                            </div>
                                        )}
                                </>
                            ) : (
                                <div className="api-empty">
                                    <Code2 size={32} />
                                    <p>Click on a message to see API details</p>
                                    <span className="api-hint">Messages with API data have a blue indicator</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showSettings && (
                <LLMSettingsModal
                    onClose={() => setShowSettings(false)}
                    onSave={handleSaveApiKey}
                    currentApiKey={apiKey}
                />
            )}
        </div>
    );
}
