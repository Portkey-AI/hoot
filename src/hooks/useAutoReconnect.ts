import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from './useMCP';

/**
 * Hook to auto-reconnect to previously saved servers on app load
 * This provides a seamless experience when returning to the app
 */
export function useAutoReconnect() {
    const servers = useAppStore((state) => state.servers);
    const tools = useAppStore((state) => state.tools);
    const { connect } = useMCPConnection();

    useEffect(() => {
        // Only run once on mount
        let hasRun = false;

        if (hasRun) return;
        hasRun = true;

        // Skip auto-reconnect if returning from OAuth callback
        if (sessionStorage.getItem('skip_auto_reconnect')) {
            console.log('🔐 Skipping auto-reconnect after OAuth callback');
            sessionStorage.removeItem('skip_auto_reconnect');
            return;
        }

        // Auto-reconnect to servers that have cached tools
        const serversToReconnect = servers.filter((server) => {
            // Only reconnect if we have cached tools for this server
            const hasCachedTools = tools[server.id] && tools[server.id].length > 0;

            // Note: OAuth tokens are now stored in the backend's SQLite database
            // So we can safely attempt reconnection - the backend will use stored tokens

            return hasCachedTools && !server.connected;
        });

        if (serversToReconnect.length > 0) {
            console.log(`🦉 Hoot: Auto-reconnecting to ${serversToReconnect.length} server(s)...`);

            // Reconnect in the background (don't await)
            serversToReconnect.forEach((server) => {
                // For OAuth servers, skip redirect (auto-reconnect should be silent)
                const skipOAuthRedirect = server.auth?.type === 'oauth';
                // Also pass a flag to suppress error toasts during auto-reconnect
                const suppressErrorToast = true;

                connect(server, undefined, skipOAuthRedirect, suppressErrorToast).catch((error) => {
                    // Silently fail for OAuth servers - they need manual reconnection
                    if (server.auth?.type === 'oauth') {
                        console.log(`🔐 ${server.name} needs manual reconnection (OAuth)`);
                    } else {
                        console.warn(`Failed to auto-reconnect to ${server.name}:`, error);
                    }
                });
            });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount
}

