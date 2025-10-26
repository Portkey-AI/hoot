import { memo, useState, useRef, useEffect } from 'react';
import { MoreVertical, RefreshCw, Key, LogOut, Trash2, Settings, Github, BookOpen, MessageCircle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import { NoServersState } from './EmptyState';
import { toast } from '../stores/toastStore';
import type { ServerConfig } from '../types';
import packageJson from '../../package.json';
import * as backendClient from '../lib/backendClient';
import './ServerSidebar.css';

interface ServerSidebarProps {
    onAddServer: () => void;
    onEditServer: (server: ServerConfig) => void;
}

export const ServerSidebar = memo(function ServerSidebar({ onAddServer, onEditServer }: ServerSidebarProps) {
    return (
        <div className="server-sidebar">
            <SidebarHeader onAddServer={onAddServer} />
            <ServersList onAddServer={onAddServer} onEditServer={onEditServer} />
            <SidebarFooter />
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

function ServersList({ onAddServer, onEditServer }: { onAddServer: () => void; onEditServer: (server: ServerConfig) => void }) {
    const servers = useAppStore((state) => state.servers);
    const selectedServerId = useAppStore((state) => state.selectedServerId);
    const setSelectedServer = useAppStore((state) => state.setSelectedServer);

    if (servers.length === 0) {
        return <NoServersState onAddServer={onAddServer} />;
    }

    return (
        <div className="servers-list">
            {servers.map((server) => (
                <ServerItem
                    key={server.id}
                    server={server}
                    isSelected={selectedServerId === server.id}
                    onClick={() => setSelectedServer(server.id)}
                    onEditServer={onEditServer}
                />
            ))}
        </div>
    );
}

interface ServerItemProps {
    server: ServerConfig;
    isSelected: boolean;
    onClick: () => void;
    onEditServer: (server: ServerConfig) => void;
}

const ServerItem = memo(function ServerItem({
    server,
    isSelected,
    onClick,
    onEditServer,
}: ServerItemProps) {
    const tools = useAppStore((state) => state.tools[server.id]);
    const removeServer = useAppStore((state) => state.removeServer);
    const updateServer = useAppStore((state) => state.updateServer);
    const setTools = useAppStore((state) => state.setTools);
    const { connect, disconnect } = useMCPConnection();

    const [showDropdown, setShowDropdown] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showDropdown]);

    // Get transport badge display
    const getTransportBadge = () => {
        const transportIcons = {
            'http': '🌐',
            'sse': '⚡',
            'stdio': '💻',
        };

        return (
            <span className="transport-badge" data-transport={server.transport}>
                {transportIcons[server.transport]} {server.transport.toUpperCase()}
            </span>
        );
    };

    // Get authentication type display
    const getAuthBadge = () => {
        if (!server.auth || server.auth.type === 'none') {
            return null;
        }

        const authType = server.auth.type;
        const authLabels = {
            'headers': 'API Key',
            'oauth': 'OAuth',
        };

        const authIcons = {
            'headers': '🔑',
            'oauth': '🔐',
        };

        return (
            <span className="auth-badge" data-auth-type={authType}>
                {authIcons[authType]} {authLabels[authType]}
            </span>
        );
    };

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(!showDropdown);
    };

    const handleRefreshTools = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        if (!server.connected) {
            return;
        }

        setIsRefreshing(true);
        toast.info(`Refreshing ${server.name}...`, undefined, 1500);

        try {
            const { mcpClient } = await import('../lib/mcpClient');
            const freshTools = await mcpClient.listTools(server.id);
            setTools(server.id, freshTools);
            console.log(`✓ Refreshed tools for ${server.name} - ${freshTools.length} tools`);
            // Success is subtle - no toast, just console log
        } catch (error) {
            console.error('Failed to refresh tools:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to refresh ${server.name}`, errorMessage);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleClearAuth = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        if (!server.auth) return;

        // Clear OAuth tokens from backend database if OAuth
        if (server.auth.type === 'oauth') {
            try {
                await backendClient.clearOAuthTokens(server.id);
                console.log(`🔐 Cleared OAuth credentials from backend for ${server.name}`);
            } catch (error) {
                console.error('Failed to clear OAuth tokens from backend:', error);
                // Continue anyway - clear frontend state
            }

            // Also clear any stale frontend state (legacy)
            localStorage.removeItem(`oauth_tokens_${server.id}`);
            localStorage.removeItem(`oauth_client_${server.id}`);
            sessionStorage.removeItem(`oauth_verifier_${server.id}`);
        }

        // Disconnect server
        if (server.connected) {
            await disconnect(server.id);
        }

        // Clear auth from config
        updateServer(server.id, { auth: undefined });
    };

    const handleReAuthenticate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        // Disconnect first
        if (server.connected) {
            await disconnect(server.id);
        }

        // Clear OAuth tokens from backend database if OAuth
        if (server.auth?.type === 'oauth') {
            try {
                await backendClient.clearOAuthTokens(server.id);
                console.log(`🔐 Cleared OAuth tokens from backend for re-authentication: ${server.name}`);
            } catch (error) {
                console.error('Failed to clear OAuth tokens from backend:', error);
                // Continue anyway
            }

            // Also clear any stale frontend state (legacy)
            localStorage.removeItem(`oauth_tokens_${server.id}`);
            sessionStorage.removeItem(`oauth_verifier_${server.id}`);
        }

        // Reconnect to trigger new auth flow
        await connect(server);
    };

    const handleConnect = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        // If OAuth is configured, clear any stale tokens to force a fresh OAuth flow
        if (server.auth?.type === 'oauth') {
            localStorage.removeItem(`oauth_tokens_${server.id}`);
            sessionStorage.removeItem(`oauth_verifier_${server.id}`);
            // Clear any stale redirect protection
            sessionStorage.removeItem('oauth_last_redirect');
            // Store server ID for OAuth callback
            sessionStorage.setItem('oauth_server_id', server.id);
            console.log('🔐 Starting fresh OAuth flow...');
        }

        // Connect will trigger OAuth flow if needed (via UnauthorizedError)
        await connect(server);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);
        onEditServer(server);
    };

    const handleDisconnect = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        if (server.connected) {
            await disconnect(server.id);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        if (!confirm(`Delete "${server.name}"? This will remove all cached tools.`)) {
            return;
        }

        if (server.connected) {
            await disconnect(server.id);
        }
        removeServer(server.id);
    };

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
            <div className="server-footer">
                <div className="server-meta">
                    {getTransportBadge()}
                    {getAuthBadge()}
                </div>
                <div className="server-actions" ref={dropdownRef}>
                    <button
                        className="action-btn menu-btn"
                        onClick={handleMenuToggle}
                        title="Server actions"
                    >
                        <MoreVertical size={14} />
                    </button>

                    {showDropdown && (
                        <div className="dropdown-menu">
                            {!server.connected ? (
                                <button
                                    className="dropdown-item"
                                    onClick={handleConnect}
                                >
                                    <RefreshCw size={14} />
                                    <span>Connect</span>
                                </button>
                            ) : (
                                <button
                                    className="dropdown-item"
                                    onClick={handleRefreshTools}
                                    disabled={isRefreshing}
                                >
                                    <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
                                    <span>Refresh Tools</span>
                                </button>
                            )}

                            {server.auth && server.auth.type !== 'none' && (
                                <>
                                    <button
                                        className="dropdown-item"
                                        onClick={handleReAuthenticate}
                                        disabled={!server.connected}
                                    >
                                        <Key size={14} />
                                        <span>Re-authenticate</span>
                                    </button>

                                    <button
                                        className="dropdown-item"
                                        onClick={handleClearAuth}
                                    >
                                        <LogOut size={14} />
                                        <span>Clear Auth</span>
                                    </button>
                                </>
                            )}

                            {server.connected && (
                                <button
                                    className="dropdown-item"
                                    onClick={handleDisconnect}
                                >
                                    <LogOut size={14} />
                                    <span>Disconnect</span>
                                </button>
                            )}

                            <div className="dropdown-divider" />

                            <button
                                className="dropdown-item"
                                onClick={handleEdit}
                            >
                                <Settings size={14} />
                                <span>Edit Server</span>
                            </button>

                            <button
                                className="dropdown-item danger"
                                onClick={handleDelete}
                            >
                                <Trash2 size={14} />
                                <span>Delete Server</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

function SidebarFooter() {
    const links = [
        {
            href: 'https://github.com/portkey-ai/hoot',
            icon: Github,
            label: 'GitHub',
        },
        {
            href: 'https://portkey.ai/docs/hoot',
            icon: BookOpen,
            label: 'Documentation',
        },
        {
            href: 'https://portkey.ai/community',
            icon: MessageCircle,
            label: 'Discord',
        },
    ];

    return (
        <div className="sidebar-footer">
            <div className="footer-links">
                {links.map((link) => (
                    <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                        title={link.label}
                    >
                        <link.icon size={16} />
                    </a>
                ))}
            </div>
            <div className="footer-version">v{packageJson.version}</div>
        </div>
    );
}

