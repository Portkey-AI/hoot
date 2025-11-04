import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { getShortcutHint } from '../hooks/useKeyboardShortcuts';
import { Send, Sparkles, Code2, Settings, Copy, Check, Filter, Trash2, ChevronRight } from 'lucide-react';
import { LLMSettingsModal } from './LLMSettingsModal';
import { JsonViewer } from './JsonViewer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MentionInput, type Mention } from './MentionInput';
import { getPortkeyClient, getDisplayModelName, type ChatMessage } from '../lib/portkeyClient';
import { convertAllMCPToolsToOpenAI, convertFilteredToolsToOpenAI, convertMCPToolToOpenAI, findServerForTool } from '../lib/toolConverter';
import { mcpClient } from '../lib/mcpClient';
import { filterToolsForContext } from '../lib/toolFilter';
import { useToolFilter } from '../hooks/useToolFilter';
import * as backendClient from '../lib/backendClient';
import type { ToolSchema } from '../types';
import './HybridInterface.css';

interface Message {
    role: 'user' | 'assistant' | 'tool' | 'system';
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
        serverId?: string;
        serverIcon?: string;
        serverName?: string;
        executionTime?: number;
    };
    filterMetrics?: {
        toolsUsed: number;
        toolsTotal: number;
        filterTime: number;
        toolDetails?: Array<{
            toolName: string;
            serverName: string;
            serverIcon?: string;
        }>;
    };
    apiRequest?: any;
    apiResponse?: any;
}

const CHAT_MESSAGES_STORAGE_KEY = 'hoot-chat-messages';
const CHAT_MENTIONS_STORAGE_KEY = 'hoot-chat-mentions';

// Helper to get initial messages from localStorage or default
const getInitialMessages = (): Message[] => {
    // Try to load saved messages
    const savedMessages = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
    if (savedMessages) {
        try {
            const parsed = JSON.parse(savedMessages);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.warn('Failed to parse saved messages:', e);
        }
    }

    // Get current model name for welcome message
    const currentModel = localStorage.getItem('hoot-selected-model') || '@openai/gpt-4o-mini';
    const modelName = getDisplayModelName(currentModel);

    // Return default welcome message
    return [{
        role: 'system',
        content: `👋 Hi! I'm connected to ${modelName} and can use your MCP tools. What would you like to do?`,
    }];
};

// Helper to get initial mentions from localStorage
const getInitialMentions = (): Mention[] => {
    const savedMentions = localStorage.getItem(CHAT_MENTIONS_STORAGE_KEY);
    if (savedMentions) {
        try {
            const parsed = JSON.parse(savedMentions);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            console.warn('Failed to parse saved mentions:', e);
        }
    }
    return [];
};

export function HybridInterface() {
    const [messages, setMessages] = useState<Message[]>(getInitialMessages());
    const [input, setInput] = useState('');
    const [mentions, setMentions] = useState<Mention[]>(getInitialMentions());
    const [isProcessing, setIsProcessing] = useState(false);
    const [streamingMessageIndex, setStreamingMessageIndex] = useState<number>(-1);
    const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
    const [filterMetrics, setFilterMetrics] = useState<{
        toolsUsed: number;
        toolsTotal: number;
        lastFilterTime: number;
    } | null>(null);

    // Cache for server favicons (similar to ServerSidebar)
    const faviconCacheRef = useRef<Map<string, string | null>>(new Map());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const servers = useAppStore((state) => state.servers);
    const tools = useAppStore((state) => state.tools);
    const toolFilterEnabled = useAppStore((state) => state.toolFilterEnabled);
    const toolFilterConfig = useAppStore((state) => state.toolFilterConfig);

    // Initialize tool filter when servers/tools change
    const { isReady: toolFilterReady } = useToolFilter();

    const connectedServers = servers.filter((s) => s.connected);
    const availableTools = Object.values(tools).flat();

    // Initialize Portkey client (JWT-based authentication)
    useEffect(() => {
        // Portkey client will fetch JWT automatically on first use
        getPortkeyClient();
    }, []);

    // Update welcome message when model changes
    useEffect(() => {
        const handleModelChange = () => {
            // Only update if we're showing just the welcome message
            if (messages.length === 1 && messages[0].role === 'system') {
                const currentModel = localStorage.getItem('hoot-selected-model') || '@openai/gpt-4o-mini';
                const modelName = getDisplayModelName(currentModel);

                setMessages([{
                    role: 'system',
                    content: `👋 Hi! I'm connected to ${modelName} and can use your MCP tools. What would you like to do?`,
                }]);
            }
        };

        // Listen for custom model change event
        window.addEventListener('model-changed' as any, handleModelChange);

        return () => {
            window.removeEventListener('model-changed' as any, handleModelChange);
        };
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Helper to get server favicon with caching
    const getServerFavicon = async (serverId: string): Promise<string | null> => {
        // Check cache first
        const cached = faviconCacheRef.current.get(serverId);
        if (cached !== undefined) {
            return cached;
        }

        // Fetch and cache
        const server = servers.find(s => s.id === serverId);
        if (server?.url) {
            try {
                const oauthLogoUri = server.auth?.oauthServerMetadata?.logo_uri;
                const faviconUrl = await backendClient.getFaviconUrl(server.url, oauthLogoUri);
                faviconCacheRef.current.set(serverId, faviconUrl);
                return faviconUrl;
            } catch (e) {
                faviconCacheRef.current.set(serverId, null);
                return null;
            }
        }

        faviconCacheRef.current.set(serverId, null);
        return null;
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    // Save mentions to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(CHAT_MENTIONS_STORAGE_KEY, JSON.stringify(mentions));
    }, [mentions]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to clear chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (messages.length > 1) {
                    handleClearChat();
                }
            }

            // "/" to focus message input (only if not already focused)
            if (e.key === '/' && document.activeElement !== textareaRef.current) {
                e.preventDefault();
                textareaRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [messages.length]);

    const handleClearChat = () => {
        const currentModel = localStorage.getItem('hoot-selected-model') || '@openai/gpt-4o-mini';
        const modelName = getDisplayModelName(currentModel);

        const welcomeMessage: Message = {
            role: 'system',
            content: `👋 Hi! I'm connected to ${modelName} and can use your MCP tools. What would you like to do?`,
        };
        setMessages([welcomeMessage]);
        setSelectedMessage(null);
        setMentions([]);
        localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
        localStorage.removeItem(CHAT_MENTIONS_STORAGE_KEY);
    };

    /**
     * Helper function to get filtered tools based on conversation context
     * Filters tools dynamically before each LLM call
     * Now includes pinned tools from @mentions
     */
    const getFilteredTools = async (conversationContext: ChatMessage[]) => {
        const totalTools = Object.values(tools).flat().length;

        // Filter out system messages, don't send them in the conversation context
        conversationContext = conversationContext.filter((m) => m.role !== 'system');

        // If there are mentions, always include those tools (bypass semantic filtering)
        if (mentions.length > 0) {
            console.log('[Chat] Using pinned tools from mentions, bypassing semantic filtering');

            // Collect all pinned tools with their schemas
            const pinnedToolSchemas: ToolSchema[] = [];

            for (const mention of mentions) {
                if (mention.type === 'server') {
                    // Add all tools from this server
                    const serverTools = tools[mention.id] || [];
                    pinnedToolSchemas.push(...serverTools);
                } else if (mention.type === 'tool') {
                    // Add this specific tool
                    for (const serverTools of Object.values(tools)) {
                        const tool = serverTools.find(t => t.name === mention.name);
                        if (tool) {
                            pinnedToolSchemas.push(tool);
                            break;
                        }
                    }
                }
            }

            // Convert pinned tools to OpenAI format
            const openaiTools = pinnedToolSchemas.map(tool => convertMCPToolToOpenAI(tool));

            // Collect tool details with server information for display
            const toolDetails = await Promise.all(pinnedToolSchemas.map(async (tool) => {
                // Find the server that has this tool
                let serverName = 'Unknown';
                let serverIcon: string | undefined;

                for (const [serverId, serverTools] of Object.entries(tools)) {
                    if (serverTools.some(t => t.name === tool.name)) {
                        const server = servers.find(s => s.id === serverId);
                        if (server) {
                            serverName = server.name;
                            serverIcon = await getServerFavicon(serverId) || undefined;
                        }
                        break;
                    }
                }

                return {
                    toolName: tool.name,
                    serverName,
                    serverIcon,
                };
            }));

            // Update filter metrics for display
            setFilterMetrics({
                toolsUsed: pinnedToolSchemas.length,
                toolsTotal: totalTools,
                lastFilterTime: 0, // No filtering time for pinned tools
            });

            console.log(`[Chat] Using ${pinnedToolSchemas.length} pinned tools (bypassing semantic filtering)`);

            return {
                tools: openaiTools,
                metrics: {
                    toolsUsed: pinnedToolSchemas.length,
                    toolsTotal: totalTools,
                    filterTime: 0,
                    toolDetails,
                },
            };
        }

        // Try to use semantic filtering if enabled and ready
        if (toolFilterEnabled && toolFilterReady && totalTools > 0) {
            try {
                console.log('[Tool Filter] Context sent to filtering library:', conversationContext);
                const result = await filterToolsForContext(conversationContext, toolFilterConfig);
                console.log('[Tool Filter] Response from filtering library:', result);

                if (result) {
                    const openaiTools = convertFilteredToolsToOpenAI(result.tools);

                    // Collect unique servers first
                    const uniqueServers = new Map<string, { serverId: string; serverName: string }>();
                    for (const scoredTool of result.tools) {
                        for (const [serverId, serverTools] of Object.entries(tools)) {
                            if (serverTools.some(t => t.name === scoredTool.toolName)) {
                                const server = servers.find(s => s.id === serverId);
                                if (server) {
                                    uniqueServers.set(serverId, {
                                        serverId,
                                        serverName: server.name
                                    });
                                }
                                break;
                            }
                        }
                    }

                    // Fetch favicons for all servers in parallel
                    const serverFaviconPromises = Array.from(uniqueServers.values()).map(async ({ serverId }) => {
                        const server = servers.find(s => s.id === serverId);
                        if (server?.url) {
                            const oauthLogoUri = server.auth?.oauthServerMetadata?.logo_uri;
                            const faviconUrl = await backendClient.getFaviconUrl(server.url, oauthLogoUri);
                            return { serverId, faviconUrl };
                        }
                        return { serverId, faviconUrl: null };
                    });

                    const serverFavicons = await Promise.all(serverFaviconPromises);
                    const faviconMap = new Map(serverFavicons.map(({ serverId, faviconUrl }) => [serverId, faviconUrl]));

                    // Extract tool details with server information
                    const toolDetails = result.tools.map((scoredTool) => {
                        // Find the server that has this tool
                        let serverName = 'Unknown';
                        let serverIcon: string | undefined;

                        for (const [serverId, serverTools] of Object.entries(tools)) {
                            if (serverTools.some(t => t.name === scoredTool.toolName)) {
                                const server = servers.find(s => s.id === serverId);
                                if (server) {
                                    serverName = server.name;
                                    serverIcon = faviconMap.get(serverId) || undefined;
                                }
                                break;
                            }
                        }

                        return {
                            toolName: scoredTool.toolName,
                            serverName,
                            serverIcon,
                        };
                    });

                    // Update filter metrics for display
                    setFilterMetrics({
                        toolsUsed: result.tools.length,
                        toolsTotal: totalTools,
                        lastFilterTime: result.metrics.totalTime,
                    });

                    console.log(
                        `[Chat] Using ${result.tools.length}/${totalTools} filtered tools (${result.metrics.totalTime.toFixed(1)}ms)`
                    );

                    // Return both tools and metrics for adding to chat history
                    return {
                        tools: openaiTools,
                        metrics: {
                            toolsUsed: result.tools.length,
                            toolsTotal: totalTools,
                            filterTime: result.metrics.totalTime,
                            toolDetails,
                        },
                    };
                }
            } catch (error) {
                console.warn('[Chat] Filtering failed, falling back to all tools:', error);
            }
        }

        // Fallback to all tools (with safety limit for OpenAI's 128 tool max)
        const allTools = convertAllMCPToolsToOpenAI(tools);
        const limitedTools = allTools.slice(0, 120); // OpenAI max is 128, leave some margin
        setFilterMetrics({
            toolsUsed: limitedTools.length,
            toolsTotal: totalTools,
            lastFilterTime: 0,
        });

        if (allTools.length > 120) {
            console.warn(`[Chat] Tool count (${allTools.length}) exceeds OpenAI limit (128), using first 120 tools`);
        }

        return {
            tools: limitedTools,
            metrics: null, // No filtering metrics for unfiltered case
        };
    };

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        if (connectedServers.length === 0) {
            alert('Please connect to at least one MCP server in the Test Tools tab first.');
            return;
        }

        // Chat is ready as soon as we have tools, don't wait for filter to initialize
        if (availableTools.length === 0) {
            alert('No tools available yet. Please wait for servers to load their tools.');
            return;
        }

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);

        try {
            const client = getPortkeyClient();
            if (!client) throw new Error('Portkey client not initialized');

            // Build conversation history
            const conversationMessages: ChatMessage[] = messages
                .filter((m) => {
                    // Include user and assistant messages
                    if (m.role === 'user' || m.role === 'assistant') return true;
                    // Include real system messages (but not UI-only filter metrics indicators)
                    if (m.role === 'system' && !m.filterMetrics) return true;
                    // Exclude everything else (tool messages, filter metrics, etc.)
                    return false;
                })
                .map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

            // Add system message at the start if this is the first message in the conversation
            if (conversationMessages.length === 0) {
                conversationMessages.unshift({
                    role: 'system',
                    content: "You are Hoot's AI assistant. Hoot is a web-based MCP (Model Context Protocol) client that connects to multiple servers, giving you access to a wide range of tools and services.\n\nYour available tools are intelligently filtered using semantic similarity to show only the most relevant options for the current conversation. When you need to accomplish a task, use the provided tools effectively.\n\nBe helpful, clear about what actions you're taking, and explain tool results in a natural way.",
                });
            }

            conversationMessages.push({
                role: 'user',
                content: input,
            });

            // Recursive tool execution loop with safety limit
            const MAX_ITERATIONS = 10; // Prevent infinite loops
            let currentMessages = conversationMessages;
            let iteration = 0;

            while (iteration < MAX_ITERATIONS) {
                iteration++;
                console.log(`[Chat] LLM call iteration ${iteration}`);

                // Show filtering indicator for first iteration only (before actual filtering)
                let filteringMessageIndex = -1;
                if (iteration === 1 && toolFilterEnabled) {
                    setMessages((prev) => {
                        filteringMessageIndex = prev.length;
                        return [
                            ...prev,
                            {
                                role: 'system' as const,
                                content: '🔍 Filtering tools for context...',
                            },
                        ];
                    });
                }

                // Filter tools based on current conversation context
                const { tools: openaiTools, metrics: filterMetrics } = await getFilteredTools(currentMessages);

                // Replace filtering message with actual metrics
                if (filteringMessageIndex !== -1 && filterMetrics) {
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[filteringMessageIndex] = {
                            role: 'system' as const,
                            content: '',
                            filterMetrics: filterMetrics,
                        };
                        return newMessages;
                    });
                } else if (iteration > 1 && filterMetrics) {
                    // For subsequent iterations, just add the metrics
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'system' as const,
                            content: '',
                            filterMetrics: filterMetrics,
                        },
                    ]);
                }

                // Track streaming message index locally
                let localStreamingIndex = -1;
                let accumulatedContent = '';
                let accumulatedToolCalls: any[] = [];

                // Make streaming API call
                const stream = client.createChatCompletionStream({
                    messages: currentMessages,
                    tools: openaiTools.length > 0 ? openaiTools : undefined,
                });

                // Process stream chunks
                for await (const chunk of stream) {
                    const delta = chunk.choices?.[0]?.delta;

                    if (!delta) continue;

                    // Handle content streaming
                    if (delta.content) {
                        accumulatedContent += delta.content;

                        // Create or update streaming message
                        setMessages((prev) => {
                            if (localStreamingIndex === -1) {
                                // First chunk - add new message
                                localStreamingIndex = prev.length;
                                setStreamingMessageIndex(localStreamingIndex);
                                return [
                                    ...prev,
                                    {
                                        role: 'assistant' as const,
                                        content: accumulatedContent,
                                    },
                                ];
                            } else {
                                // Update existing message - preserve all properties
                                const newMessages = [...prev];
                                newMessages[localStreamingIndex] = {
                                    role: 'assistant' as const,
                                    content: accumulatedContent,
                                };
                                return newMessages;
                            }
                        });
                    }

                    // Handle tool calls
                    if (delta.tool_calls) {
                        for (const toolCall of delta.tool_calls) {
                            const index = toolCall.index;
                            if (!accumulatedToolCalls[index]) {
                                accumulatedToolCalls[index] = {
                                    id: toolCall.id || '',
                                    type: 'function',
                                    function: {
                                        name: toolCall.function?.name || '',
                                        arguments: toolCall.function?.arguments || '',
                                    },
                                };
                            } else {
                                if (toolCall.id) {
                                    accumulatedToolCalls[index].id = toolCall.id;
                                }
                                if (toolCall.function?.name) {
                                    accumulatedToolCalls[index].function.name = toolCall.function.name;
                                }
                                if (toolCall.function?.arguments) {
                                    accumulatedToolCalls[index].function.arguments += toolCall.function.arguments;
                                }
                            }
                        }
                    }
                }

                // Create the final assistant message from accumulated data
                const assistantMessage = {
                    role: 'assistant',
                    content: accumulatedContent || null,
                    tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                };

                // Check if the LLM wants to call tools
                if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                    // Execute ALL tool calls and collect results
                    const toolResults: Array<{ toolCall: any; result: any; error?: string }> = [];

                    for (const toolCall of assistantMessage.tool_calls) {
                        const toolName = toolCall.function.name;
                        const toolArgs = toolCall.function.arguments;

                        // Find which server has this tool
                        const serverId = findServerForTool(toolName, tools);
                        if (!serverId) {
                            const errorMsg = `Tool ${toolName} not found on any connected server`;
                            toolResults.push({ toolCall, result: null, error: errorMsg });

                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: 'tool',
                                    content: `Error: ${errorMsg}`,
                                    toolResult: {
                                        id: toolCall.id,
                                        name: toolName,
                                        result: JSON.stringify({ error: errorMsg }),
                                    },
                                },
                            ]);
                            continue;
                        }

                        // Execute the tool
                        try {
                            const startTime = performance.now();
                            const result = await mcpClient.executeTool(serverId, toolName, JSON.parse(toolArgs));
                            const executionTime = performance.now() - startTime;
                            toolResults.push({ toolCall, result, error: undefined });

                            // Get server info
                            const server = servers.find(s => s.id === serverId);
                            const serverName = server?.name || 'Unknown Server';
                            const serverIcon = await getServerFavicon(serverId);

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
                                        serverId,
                                        serverIcon: serverIcon || undefined,
                                        serverName,
                                        executionTime,
                                    },
                                    apiResponse: result,
                                },
                            ]);
                        } catch (error: any) {
                            const errorMsg = error.message || 'Tool execution failed';
                            toolResults.push({ toolCall, result: null, error: errorMsg });

                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: 'tool',
                                    content: `Error: ${errorMsg}`,
                                    toolResult: {
                                        id: toolCall.id,
                                        name: toolName,
                                        result: JSON.stringify({ error: errorMsg }),
                                    },
                                },
                            ]);
                        }
                    }

                    // Update conversation with assistant's tool calls and all tool results
                    currentMessages = [
                        ...currentMessages,
                        {
                            role: 'assistant',
                            content: assistantMessage.content || null,
                            tool_calls: assistantMessage.tool_calls,
                        } as any,
                        // Add all tool results
                        ...toolResults.map((tr) => ({
                            role: 'tool' as const,
                            content: tr.error
                                ? JSON.stringify({ error: tr.error })
                                : JSON.stringify(tr.result),
                            tool_call_id: tr.toolCall.id,
                        })),
                    ];

                    // Continue loop - next iteration will call LLM with tool results
                    continue;
                } else {
                    // No tool calls - we have a final response
                    // Clear streaming state
                    setStreamingMessageIndex(-1);

                    // The message is already added via streaming
                    // If no streaming happened (empty response), add message manually
                    if (localStreamingIndex === -1) {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: assistantMessage.content || 'I apologize, I could not generate a response.',
                            },
                        ]);
                    }

                    // Exit the loop - we're done
                    break;
                }
            }

            // If we hit the iteration limit, warn the user
            if (iteration >= MAX_ITERATIONS) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'system' as const,
                        content: '⚠️ Reached maximum tool execution depth. The conversation may be incomplete.',
                    },
                ]);
            }
        } catch (error: any) {
            console.error('Error in LLM conversation:', error);
            setStreamingMessageIndex(-1); // Clear streaming state on error
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

    const handleCopyJson = (data: any, blockId: string) => {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(jsonString);
        setCopiedBlock(blockId);
        setTimeout(() => setCopiedBlock(null), 2000);
    };

    return (
        <div className="hybrid-interface">
            {/* Slim info bar */}
            <div className="chat-info-bar">
                <div className="chat-info-left">
                    <span className="info-item">
                        <Sparkles size={14} />
                        <span>{connectedServers.length} server{connectedServers.length !== 1 ? 's' : ''}</span>
                    </span>
                    <span className="info-divider">•</span>
                    <span className="info-item">
                        <Code2 size={14} />
                        {filterMetrics ? (
                            <span title={`${mentions.length > 0 ? 'Pinned tools' : 'Semantic filtering'} ${toolFilterEnabled && toolFilterReady && mentions.length === 0 ? 'active' : 'bypassed'}`}>
                                {filterMetrics.toolsUsed}/{filterMetrics.toolsTotal} tools
                                {mentions.length === 0 && toolFilterEnabled && toolFilterReady && filterMetrics.lastFilterTime > 0 && (
                                    <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                                        {' '}({filterMetrics.lastFilterTime.toFixed(0)}ms)
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span>{availableTools.length} tool{availableTools.length !== 1 ? 's' : ''}</span>
                        )}
                    </span>
                    {mentions.length > 0 ? (
                        <>
                            <span className="info-divider">•</span>
                            <span className="info-item" title={`${mentions.length} pinned ${mentions.length === 1 ? 'item' : 'items'} - semantic filtering bypassed`}>
                                <Filter size={14} style={{ color: '#f59e0b' }} />
                                <span style={{ color: '#f59e0b' }}>{mentions.length} Pinned</span>
                            </span>
                        </>
                    ) : toolFilterEnabled && toolFilterReady && filterMetrics ? (
                        <>
                            <span className="info-divider">•</span>
                            <span className="info-item" title="Semantic filtering is active">
                                <Filter size={14} style={{ color: '#10b981' }} />
                                <span style={{ color: '#10b981' }}>Filtered</span>
                            </span>
                        </>
                    ) : null}
                    {toolFilterEnabled && !toolFilterReady && availableTools.length > 0 && mentions.length === 0 && (
                        <>
                            <span className="info-divider">•</span>
                            <span className="info-item" title="Filter is initializing...">
                                <Filter size={14} style={{ color: '#f59e0b' }} />
                                <span style={{ color: '#f59e0b' }}>Initializing...</span>
                            </span>
                        </>
                    )}
                </div>
                <button
                    className="info-settings-button"
                    onClick={() => setShowSettings(true)}
                    title="Settings"
                >
                    <Settings size={14} />
                </button>
                {messages.length > 1 && (
                    <button
                        className="info-settings-button"
                        onClick={handleClearChat}
                        title={getShortcutHint('Clear chat history', { key: 'k', ctrl: true })}
                    >
                        <Trash2 size={14} />
                        Clear Chat
                        <kbd className="btn-shortcut-hint">⌘K</kbd>
                    </button>
                )}
            </div>

            <div className="hybrid-content">
                <div className="chat-pane full-width">
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
                                {message.role === 'system' && message.filterMetrics ? (
                                    // Compact filter metrics card with hover details
                                    <div className="filter-metrics-card">
                                        <div className="filter-metrics-main">
                                            <Filter size={12} />
                                            <span className="filter-metrics-text">
                                                Used <strong>{message.filterMetrics.toolsUsed}</strong> of {message.filterMetrics.toolsTotal} tools
                                            </span>
                                            {message.filterMetrics.filterTime > 0 && (
                                                <span className="filter-metrics-time">
                                                    {message.filterMetrics.filterTime.toFixed(0)}ms
                                                </span>
                                            )}
                                        </div>
                                        {message.filterMetrics.toolDetails && message.filterMetrics.toolDetails.length > 0 && (() => {
                                            // Group tools by server
                                            const toolsByServer = message.filterMetrics.toolDetails.reduce((acc, tool) => {
                                                if (!acc[tool.serverName]) {
                                                    acc[tool.serverName] = {
                                                        serverName: tool.serverName,
                                                        serverIcon: tool.serverIcon,
                                                        tools: [],
                                                    };
                                                }
                                                acc[tool.serverName].tools.push(tool.toolName);
                                                return acc;
                                            }, {} as Record<string, { serverName: string; serverIcon?: string; tools: string[] }>);

                                            return (
                                                <div className="filter-metrics-hover-card">
                                                    {Object.values(toolsByServer).map((server, idx) => (
                                                        <div key={idx} className="filter-hover-server">
                                                            <div className="filter-hover-server-header">
                                                                {server.serverIcon ? (
                                                                    <img src={server.serverIcon} alt="" className="filter-hover-favicon" />
                                                                ) : (
                                                                    <div className="filter-hover-favicon-placeholder">
                                                                        <Code2 size={10} />
                                                                    </div>
                                                                )}
                                                                <span className="filter-hover-server-name">{server.serverName}</span>
                                                                <span className="filter-hover-tool-count">{server.tools.length}</span>
                                                            </div>
                                                            <div className="filter-hover-tools">
                                                                {server.tools.map((toolName, toolIdx) => (
                                                                    <span key={toolIdx} className="filter-hover-tool">
                                                                        {toolName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <>
                                        <div className="message-content-hybrid">
                                            {message.role === 'tool' && message.toolResult ? (
                                                <div
                                                    className="tool-call-card"
                                                    onClick={() => setSelectedMessage(index)}
                                                >
                                                    <div className="tool-call-header">
                                                        <div className="tool-call-icon">
                                                            {message.toolResult.serverIcon ? (
                                                                <img
                                                                    src={message.toolResult.serverIcon}
                                                                    alt=""
                                                                    className="tool-call-favicon"
                                                                />
                                                            ) : (
                                                                <Code2 size={12} />
                                                            )}
                                                        </div>
                                                        <div className="tool-call-info">
                                                            <div className="tool-call-name">
                                                                {message.toolResult.name}
                                                            </div>
                                                            {(message.toolResult.serverName || message.toolResult.executionTime) && (
                                                                <div className="tool-call-meta">
                                                                    {message.toolResult.serverName && (
                                                                        <span className="tool-call-server">{message.toolResult.serverName}</span>
                                                                    )}
                                                                    {message.toolResult.serverName && message.toolResult.executionTime && (
                                                                        <span className="tool-call-meta-divider">•</span>
                                                                    )}
                                                                    {message.toolResult.executionTime && (
                                                                        <span className="tool-call-time">
                                                                            {message.toolResult.executionTime.toFixed(0)}ms
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <ChevronRight
                                                            size={16}
                                                            className="tool-call-chevron"
                                                        />
                                                    </div>
                                                </div>
                                            ) : message.role === 'assistant' ? (
                                                <MarkdownRenderer
                                                    content={message.content}
                                                    isStreaming={index === streamingMessageIndex}
                                                />
                                            ) : message.role === 'system' ? (
                                                // System message with clickable model name
                                                <div className="message-text-hybrid">
                                                    {(() => {
                                                        const currentModel = localStorage.getItem('hoot-selected-model') || '@openai/gpt-4o-mini';
                                                        const modelName = getDisplayModelName(currentModel);
                                                        const parts = message.content.split(modelName);

                                                        if (parts.length > 1) {
                                                            return (
                                                                <>
                                                                    {parts[0]}
                                                                    <span
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setShowSettings(true);
                                                                        }}
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            fontWeight: 600,
                                                                            color: 'var(--theme-accent-primary)',
                                                                            textDecoration: 'underline',
                                                                            textDecorationStyle: 'dotted',
                                                                            textUnderlineOffset: '2px'
                                                                        }}
                                                                    >
                                                                        {modelName}
                                                                    </span>
                                                                    {parts.slice(1).join(modelName)}
                                                                </>
                                                            );
                                                        }
                                                        return message.content;
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="message-text-hybrid">{message.content}</div>
                                            )}
                                            {(message.apiRequest || message.apiResponse) && !message.toolResult && (
                                                <div className="api-indicator">
                                                    <Code2 size={12} />
                                                    Click to view API details
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {isProcessing && (
                            <div className="chat-message-hybrid chat-message-assistant">
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
                            <MentionInput
                                value={input}
                                onChange={setInput}
                                mentions={mentions}
                                onMentionsChange={setMentions}
                                servers={servers}
                                tools={tools}
                                placeholder="Let's chat with your MCP servers... (type @ to filter tools)"
                                disabled={isProcessing}
                                inputRef={textareaRef}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.currentTarget.blur();
                                    }
                                }}
                            />
                            {!input && !isProcessing && (
                                <kbd className="input-shortcut-hint">/</kbd>
                            )}
                            <button
                                className="chat-send-button-hybrid"
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* API Inspector pane */}
                {selectedMessage !== null && selectedMsg && (
                    <div className="api-pane">
                        <div className="api-pane-header">
                            <Code2 size={16} />
                            <span>Live API Calls</span>
                            <button
                                className="api-close-button"
                                onClick={() => setSelectedMessage(null)}
                                title="Close API viewer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="api-pane-content">
                            {selectedMsg ? (
                                <>
                                    {selectedMsg.apiRequest && (
                                        <div className="api-block">
                                            <div className="api-block-header request">
                                                <span>→ Request</span>
                                                <button
                                                    className="api-copy-button"
                                                    onClick={() => handleCopyJson(selectedMsg.apiRequest, 'request')}
                                                    title="Copy JSON"
                                                >
                                                    {copiedBlock === 'request' ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <JsonViewer
                                                content={JSON.stringify(selectedMsg.apiRequest)}
                                                className="api-json-viewer"
                                            />
                                        </div>
                                    )}

                                    {selectedMsg.apiResponse && (
                                        <div className="api-block">
                                            <div className="api-block-header response">
                                                <span>← Response</span>
                                                <button
                                                    className="api-copy-button"
                                                    onClick={() => handleCopyJson(selectedMsg.apiResponse, 'response')}
                                                    title="Copy JSON"
                                                >
                                                    {copiedBlock === 'response' ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <JsonViewer
                                                content={JSON.stringify(selectedMsg.apiResponse)}
                                                className="api-json-viewer"
                                            />
                                        </div>
                                    )}

                                    {selectedMsg.toolCall && (
                                        <div className="api-block">
                                            <div className="api-block-header tool-call">
                                                <span>🔧 Tool Call: {selectedMsg.toolCall.name}</span>
                                                <button
                                                    className="api-copy-button"
                                                    onClick={() => handleCopyJson(selectedMsg.toolCall!.arguments, 'toolcall')}
                                                    title="Copy JSON"
                                                >
                                                    {copiedBlock === 'toolcall' ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <JsonViewer
                                                content={selectedMsg.toolCall.arguments}
                                                className="api-json-viewer"
                                            />
                                        </div>
                                    )}

                                    {selectedMsg.toolResult && (
                                        <div className="api-block">
                                            <div className="api-block-header tool-result">
                                                <span>✅ Tool Result: {selectedMsg.toolResult.name}</span>
                                                <button
                                                    className="api-copy-button"
                                                    onClick={() => handleCopyJson(selectedMsg.toolResult!.result, 'toolresult')}
                                                    title="Copy JSON"
                                                >
                                                    {copiedBlock === 'toolresult' ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <JsonViewer
                                                content={selectedMsg.toolResult.result}
                                                className="api-json-viewer"
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
                />
            )}
        </div>
    );
}
