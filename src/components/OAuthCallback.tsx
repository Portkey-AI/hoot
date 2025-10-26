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
                // Provide user-friendly error messages based on OAuth error codes
                const friendlyErrors: Record<string, string> = {
                    'access_denied': 'Authorization was cancelled or denied. You can try again if you change your mind.',
                    'invalid_request': 'Invalid OAuth request. The server may have incorrect OAuth configuration.',
                    'unauthorized_client': 'This client is not authorized. Please check the server\'s OAuth client ID configuration.',
                    'unsupported_response_type': 'OAuth configuration error. The server may not support the required response type.',
                    'invalid_scope': 'The requested permissions are invalid or not available.',
                    'server_error': 'The authorization server encountered an error. Please try again later.',
                    'temporarily_unavailable': 'The authorization server is temporarily unavailable. Please try again in a few moments.',
                };

                const friendlyMessage = friendlyErrors[error] || errorDescription || `OAuth error: ${error}`;
                throw new Error(friendlyMessage);
            }

            // Validate authorization code
            if (!code) {
                throw new Error('No authorization code was received from the OAuth provider. This may indicate a configuration issue with the server.');
            }

            // Get the server ID that initiated OAuth (check both keys for compatibility)
            const serverId = sessionStorage.getItem('oauth_server_id') || sessionStorage.getItem('oauth_pending_server');
            if (!serverId) {
                throw new Error('OAuth session expired. Please return to Hoot and try connecting again.');
            }

            // Find the server
            const server = getServers.find(s => s.id === serverId);
            if (!server) {
                throw new Error('Server not found. It may have been deleted while you were authorizing.');
            }

            setMessage(`Exchanging authorization code for ${server.name}...`);

            // The SDK will handle the token exchange via the transport's finishAuth method
            // We need to connect with the authorization code
            let success = false;
            let connectionError: Error | null = null;

            try {
                success = await connect(server, code);
            } catch (err) {
                // Catch but don't immediately show error - we'll check if connection succeeded anyway
                connectionError = err instanceof Error ? err : new Error('Connection failed');
                console.log('Connection error during OAuth callback:', connectionError);
            }

            // For OAuth flows, even if connect returns false or throws, the backend might be
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
                    // Use the original error message if available
                    const errorMsg = connectionError?.message || 'Failed to complete OAuth connection. The token exchange may have failed. Please try reconnecting.';
                    throw new Error(errorMsg);
                }
            } else {
                setStatus('success');
                setMessage(`✓ Successfully authorized ${server.name}!`);
            }

            // Clean up session storage
            sessionStorage.removeItem('oauth_server_id');
            sessionStorage.removeItem('oauth_pending_server');
            sessionStorage.removeItem('oauth_last_redirect');

            // Navigate back WITHOUT reload to preserve connection state
            setTimeout(() => {
                window.history.pushState({}, '', '/');
                // Trigger a popstate event to update the UI
                window.dispatchEvent(new PopStateEvent('popstate'));
            }, 1000);
        } catch (error) {
            console.error('OAuth callback error:', error);
            setStatus('error');

            // Enhanced error messaging with helpful context
            let errorMessage = 'OAuth authorization failed';
            if (error instanceof Error) {
                errorMessage = error.message;

                // Add helpful context for common error scenarios
                if (errorMessage.includes('Code verifier') || errorMessage.includes('PKCE')) {
                    errorMessage = 'Token exchange failed: PKCE verification error. The authorization session may have expired. Please try connecting again.';
                } else if (errorMessage.includes('Backend server is not running')) {
                    errorMessage = 'Unable to complete authorization: Backend server is not running. Please ensure the backend is started.';
                } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
                    errorMessage = 'Network error during token exchange. Please check your internet connection and try again.';
                } else if (errorMessage.includes('401') || errorMessage.includes('invalid_client')) {
                    errorMessage = 'Token exchange failed: Invalid client credentials. Please verify the OAuth configuration (client ID and secret) for this server.';
                } else if (errorMessage.includes('invalid_grant') || errorMessage.includes('authorization code')) {
                    errorMessage = 'Token exchange failed: The authorization code is invalid or expired. This can happen if you took too long to authorize. Please try connecting again.';
                } else if (errorMessage.includes('CORS')) {
                    errorMessage = 'Token exchange failed due to CORS restrictions. The server needs to allow requests from this domain.';
                }
            }

            setMessage(errorMessage);
        }
    };

    return (
        <div className="oauth-callback">
            <div className={`oauth-callback-content ${status === 'error' ? 'error' : ''}`}>
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

