import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import { toast } from '../stores/toastStore';
import type { TransportType, AuthConfig } from '../types';
import { Button } from './ui';
import './Modal.css';

interface ServerConfigImport {
    name: string;
    transport: TransportType;
    command?: string;
    url?: string;
    auth?: AuthConfig;
}

/**
 * Parses a "Try in Hoot" URL and extracts server configuration
 * 
 * URL Format:
 * - Hash-based: #/try?config=<base64-encoded-json>
 * - Query-based: ?try=<base64-encoded-json>
 * 
 * Config JSON Format:
 * {
 *   "name": "Weather MCP Server",
 *   "transport": "http",
 *   "url": "http://localhost:3000",
 *   "auth": {
 *     "type": "headers",
 *     "headers": {
 *       "Authorization": "Bearer token"
 *     }
 *   }
 * }
 */
function parseTryInHootURL(): ServerConfigImport | null {
    try {
        // Check hash-based URL first (#/try?config=...)
        const hash = window.location.hash;
        if (hash.startsWith('#/try')) {
            const hashUrl = new URL(window.location.href.replace('#/try', ''));
            const configParam = hashUrl.searchParams.get('config');
            if (configParam) {
                const decoded = atob(configParam);
                const config = JSON.parse(decoded);
                return validateServerConfig(config);
            }
        }

        // Check query-based URL (?try=...)
        const searchParams = new URLSearchParams(window.location.search);
        const tryParam = searchParams.get('try');
        if (tryParam) {
            const decoded = atob(tryParam);
            const config = JSON.parse(decoded);
            return validateServerConfig(config);
        }

        return null;
    } catch (error) {
        console.error('Failed to parse Try in Hoot URL:', error);
        toast.error('Invalid Link', 'The "Try in Hoot" link is malformed or invalid');
        return null;
    }
}

/**
 * Validates and normalizes server configuration from external sources
 */
function validateServerConfig(config: any): ServerConfigImport | null {
    if (!config || typeof config !== 'object') {
        throw new Error('Config must be an object');
    }

    // Simple mode: just URL (let Hoot auto-detect everything)
    if (config.url && !config.name && !config.transport) {
        return {
            name: '', // Will be auto-detected
            transport: 'http' as TransportType, // Placeholder, will auto-detect
            url: config.url,
            ...(config.auth && { auth: config.auth }),
        };
    }

    // Validate required fields for full mode
    if (!config.name || typeof config.name !== 'string') {
        throw new Error('Config must include a "name" string (or just provide URL for auto-detection)');
    }

    if (!config.transport || !['stdio', 'sse', 'http'].includes(config.transport)) {
        throw new Error('Config must include a valid "transport" (stdio, sse, or http)');
    }

    // Validate transport-specific fields
    if (config.transport === 'stdio' && !config.command) {
        throw new Error('stdio transport requires a "command" field');
    }

    if ((config.transport === 'sse' || config.transport === 'http') && !config.url) {
        throw new Error('SSE/HTTP transport requires a "url" field');
    }

    // Validate auth if present
    if (config.auth) {
        if (!config.auth.type || !['none', 'headers', 'oauth', 'client_credentials'].includes(config.auth.type)) {
            console.warn(`Unknown auth type: ${config.auth.type}, but allowing it for future compatibility`);
        }

        if (config.auth.type === 'headers' && !config.auth.headers) {
            throw new Error('Header auth requires "headers" object');
        }
    }

    return {
        name: config.name,
        transport: config.transport,
        ...(config.command && { command: config.command }),
        ...(config.url && { url: config.url }),
        ...(config.auth && { auth: config.auth }),
    };
}

interface ConfirmAddServerProps {
    config: ServerConfigImport;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmAddServer({ config, onConfirm, onCancel }: ConfirmAddServerProps) {
    return createPortal(
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '520px' }}>
                <div className="modal-header">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            fontSize: '28px',
                            filter: 'drop-shadow(0 2px 8px rgba(92, 207, 230, 0.3))'
                        }}>🦉</span>
                        <h2 style={{ margin: 0 }}>Try in Hoot</h2>
                    </div>
                    <p style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 400,
                        marginTop: '4px',
                        marginBottom: '24px'
                    }}>
                        Add this server to get started
                    </p>
                </div>

                <div className="modal-body">
                    <div style={{
                        background: 'var(--theme-bg-tertiary)',
                        padding: '20px',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '20px',
                        border: '2px solid color-mix(in srgb, var(--theme-accent-primary) 30%, transparent)'
                    }}>
                        <ServerDetail
                            label="Server Name"
                            value={config.name}
                            icon="🏷️"
                        />

                        <ServerDetail
                            label="Transport"
                            value={config.transport.toUpperCase()}
                            icon="🔌"
                            badge
                        />

                        {config.url && (
                            <ServerDetail
                                label="URL"
                                value={config.url}
                                icon="🌐"
                                mono
                            />
                        )}

                        {config.command && (
                            <ServerDetail
                                label="Command"
                                value={config.command}
                                icon="⚡"
                                mono
                            />
                        )}

                        {config.auth && config.auth.type !== 'none' && (
                            <ServerDetail
                                label="Authentication"
                                value={config.auth.type === 'oauth' ? 'OAuth 2.1' : 'Custom Headers'}
                                icon="🔐"
                                isLast
                            />
                        )}
                    </div>

                    <div style={{
                        background: 'color-mix(in srgb, var(--theme-warning) 15%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--theme-warning) 30%, transparent)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: 'var(--theme-warning)',
                        display: 'flex',
                        gap: '10px'
                    }}>
                        <span style={{ flexShrink: 0 }}>⚠️</span>
                        <span>Only add servers from trusted sources</span>
                    </div>
                </div>

                <div className="modal-footer">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={onConfirm}>
                        Add & Connect
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}

interface ServerDetailProps {
    label: string;
    value: string;
    icon: string;
    mono?: boolean;
    badge?: boolean;
    isLast?: boolean;
}

function ServerDetail({ label, value, icon, mono, badge, isLast }: ServerDetailProps) {
    return (
        <div style={{ marginBottom: isLast ? '0' : '14px' }}>
            <div style={{
                color: 'var(--theme-accent-primary)',
                fontSize: '11px',
                fontWeight: 600,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span>{icon}</span>
                <span>{label}</span>
            </div>
            <div style={{
                color: 'var(--theme-text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
                wordBreak: 'break-all',
                lineHeight: '1.4',
                ...(badge && {
                    display: 'inline-block',
                    background: 'var(--theme-bg-primary)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid color-mix(in srgb, var(--theme-accent-primary) 40%, transparent)',
                    color: 'var(--theme-accent-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                })
            }}>
                {value}
            </div>
        </div>
    );
}

/**
 * Component that handles "Try in Hoot" URLs
 * Automatically detects when a user clicks a "Try in Hoot" link
 * and shows a confirmation dialog before adding the server
 */
export function TryInHootHandler() {
    const [pendingConfig, setPendingConfig] = useState<ServerConfigImport | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const addServer = useAppStore((state) => state.addServer);
    const { connect } = useMCPConnection();

    useEffect(() => {
        // Check if URL contains "try" parameter
        const config = parseTryInHootURL();
        if (config) {
            setPendingConfig(config);
            // Clear the URL parameter to avoid re-triggering
            const url = new URL(window.location.href);
            if (url.hash.startsWith('#/try')) {
                url.hash = '';
                window.history.replaceState({}, '', url.toString());
            } else if (url.searchParams.has('try')) {
                url.searchParams.delete('try');
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, []);

    const handleConfirm = async () => {
        if (!pendingConfig || isConnecting) return;

        setIsConnecting(true);

        try {
            // Add server to store
            addServer(pendingConfig);

            // Get the newly added server
            const servers = useAppStore.getState().servers;
            const newServer = servers[servers.length - 1];

            // Try to connect
            const success = await connect(newServer);

            if (success) {
                toast.success('Server Added', `Successfully connected to ${pendingConfig.name}`);
                setPendingConfig(null);
            } else {
                // Check if there was an error
                const updatedServer = useAppStore.getState().servers.find(s => s.id === newServer.id);
                if (updatedServer?.error) {
                    // Connection failed - but keep server in list
                    toast.error('Connection Failed', updatedServer.error);
                    setPendingConfig(null);
                } else {
                    // OAuth redirect happening
                    toast.info('OAuth Required', 'Redirecting to complete authentication...');
                    setPendingConfig(null);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add server';
            toast.error('Failed to Add Server', errorMessage);
            setPendingConfig(null);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleCancel = () => {
        setPendingConfig(null);
    };

    if (!pendingConfig) {
        return null;
    }

    return (
        <ConfirmAddServer
            config={pendingConfig}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );
}

