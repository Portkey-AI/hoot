import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    AppState,
    ServerConfig,
    ToolSchema,
    ExecutionHistory,
} from '../types';
import { useToolStateStore } from './toolStateStore';

interface ToolFilterConfig {
    topK: number;
    minScore: number;
    contextMessages: number;
    maxContextTokens: number;
}

interface AppStore extends AppState {
    // Server actions
    addServer: (server: Omit<ServerConfig, 'connected'> | Omit<ServerConfig, 'id' | 'connected'>) => void;
    removeServer: (serverId: string) => void;
    updateServer: (serverId: string, updates: Partial<ServerConfig>) => void;
    setSelectedServer: (serverId: string | null) => void;

    // Tool actions
    setTools: (serverId: string, tools: ToolSchema[]) => void;
    setSelectedTool: (toolName: string | null) => void;

    // Execution actions
    addToHistory: (entry: Omit<ExecutionHistory, 'id' | 'timestamp'>) => void;
    clearHistory: () => void;
    setToolExecuting: (serverId: string, toolName: string, executing: boolean) => void;

    // UI actions
    setSearchQuery: (query: string) => void;

    // Tool filter actions
    toolFilterEnabled: boolean;
    toolFilterConfig: ToolFilterConfig;
    toolFilterReady: boolean;
    setToolFilterEnabled: (enabled: boolean) => void;
    updateToolFilterConfig: (config: Partial<ToolFilterConfig>) => void;
    setToolFilterReady: (ready: boolean) => void;
}

// Custom storage with proper Date handling
const customStorage = createJSONStorage<AppState>(() => ({
    getItem: (name) => {
        const str = localStorage.getItem(name);
        if (!str) return null;

        const parsed = JSON.parse(str);

        // Convert date strings back to Date objects
        if (parsed.state?.servers) {
            parsed.state.servers = parsed.state.servers.map((server: any) => ({
                ...server,
                lastConnected: server.lastConnected ? new Date(server.lastConnected) : undefined,
            }));
        }

        if (parsed.state?.history) {
            parsed.state.history = parsed.state.history.map((entry: any) => ({
                ...entry,
                timestamp: new Date(entry.timestamp),
                result: {
                    ...entry.result,
                    timestamp: new Date(entry.result.timestamp),
                },
            }));
        }

        return str;
    },
    setItem: (name, value) => {
        localStorage.setItem(name, value);
    },
    removeItem: (name) => {
        localStorage.removeItem(name);
    },
}));

// Fast, lightweight state management with persistence
export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            // Initial state
            servers: [],
            selectedServerId: null,
            selectedToolName: null,
            tools: {},
            history: [],
            searchQuery: '',
            executingTools: [],

            // Tool filter state
            toolFilterEnabled: true, // Enabled by default (now backend-based)
            toolFilterConfig: {
                topK: 22,
                minScore: 0.30,
                contextMessages: 3,
                maxContextTokens: 500,
            },
            toolFilterReady: false,

            // Server actions
            addServer: (server) =>
                set((state) => ({
                    servers: [
                        ...state.servers,
                        {
                            ...server,
                            // Use provided ID if available, otherwise generate one
                            id: 'id' in server ? server.id : crypto.randomUUID(),
                            connected: false,
                        },
                    ],
                })),

            removeServer: (serverId) =>
                set((state) => {
                    // Clean up tool state for this server
                    useToolStateStore.getState().clearServerData(serverId);

                    return {
                        servers: state.servers.filter((s) => s.id !== serverId),
                        selectedServerId:
                            state.selectedServerId === serverId ? null : state.selectedServerId,
                        tools: Object.fromEntries(
                            Object.entries(state.tools).filter(([id]) => id !== serverId)
                        ),
                    };
                }),

            updateServer: (serverId, updates) =>
                set((state) => ({
                    servers: state.servers.map((s) =>
                        s.id === serverId ? { ...s, ...updates } : s
                    ),
                })),

            setSelectedServer: (serverId) =>
                set({ selectedServerId: serverId, selectedToolName: null }),

            // Tool actions
            setTools: (serverId, tools) =>
                set((state) => ({
                    tools: { ...state.tools, [serverId]: tools },
                })),

            setSelectedTool: (toolName) => set({ selectedToolName: toolName }),

            // Execution actions
            addToHistory: (entry) =>
                set((state) => ({
                    history: [
                        {
                            ...entry,
                            id: crypto.randomUUID(),
                            timestamp: new Date(),
                        },
                        ...state.history,
                    ].slice(0, 100), // Keep last 100 entries for performance
                })),

            clearHistory: () => set({ history: [] }),

            setToolExecuting: (serverId, toolName, executing) =>
                set((state) => {
                    const toolKey = `${serverId}:${toolName}`;
                    if (executing) {
                        // Add to executing list if not already there
                        if (!state.executingTools.includes(toolKey)) {
                            return { executingTools: [...state.executingTools, toolKey] };
                        }
                    } else {
                        // Remove from executing list
                        return {
                            executingTools: state.executingTools.filter(key => key !== toolKey)
                        };
                    }
                    return state;
                }),

            // UI actions
            setSearchQuery: (query) => set({ searchQuery: query }),

            // Tool filter actions
            setToolFilterEnabled: (enabled) => set({ toolFilterEnabled: enabled }),

            updateToolFilterConfig: (config) =>
                set((state) => ({
                    toolFilterConfig: { ...state.toolFilterConfig, ...config },
                })),

            setToolFilterReady: (ready) => set({ toolFilterReady: ready }),
        }),
        {
            name: 'hoot-storage',
            version: 1,
            storage: customStorage,
            // Persist servers, tools cache, and preferences
            partialize: (state) => ({
                servers: state.servers.map((s) => ({
                    ...s,
                    connected: false, // Don't persist connection state
                    error: undefined, // Don't persist errors
                })),
                tools: state.tools, // Cache discovered tools
                history: state.history.slice(0, 50), // Keep last 50 history items
                selectedServerId: null, // Reset selected server on load
                selectedToolName: null, // Reset selected tool on load
                searchQuery: '', // Reset search on load
                executingTools: [], // Don't persist executing state
                toolFilterEnabled: state.toolFilterEnabled, // Persist filter enabled state
                toolFilterConfig: state.toolFilterConfig, // Persist filter config
                toolFilterReady: false, // Reset ready state on load
            }),
        }
    )
);

