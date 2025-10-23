import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import './OAuthCallback.css';

/**
 * OAuth Callback Handler
 * This component handles the OAuth redirect after user authorization
 */
export function OAuthCallback() {
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing authorization...');
    const { connect } = useMCPConnection();
    const getServers = useAppStore(state => state.servers); // Get all servers for checking updates

    useEffect(() => {
        handleOAuthCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOAuthCallback = async () => {
        try {
            // Clear redirect loop protection immediately upon callback
            sessionStorage.removeItem('oauth_last_redirect');

            // Parse URL parameters
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const error = params.get('error');
            const errorDescription = params.get('error_description');

            // Check for errors from OAuth provider
            if (error) {
                throw new Error(errorDescription || `OAuth error: ${error}`);
            }

            // Validate authorization code
            if (!code) {
                throw new Error('No authorization code received');
            }

            // Get the server ID that initiated OAuth (check both keys for compatibility)
            const serverId = sessionStorage.getItem('oauth_server_id') || sessionStorage.getItem('oauth_pending_server');
            if (!serverId) {
                throw new Error('OAuth session expired. Please try connecting again.');
            }

            // Find the server
            const server = getServers.find(s => s.id === serverId);
            if (!server) {
                throw new Error('Server not found. It may have been deleted.');
            }

            setMessage(`Exchanging authorization code for ${server.name}...`);

            // The SDK will handle the token exchange via the transport's finishAuth method
            // We need to connect with the authorization code
            const success = await connect(server, code);

            // For OAuth flows, even if connect returns false, the backend might be
            // processing the connection asynchronously. Give it a moment to complete.
            if (!success) {
                // Wait a bit and check again
                setMessage(`Waiting for ${server.name} to complete connection...`);
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Re-fetch the server from store to get latest state
                const updatedServers = useAppStore.getState().servers;
                const updatedServer = updatedServers.find(s => s.id === serverId);
                if (updatedServer?.connected) {
                    // Connection succeeded after async processing
                    setStatus('success');
                    setMessage(`✓ Successfully authorized ${server.name}!`);
                } else {
                    // Still not connected, this is a real failure
                    throw new Error('Failed to complete OAuth flow - please try reconnecting');
                }
            } else {
                setStatus('success');
                setMessage(`✓ Successfully authorized ${server.name}!`);
            }

            // Clean up session storage
            sessionStorage.removeItem('oauth_server_id');
            sessionStorage.removeItem('oauth_pending_server');
            sessionStorage.removeItem('oauth_last_redirect');

            // Set a flag to skip auto-reconnect on next load
            sessionStorage.setItem('skip_auto_reconnect', 'true');

            // Navigate back (this will cause a reload, but skip_auto_reconnect prevents issues)
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (error) {
            console.error('OAuth callback error:', error);
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'OAuth authorization failed');
        }
    };

    return (
        <div className="oauth-callback">
            <div className="oauth-callback-content">
                <div className="oauth-icon">
                    {status === 'processing' && <div className="spinner">🦉</div>}
                    {status === 'success' && <div className="success-icon">✓</div>}
                    {status === 'error' && <div className="error-icon">✗</div>}
                </div>

                <h2 className="oauth-title">
                    {status === 'processing' && 'Authorizing...'}
                    {status === 'success' && 'Authorization Complete!'}
                    {status === 'error' && 'Authorization Failed'}
                </h2>

                <p className="oauth-message">{message}</p>

                {status === 'error' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => window.location.href = '/'}
                    >
                        Return to Hoot
                    </button>
                )}

                {status === 'success' && (
                    <p className="oauth-redirect">Redirecting you back to Hoot...</p>
                )}
            </div>
        </div>
    );
}

