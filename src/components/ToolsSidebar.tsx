import { memo, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { useToolStateStore } from '../stores/toolStateStore';
import { useURLState } from '../hooks/useURLState';
import { NoToolsState, EmptyState } from './EmptyState';
import { getShortcutHint } from '../hooks/useKeyboardShortcuts';
import { Server } from 'lucide-react';
import './ToolsSidebar.css';

export const ToolsSidebar = memo(function ToolsSidebar() {
    const selectedServerId = useAppStore((state) => state.selectedServerId);
    const allTools = useAppStore((state) => state.tools);
    const selectedToolName = useAppStore((state) => state.selectedToolName);
    const setSelectedTool = useAppStore((state) => state.setSelectedTool);
    const searchQuery = useAppStore((state) => state.searchQuery);
    const setSearchQuery = useAppStore((state) => state.setSearchQuery);
    const executingTools = useAppStore((state) => state.executingTools);
    const { updateURL } = useURLState();

    // Get tool state for showing saved parameters indicator
    const getToolParameters = useToolStateStore((state) => state.getToolParameters);

    // Reference to search input for focus management
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Handle tool selection with URL sync
    const handleToolSelect = useCallback((toolName: string) => {
        setSelectedTool(toolName);
        updateURL({ tool: toolName });
    }, [setSelectedTool, updateURL]);

    // Handle search with URL sync (debounced in practice, but simple here)
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        // Update URL with search query (empty string clears it)
        updateURL({ search: query || null }, true); // Use replace for search
    }, [setSearchQuery, updateURL]);

    // Handle Escape key to defocus search
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            e.currentTarget.blur();
        }
    }, []);

    // Get tools for selected server - memoized to prevent re-renders
    const tools = useMemo(() => {
        if (!selectedServerId) return [];
        return allTools[selectedServerId] || [];
    }, [selectedServerId, allTools]);

    const filteredTools = useMemo(() => {
        if (!searchQuery) return tools;
        return tools.filter(
            (tool) =>
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [tools, searchQuery]);

    if (!selectedServerId) {
        return (
            <div className="tools-sidebar">
                <EmptyState
                    icon={<Server size={48} />}
                    title="No server selected"
                    description="Select a server from the left to view its tools."
                />
            </div>
        );
    }

    if (tools.length === 0) {
        return (
            <div className="tools-sidebar">
                <NoToolsState />
            </div>
        );
    }

    return (
        <div className="tools-sidebar">
            <div className="tools-search">
                <input
                    ref={searchInputRef}
                    type="text"
                    className="search-box"
                    placeholder={`Search ${tools.length} tools...`}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    title={getShortcutHint('Search tools', { key: '/' })}
                />
                <kbd className="search-shortcut-hint">/</kbd>
            </div>

            <div className="nav-hint">
                <div className="nav-hint-keys">
                    <kbd>↑</kbd>
                    <kbd>↓</kbd>
                </div>
            </div>

            <div className="tools-list">
                {filteredTools.length === 0 ? (
                    <div className="no-results">
                        <p>No tools match "{searchQuery}"</p>
                    </div>
                ) : (
                    filteredTools.map((tool) => {
                        const hasParameters = selectedServerId ? getToolParameters(selectedServerId, tool.name) : undefined;
                        const toolKey = selectedServerId ? `${selectedServerId}:${tool.name}` : tool.name;
                        const isExecuting = executingTools.includes(toolKey);

                        return (
                            <div
                                key={tool.name}
                                data-tool-name={tool.name}
                                className={`tool-item ${selectedToolName === tool.name ? 'active' : ''} ${isExecuting ? 'executing' : ''}`}
                                onClick={() => handleToolSelect(tool.name)}
                            >
                                <div className="tool-name">
                                    {isExecuting && <span className="tool-pulse" />}
                                    {tool.name}
                                    {hasParameters && (
                                        <span
                                            className="tool-has-params-dot"
                                            title="Has saved parameters"
                                        />
                                    )}
                                </div>
                                <div className="tool-description">{tool.description}</div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
});

