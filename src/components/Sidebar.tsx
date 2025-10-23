import { memo, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import type { ServerConfig } from '../types';
import './Sidebar.css';

interface SidebarProps {
    onAddServer: () => void;
}

export const Sidebar = memo(function Sidebar({ onAddServer }: SidebarProps) {
    return (
        <div className="sidebar">
            <SidebarHeader onAddServer={onAddServer} />
            <ServersList />
            <ToolsList />
        </div>
    );
});

function SidebarHeader({ onAddServer }: { onAddServer: () => void }) {
    return (
        <div className="sidebar-header">
            <div className="logo">
                <span className="logo-icon">🦉</span>
                <h1>Hoot</h1>
            </div>
            <p className="tagline">MCP Testing Tool</p>
            <button className="add-server-btn" onClick={onAddServer}>
                <span className="btn-icon">+</span>
                <span>Add Server</span>
            </button>
        </div>
    );
}

function ServersList() {
    const servers = useAppStore((state) => state.servers);
    const selectedServerId = useAppStore((state) => state.selectedServerId);
    const setSelectedServer = useAppStore((state) => state.setSelectedServer);

    return (
        <div className="servers-list">
            {servers.map((server) => (
                <ServerItem
                    key={server.id}
                    server={server}
                    isSelected={selectedServerId === server.id}
                    onClick={() => setSelectedServer(server.id)}
                />
            ))}
        </div>
    );
}

interface ServerItemProps {
    server: ServerConfig;
    isSelected: boolean;
    onClick: () => void;
}

const ServerItem = memo(function ServerItem({
    server,
    isSelected,
    onClick,
}: ServerItemProps) {
    const tools = useAppStore((state) => state.tools[server.id]);

    return (
        <div
            className={`server-item ${isSelected ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="server-header">
                <div
                    className={`status-dot ${server.connected ? 'connected' : 'disconnected'}`}
                    title={server.error || (server.connected ? 'Connected' : 'Disconnected')}
                />
                <span className="server-name">{server.name}</span>
                <span className="tool-count">{tools?.length || 0}</span>
            </div>
            <div className="server-transport">{server.transport}</div>
        </div>
    );
});

function ToolsList() {
    const selectedServerId = useAppStore((state) => state.selectedServerId);
    const allTools = useAppStore((state) => state.tools);
    const selectedToolName = useAppStore((state) => state.selectedToolName);
    const setSelectedTool = useAppStore((state) => state.setSelectedTool);
    const searchQuery = useAppStore((state) => state.searchQuery);
    const setSearchQuery = useAppStore((state) => state.setSearchQuery);

    // Get tools for selected server - memoized to prevent re-renders
    const tools = useMemo(() => {
        if (!selectedServerId) return [];
        return allTools[selectedServerId] || [];
    }, [selectedServerId, allTools]);

    if (!selectedServerId || tools.length === 0) {
        return null;
    }

    const filteredTools = tools.filter(
        (tool) =>
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="tools-section">
            <input
                type="text"
                className="search-box"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {filteredTools.map((tool) => (
                <div
                    key={tool.name}
                    className={`tool-item ${selectedToolName === tool.name ? 'active' : ''}`}
                    onClick={() => setSelectedTool(tool.name)}
                >
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-description">{tool.description}</div>
                </div>
            ))}
        </div>
    );
}

