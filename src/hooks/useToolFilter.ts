import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import {
    initializeToolFilter,
    resetToolFilter
} from '../lib/toolFilter';

/**
 * Custom hook to manage tool filter lifecycle
 * Automatically initializes/reinitializes when servers or tools change
 * Uses debouncing to avoid re-initializing during rapid connection sequences
 */
export function useToolFilter() {
    const servers = useAppStore((state) => state.servers);
    const tools = useAppStore((state) => state.tools);
    const toolFilterEnabled = useAppStore((state) => state.toolFilterEnabled);
    const toolFilterReady = useAppStore((state) => state.toolFilterReady);
    const setToolFilterReady = useAppStore((state) => state.setToolFilterReady);

    // Track previous state to detect changes
    const prevServersRef = useRef<string>('');
    const prevToolsRef = useRef<string>('');
    const isInitializing = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Serialize current state for comparison (outside useEffect to track changes)
    const currentServersKey = servers
        .filter(s => s.connected)
        .map(s => s.id)
        .sort()
        .join(',');

    const currentToolsKey = Object.keys(tools)
        .sort()
        .map(serverId => `${serverId}:${tools[serverId].length}`)
        .join(',');

    useEffect(() => {
        // Only initialize if filtering is enabled
        if (!toolFilterEnabled) {
            setToolFilterReady(false);
            return;
        }

        // Check if servers or tools have changed
        const serversChanged = currentServersKey !== prevServersRef.current;
        const toolsChanged = currentToolsKey !== prevToolsRef.current;

        if (!serversChanged && !toolsChanged) {
            // No changes detected, nothing to do
            return;
        }

        // Clear any pending debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // Update refs
        prevServersRef.current = currentServersKey;
        prevToolsRef.current = currentToolsKey;

        // Don't initialize if no connected servers
        const connectedServers = servers.filter(s => s.connected);
        if (connectedServers.length === 0) {
            console.log('[useToolFilter] No connected servers, skipping initialization');
            setToolFilterReady(false);
            return;
        }

        // Don't initialize if no tools
        const totalTools = Object.values(tools).flat().length;
        if (totalTools === 0) {
            console.log('[useToolFilter] No tools available, skipping initialization');
            setToolFilterReady(false);
            return;
        }

        // Debounce initialization to wait for servers to stabilize (500ms is enough)
        console.log('[useToolFilter] Scheduling filter initialization in 500ms...');

        // Capture current values to avoid stale closures
        const serversToInitialize = [...connectedServers];
        const toolsToInitialize = { ...tools };
        const toolCountToLog = totalTools;

        debounceTimerRef.current = setTimeout(() => {
            // Prevent concurrent initializations
            if (isInitializing.current) {
                console.log('[useToolFilter] Initialization already in progress');
                return;
            }

            // Initialize the filter
            isInitializing.current = true;
            console.log('[useToolFilter] Initializing filter with', {
                servers: serversToInitialize.length,
                tools: toolCountToLog,
            });

            // Reset and reinitialize
            resetToolFilter();

            initializeToolFilter(serversToInitialize, toolsToInitialize)
                .then((result) => {
                    if (result.success) {
                        console.log('[useToolFilter] Filter initialized successfully');
                        setToolFilterReady(true);
                    } else {
                        console.warn('[useToolFilter] Filter initialization failed:', result.error);
                        setToolFilterReady(false);
                    }
                })
                .catch((error) => {
                    console.error('[useToolFilter] Filter initialization error:', error);
                    setToolFilterReady(false);
                })
                .finally(() => {
                    isInitializing.current = false;
                });
        }, 500); // Wait 500ms after last change

        // No cleanup needed - timer should complete
    }, [currentServersKey, currentToolsKey, toolFilterEnabled, setToolFilterReady]);

    return {
        isReady: toolFilterReady, // Use the Zustand state instead of calling isFilterReady()
        isEnabled: toolFilterEnabled,
    };
}

