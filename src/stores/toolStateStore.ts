import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Tool state for tracking execution history per server
 */
export interface ToolState {
    lastExecuted?: Date;
    executionCount: number;
}

/**
 * Stored parameter values for a tool
 */
export interface ToolParameterValues {
    [parameterName: string]: unknown;
}

/**
 * Server-scoped tool data
 */
export interface ServerToolData {
    // Track which tools have been executed and when
    toolStates: {
        [toolName: string]: ToolState;
    };
    // Store parameter values for each tool
    toolParameters: {
        [toolName: string]: ToolParameterValues;
    };
}

/**
 * Main state interface
 */
interface ToolStateStore {
    // All data is scoped by server ID
    serverData: {
        [serverId: string]: ServerToolData;
    };

    // Actions
    recordToolExecution: (serverId: string, toolName: string) => void;
    saveToolParameters: (serverId: string, toolName: string, parameters: ToolParameterValues) => void;
    getToolParameters: (serverId: string, toolName: string) => ToolParameterValues | undefined;
    getToolState: (serverId: string, toolName: string) => ToolState | undefined;
    clearServerData: (serverId: string) => void;
    clearToolParameters: (serverId: string, toolName: string) => void;
}

// Custom storage with Date handling
const customStorage = createJSONStorage<Pick<ToolStateStore, 'serverData'>>(() => ({
    getItem: (name) => {
        const str = localStorage.getItem(name);
        if (!str) return null;

        const parsed = JSON.parse(str);

        // Convert date strings back to Date objects
        if (parsed.state?.serverData) {
            Object.keys(parsed.state.serverData).forEach((serverId) => {
                const serverData = parsed.state.serverData[serverId];
                if (serverData.toolStates) {
                    Object.keys(serverData.toolStates).forEach((toolName) => {
                        const state = serverData.toolStates[toolName];
                        if (state.lastExecuted) {
                            state.lastExecuted = new Date(state.lastExecuted);
                        }
                    });
                }
            });
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

/**
 * Store for maintaining tool execution state and parameter values
 * All data is scoped by server ID and stored in localStorage
 */
export const useToolStateStore = create<ToolStateStore>()(
    persist(
        (set, get) => ({
            serverData: {},

            recordToolExecution: (serverId: string, toolName: string) => {
                set((state) => {
                    const serverData = state.serverData[serverId] || {
                        toolStates: {},
                        toolParameters: {},
                    };

                    const toolState = serverData.toolStates[toolName] || {
                        executionCount: 0,
                    };

                    return {
                        serverData: {
                            ...state.serverData,
                            [serverId]: {
                                ...serverData,
                                toolStates: {
                                    ...serverData.toolStates,
                                    [toolName]: {
                                        lastExecuted: new Date(),
                                        executionCount: toolState.executionCount + 1,
                                    },
                                },
                            },
                        },
                    };
                });
            },

            saveToolParameters: (serverId: string, toolName: string, parameters: ToolParameterValues) => {
                set((state) => {
                    const serverData = state.serverData[serverId] || {
                        toolStates: {},
                        toolParameters: {},
                    };

                    return {
                        serverData: {
                            ...state.serverData,
                            [serverId]: {
                                ...serverData,
                                toolParameters: {
                                    ...serverData.toolParameters,
                                    [toolName]: parameters,
                                },
                            },
                        },
                    };
                });
            },

            getToolParameters: (serverId: string, toolName: string) => {
                const state = get();
                return state.serverData[serverId]?.toolParameters[toolName];
            },

            getToolState: (serverId: string, toolName: string) => {
                const state = get();
                return state.serverData[serverId]?.toolStates[toolName];
            },

            clearServerData: (serverId: string) => {
                set((state) => {
                    const { [serverId]: _, ...rest } = state.serverData;
                    return {
                        serverData: rest,
                    };
                });
            },

            clearToolParameters: (serverId: string, toolName: string) => {
                set((state) => {
                    const serverData = state.serverData[serverId];
                    if (!serverData) return state;

                    const { [toolName]: _, ...restParameters } = serverData.toolParameters;

                    return {
                        serverData: {
                            ...state.serverData,
                            [serverId]: {
                                ...serverData,
                                toolParameters: restParameters,
                            },
                        },
                    };
                });
            },
        }),
        {
            name: 'hoot-tool-state',
            version: 1,
            storage: customStorage,
        }
    )
);

