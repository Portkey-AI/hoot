import { memo, useState, useRef, useEffect } from 'react';
import { MoreVertical, RefreshCw, Key, LogOut, Trash2, Settings } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import { useURLState } from '../hooks/useURLState';
import { NoServersState } from './EmptyState';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from '../stores/toastStore';
import type { ServerConfig } from '../types';
import * as backendClient from '../lib/backendClient';
import './ServerSidebar.css';

interface ServerSidebarProps {
    onAddServer: () => void;
    onEditServer: (server: ServerConfig) => void;
}

export const ServerSidebar = memo(function ServerSidebar({ onAddServer, onEditServer }: ServerSidebarProps) {
    return (
        <div className="server-sidebar">
            <div className="sidebar-actions">
                <button type="button" className="add-server-btn" onClick={onAddServer}>
                    <span className="btn-icon">+</span>
                    <span>Add Server</span>
                </button>
            </div>
            <ServersList onAddServer={onAddServer} onEditServer={onEditServer} />
        </div>
    );
});

function ServersList({ onAddServer, onEditServer }: { onAddServer: () => void; onEditServer: (server: ServerConfig) => void }) {
    const servers = useAppStore((state) => state.servers);
    const selectedServerId = useAppStore((state) => state.selectedServerId);
    const setSelectedServer = useAppStore((state) => state.setSelectedServer);
    const { updateURL } = useURLState();

    const handleServerSelect = (serverId: string) => {
        setSelectedServer(serverId);
        // Update URL with selected server
        updateURL({ server: serverId, tool: null }); // Clear tool when switching servers
    };

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
                    onClick={() => handleServerSelect(server.id)}
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [faviconUrl, setFaviconUrl] = useState<string | null>(
        // Check if we have a cached result (including "no favicon found")
        server.faviconUrl !== undefined ? server.faviconUrl : null
    );
    const [faviconError, setFaviconError] = useState(server.faviconUrl === null);
    const [faviconAttempts, setFaviconAttempts] = useState<string[]>([]);
    const [currentAttemptIndex, setCurrentAttemptIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Build list of favicon URLs to try (with async HTML parsing fallback)
    // Only run if we don't have a cached result (including "no favicon" cache)
    useEffect(() => {
        // If we have a cached result (either a URL or explicit null), use it
        if (server.faviconUrl !== undefined) {
            if (server.faviconUrl === null) {
                // Cached as "no favicon found"
                setFaviconUrl(null);
                setFaviconError(true);
            } else {
                // Cached favicon URL found
                setFaviconUrl(server.faviconUrl);
                setFaviconError(false);
            }
            return;
        }

        if (!server.url) return;

        const oauthLogoUri = server.auth?.oauthServerMetadata?.logo_uri;

        // Start with synchronous attempts
        const syncAttempts: string[] = [];

        // 1. OAuth logo_uri
        if (oauthLogoUri) {
            try {
                new URL(oauthLogoUri);
                syncAttempts.push(oauthLogoUri);
            } catch {
                // Invalid URL, skip
            }
        }

        // 2. Specific domain with all formats
        try {
            const urlObj = new URL(server.url);
            const domain = urlObj.origin;
            syncAttempts.push(`${domain}/favicon.ico`);
            syncAttempts.push(`${domain}/favicon.png`);
            syncAttempts.push(`${domain}/favicon.svg`);
            syncAttempts.push(`${domain}/favicon`);

            // 3. Primary domain with all formats (if different from subdomain)
            const parts = urlObj.hostname.split('.');
            if (parts.length > 2) {
                const primaryDomain = parts.slice(-2).join('.');
                const primaryOrigin = `${urlObj.protocol}//${primaryDomain}`;
                if (primaryOrigin !== domain) {
                    syncAttempts.push(`${primaryOrigin}/favicon.ico`);
                    syncAttempts.push(`${primaryOrigin}/favicon.png`);
                    syncAttempts.push(`${primaryOrigin}/favicon.svg`);
                    syncAttempts.push(`${primaryOrigin}/favicon`);
                }
            }
        } catch (error) {
            console.warn(`Failed to parse URL for ${server.name}:`, error);
        }

        // Set sync attempts first for immediate display
        setFaviconAttempts(syncAttempts);
        setCurrentAttemptIndex(0);
        setFaviconError(false);

        if (syncAttempts.length > 0) {
            setFaviconUrl(syncAttempts[0]);
        }

        // Then fetch HTML-based favicons asynchronously
        import('../lib/faviconUtils').then(({ getAllFaviconUrls }) => {
            getAllFaviconUrls(server.url, oauthLogoUri).then((allUrls) => {
                // Only update if we got more URLs than the sync attempts
                if (allUrls.length > syncAttempts.length) {
                    setFaviconAttempts(allUrls);
                }
            }).catch((error) => {
                console.warn(`Failed to get all favicon URLs for ${server.name}:`, error);
            });
        });
    }, [server.url, server.name, server.auth?.oauthServerMetadata?.logo_uri, server.faviconUrl]);

    // Handle favicon load errors by trying the next URL
    const handleFaviconError = () => {
        const nextIndex = currentAttemptIndex + 1;
        if (nextIndex < faviconAttempts.length) {
            setCurrentAttemptIndex(nextIndex);
            setFaviconUrl(faviconAttempts[nextIndex]);
            setFaviconError(false);
        } else {
            // All attempts failed - cache this result as null
            setFaviconError(true);
            updateServer(server.id, {
                faviconUrl: null, // Explicitly cache "no favicon found"
            });
        }
    };

    // Cache successful favicon URL to server config
    const handleFaviconLoad = () => {
        if (faviconUrl && faviconUrl !== server.faviconUrl) {
            // Cache the successful URL in the server config
            updateServer(server.id, {
                faviconUrl: faviconUrl,
            });
        }
    };

    // Fetch OAuth metadata when server connects
    useEffect(() => {
        // Only fetch if:
        // 1. Server is connected
        // 2. Server uses OAuth
        // 3. We don't already have the metadata cached
        if (server.connected &&
            server.auth?.type === 'oauth' &&
            !server.auth?.oauthServerMetadata) {
            // Fetch OAuth metadata for logo_uri
            backendClient.getOAuthMetadata(server.id).then((metadata) => {
                if (metadata?.logo_uri && server.auth) {
                    // Update server config with OAuth metadata
                    updateServer(server.id, {
                        auth: {
                            ...server.auth,
                            oauthServerMetadata: metadata,
                        },
                    });
                }
            }).catch((error) => {
                // Silently ignore 404 errors - server not connected yet
                if (error && !error.message?.includes('404')) {
                    console.warn('Failed to fetch OAuth metadata:', error);
                }
            });
        }
    }, [server.connected, server.id, server.auth?.type, server.auth?.oauthServerMetadata, updateServer]);
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
        const authLabels: Record<string, string> = {
            'headers': 'API Key',
            'oauth': 'OAuth',
            'oauth_client_credentials': 'OAuth Client',
        };

        const authIcons: Record<string, string> = {
            'headers': '🔑',
            'oauth': '🔐',
            'oauth_client_credentials': '🔐',
        };

        return (
            <span className="auth-badge" data-auth-type={authType}>
                {authIcons[authType] || '🔑'} {authLabels[authType] || 'Auth'}
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

        const authType = server.auth.type;

        // Clear OAuth tokens from backend database if OAuth
        if (authType === 'oauth' || authType === 'oauth_client_credentials') {
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

        // Keep auth type marker so reconnecting knows what auth is needed, but clear all credentials
        // This preserves the "this server needs X auth" knowledge while removing sensitive data
        if (authType === 'oauth') {
            // User-based OAuth: keep type marker only
            updateServer(server.id, {
                auth: {
                    type: 'oauth' as const
                    // All sensitive data cleared (client_id, client_secret, tokens, etc.)
                }
            });
        } else if (authType === 'oauth_client_credentials') {
            // Client credentials OAuth: keep type marker only
            updateServer(server.id, {
                auth: {
                    type: 'oauth_client_credentials' as const
                    // All sensitive data cleared (client_id, client_secret, token_url, etc.)
                }
            });
        } else if (authType === 'headers') {
            // Header-based auth: keep type marker only
            updateServer(server.id, {
                auth: {
                    type: 'headers' as const
                    // All header values cleared
                }
            });
        } else {
            // For 'none' or unknown types, remove everything
            updateServer(server.id, { auth: undefined });
        }
    };

    const handleReAuthenticate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);

        if (!server.auth) return;

        const authType = server.auth.type;

        // Disconnect first
        if (server.connected) {
            await disconnect(server.id);
        }

        // Clear credentials based on auth type
        if (authType === 'oauth' || authType === 'oauth_client_credentials') {
            // Clear OAuth tokens from backend database
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

            // CRITICAL: For user-based OAuth, store server ID for OAuth callback
            if (authType === 'oauth') {
                sessionStorage.setItem('oauth_server_id', server.id);
                console.log('🔐 Starting re-authentication OAuth flow...');
            } else {
                console.log('🔐 Starting re-authentication for client credentials...');
            }
        } else if (authType === 'headers') {
            console.log('🔐 Re-authentication for header-based auth (will prompt for new headers on next connect)...');
            // For header auth, we keep the auth type marker but credentials are already cleared
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

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (server.connected) {
            await disconnect(server.id);
        }
        removeServer(server.id);
        setShowDeleteConfirm(false);
    };

    return (
        <div
            className={`server-item ${isSelected ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="server-header">
                {faviconUrl && !faviconError ? (
                    <div className="server-favicon-container">
                        <img
                            src={faviconUrl}
                            alt={`${server.name} favicon`}
                            className="server-favicon"
                            onError={handleFaviconError}
                            onLoad={handleFaviconLoad}
                        />
                        <div
                            className={`favicon-status-dot ${server.connected ? 'connected' : 'disconnected'}`}
                            title={server.error || (server.connected ? 'Connected' : 'Disconnected')}
                        />
                    </div>
                ) : (
                    <div
                        className={`status-dot ${server.connected ? 'connected' : 'disconnected'}`}
                        title={server.error || (server.connected ? 'Connected' : 'Disconnected')}
                    />
                )}
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
                        type="button"
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
                                    type="button"
                                    className="dropdown-item"
                                    onClick={handleConnect}
                                >
                                    <RefreshCw size={14} />
                                    <span>Connect</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
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
                                        type="button"
                                        className="dropdown-item"
                                        onClick={handleReAuthenticate}
                                        disabled={!server.connected}
                                    >
                                        <Key size={14} />
                                        <span>Re-authenticate</span>
                                    </button>

                                    <button
                                        type="button"
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
                                    type="button"
                                    className="dropdown-item"
                                    onClick={handleDisconnect}
                                >
                                    <LogOut size={14} />
                                    <span>Disconnect</span>
                                </button>
                            )}

                            <div className="dropdown-divider" />

                            <button
                                type="button"
                                className="dropdown-item"
                                onClick={handleEdit}
                            >
                                <Settings size={14} />
                                <span>Edit Server</span>
                            </button>

                            <button
                                type="button"
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

            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Server"
                    message={`Delete "${server.name}"? This will remove all cached tools and disconnect the server.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={confirmDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    danger
                />
            )}
        </div>
    );
});

