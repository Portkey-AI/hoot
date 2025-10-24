import { memo, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { useToolStateStore } from '../stores/toolStateStore';
import { NoToolsState, EmptyState } from './EmptyState';
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

    // Get tool state for showing saved parameters indicator
    const getToolParameters = useToolStateStore((state) => state.getToolParameters);

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
            <div className="tools-header">
                <h3>Tools</h3>
                <span className="tools-count">{tools.length}</span>
            </div>

            <div className="tools-search">
                <input
                    type="text"
                    className="search-box"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
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
                                className={`tool-item ${selectedToolName === tool.name ? 'active' : ''} ${isExecuting ? 'executing' : ''}`}
                                onClick={() => setSelectedTool(tool.name)}
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

