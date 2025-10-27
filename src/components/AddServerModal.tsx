import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import type { TransportType, AuthType } from '../types';
import * as backendClient from '../lib/backendClient';
import { toast } from '../stores/toastStore';
import { AuthSelectionModal } from './AuthSelectionModal';
import './Modal.css';

interface AddServerModalProps {
  onClose: () => void;
}

type DetectionStep = 'idle' | 'detecting' | 'success' | 'error' | 'needs_auth';

interface DetectionStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

interface AuthConfig {
  type: 'headers' | 'client_credentials' | 'oauth';
  headers?: Record<string, string>;
  client_id?: string;
  client_secret?: string;
  token_url?: string;
}

export const AddServerModal = memo(function AddServerModal({
  onClose,
}: AddServerModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  // Auto-detection state
  const [detectionStep, setDetectionStep] = useState<DetectionStep>('idle');
  const [detectedTransport, setDetectedTransport] = useState<TransportType | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const [detectedVersion, setDetectedVersion] = useState<string | null>(null);
  const [requiresOAuth, setRequiresOAuth] = useState(false);
  const [requiresClientCreds, setRequiresClientCreds] = useState(false);
  const [nameIsInferred, setNameIsInferred] = useState(false); // Track if name is from URL
  const [showAuthSelection, setShowAuthSelection] = useState(false);

  // Client credentials form state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');

  // Detection stages for visual progress
  const [stages, setStages] = useState<DetectionStage[]>([
    { id: 'connect', label: 'Finding your server', status: 'pending' },
    { id: 'transport', label: 'Checking how to connect', status: 'pending' },
    { id: 'metadata', label: 'Getting server details', status: 'pending' },
    { id: 'auth', label: 'Checking if login is needed', status: 'pending' },
  ]);

  const addServer = useAppStore((state) => state.addServer);
  const { connect, isConnecting } = useMCPConnection();

  const updateStage = (stageId: string, status: DetectionStage['status'], message?: string) => {
    setStages(prev => prev.map(stage =>
      stage.id === stageId ? { ...stage, status, message } : stage
    ));
  };

  const handleDetect = async () => {
    setError('');

    if (!url.trim()) {
      setError('Server URL is required');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      setError('Please enter a valid URL (e.g., http://localhost:3000)');
      return;
    }

    setDetectionStep('detecting');

    // Reset stages
    setStages([
      { id: 'connect', label: 'Finding your server', status: 'active' },
      { id: 'transport', label: 'Checking how to connect', status: 'pending' },
      { id: 'metadata', label: 'Getting server details', status: 'pending' },
      { id: 'auth', label: 'Checking if login is needed', status: 'pending' },
    ]);

    try {
      // Step 1: Connecting
      await new Promise(resolve => setTimeout(resolve, 400));

      const result = await backendClient.autoDetectServer(url.trim());

      if (!result.success) {
        updateStage('connect', 'error', result.error || 'Connection failed');
        setDetectionStep('error');
        setError(result.error || 'Could not connect to server');
        return;
      }

      // Step 2: Transport detected
      updateStage('connect', 'complete');
      updateStage('transport', 'active');
      await new Promise(resolve => setTimeout(resolve, 300));

      setDetectedTransport(result.transport || 'http');
      updateStage('transport', 'complete', result.transport?.toUpperCase());

      // Step 3: Metadata
      updateStage('metadata', 'active');
      await new Promise(resolve => setTimeout(resolve, 300));

      setDetectedName(result.serverInfo?.name || 'Unknown Server');
      setDetectedVersion(result.serverInfo?.version || '1.0.0');

      // Check if we got the name from OAuth detection (inferred from URL)
      // OAuth servers won't have real metadata until after authentication
      const isInferred = !!(result.requiresOAuth && result.serverInfo?.name);
      setNameIsInferred(isInferred);

      if (isInferred) {
        updateStage('metadata', 'complete', `${result.serverInfo?.name} (inferred from URL)`);
      } else {
        updateStage('metadata', 'complete', result.serverInfo?.name);
      }

      // Step 4: Auth
      updateStage('auth', 'active');
      await new Promise(resolve => setTimeout(resolve, 300));

      setRequiresOAuth(result.requiresOAuth || false);
      setRequiresClientCreds(result.requiresClientCredentials || false);

      if (result.requiresClientCredentials) {
        updateStage('auth', 'complete', 'Client Credentials Required');
      } else if (result.requiresOAuth) {
        updateStage('auth', 'complete', 'OAuth Required');
      } else {
        updateStage('auth', 'complete', 'None Required');
      }

      setDetectionStep('success');
    } catch (err) {
      console.error('Detection error:', err);
      setDetectionStep('error');
      setError(err instanceof Error ? err.message : 'Failed to detect server configuration');
    }
  };

  const handleConnect = async (authConfig?: AuthConfig) => {
    if (!detectedName || !detectedTransport) {
      return;
    }

    setError('');

    // Build server config
    const serverConfig: any = {
      name: detectedName,
      transport: detectedTransport,
      url: url.trim(),
    };

    // Add auth configuration
    if (requiresClientCreds && clientId && clientSecret) {
      // Client credentials OAuth
      serverConfig.auth = {
        type: 'oauth' as AuthType,
        client_id: clientId,
        client_secret: clientSecret,
        ...(tokenUrl && { token_url: tokenUrl }),
      };
    } else if (requiresOAuth && !authConfig) {
      serverConfig.auth = { type: 'oauth' as AuthType };
    } else if (authConfig) {
      if (authConfig.type === 'client_credentials') {
        serverConfig.auth = {
          type: 'oauth' as AuthType, // Backend treats client_credentials as OAuth variant
          client_id: authConfig.client_id,
          client_secret: authConfig.client_secret,
          token_url: authConfig.token_url,
        };
      } else if (authConfig.type === 'headers') {
        serverConfig.auth = {
          type: 'headers' as AuthType,
          headers: authConfig.headers,
        };
      }
    }

    // Add server to store temporarily to get an ID and test connection
    addServer(serverConfig);

    // Get the newly added server
    const servers = useAppStore.getState().servers;
    const newServer = servers[servers.length - 1];

    // Try to connect immediately
    try {
      const success = await connect(newServer);

      if (success) {
        // Connection successful!
        // If this was an OAuth server, we could fetch actual server name here in future
        // For now, just show success
        toast.success('Connected!', `Successfully connected to ${detectedName}`);
        onClose();
      } else {
        // Connection returned false - could be OAuth redirect OR an error
        // Check if the server has an error stored on it
        const updatedServer = useAppStore.getState().servers.find(s => s.id === newServer.id);

        if (updatedServer?.error) {
          // Check if this is a 401/403 auth error and we haven't tried auth selection yet
          const errorMsg = updatedServer.error.toLowerCase();
          if ((errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden'))
            && !authConfig
            && !requiresOAuth) {
            // Auth required but type unknown - show auth selection
            const removeServer = useAppStore.getState().removeServer;
            removeServer(newServer.id);
            setDetectionStep('needs_auth');
            setShowAuthSelection(true);
            return;
          }

          // Real connection error - remove the server and show error
          const removeServer = useAppStore.getState().removeServer;
          removeServer(newServer.id);
          setError(updatedServer.error);
        } else {
          // OAuth redirect is happening (success = false but no error)
          // Keep the server in the list - don't close modal yet
          // The user will be redirected to OAuth and come back via callback
          console.log('🔐 OAuth redirect initiated - keeping server in list');
          onClose(); // Close modal since OAuth flow is starting
        }
      }
    } catch (error) {
      // Unexpected error during connection attempt
      const removeServer = useAppStore.getState().removeServer;
      removeServer(newServer.id);

      // Show the detailed error message from the connection attempt
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect. Check configuration and try again.';
      setError(errorMessage);
    }
  };

  const handleAuthSelected = (authConfig: AuthConfig) => {
    setShowAuthSelection(false);
    handleConnect(authConfig);
  };

  const isDetecting = detectionStep === 'detecting';
  const showDetectedInfo = detectionStep === 'success';
  const canConnect = showDetectedInfo && !isConnecting &&
    (!requiresClientCreds || (clientId.trim() && clientSecret.trim()));

  // Render auth selection modal if needed
  if (showAuthSelection) {
    return (
      <AuthSelectionModal
        serverUrl={url}
        onSelectAuth={handleAuthSelected}
        onCancel={() => {
          setShowAuthSelection(false);
          setDetectionStep('success');
        }}
      />
    );
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
            <h2 style={{ margin: 0 }}>Connect a Server</h2>
          </div>
          {detectionStep === 'idle' && (
            <p style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 400,
              marginTop: '4px',
              marginBottom: '24px'
            }}>
              Just paste your server URL and we'll handle the rest
            </p>
          )}
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-field">
            <label className="form-label">Server URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://mcp.example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                // Reset detection state when URL changes
                if (detectionStep !== 'idle') {
                  setDetectionStep('idle');
                  setDetectedTransport(null);
                  setDetectedName(null);
                  setDetectedVersion(null);
                  setRequiresOAuth(false);
                  setNameIsInferred(false);
                  setStages([
                    { id: 'connect', label: 'Finding your server', status: 'pending' },
                    { id: 'transport', label: 'Checking how to connect', status: 'pending' },
                    { id: 'metadata', label: 'Getting server details', status: 'pending' },
                    { id: 'auth', label: 'Checking if login is needed', status: 'pending' },
                  ]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isDetecting && detectionStep === 'idle') {
                  handleDetect();
                }
              }}
              disabled={isDetecting || isConnecting}
              autoFocus
            />
          </div>

          {/* Detection Progress with Steps */}
          {isDetecting && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                marginBottom: '16px',
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--text-primary)'
              }}>
                Detecting Configuration...
              </div>

              {stages.map((stage, index) => (
                <DetectionStageItem
                  key={stage.id}
                  stage={stage}
                  isLast={index === stages.length - 1}
                />
              ))}
            </div>
          )}

          {/* Detected Information */}
          {showDetectedInfo && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--accent-color)'
            }}>
              <div style={{
                fontWeight: 600,
                marginBottom: '16px',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>✓</span>
                <span>Server Detected</span>
              </div>

              <ServerDetail
                label="Name"
                value={detectedName}
                icon="🏷️"
                secondaryValue={detectedVersion}
                secondaryLabel="v"
                subtitle={nameIsInferred ? '(inferred from URL)' : undefined}
              />
              <ServerDetail label="Transport" value={detectedTransport?.toUpperCase() || ''} icon="🔌" badge />
              <ServerDetail
                label="Authentication"
                value={
                  requiresClientCreds
                    ? 'Client Credentials Required'
                    : requiresOAuth
                      ? 'OAuth Required'
                      : 'None Required'
                }
                icon={requiresClientCreds || requiresOAuth ? '🔐' : '✓'}
                isLast={!requiresClientCreds && !requiresOAuth}
              />

              {requiresClientCreds && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    marginBottom: '12px',
                    padding: '12px',
                    background: 'rgba(92, 207, 230, 0.1)',
                    border: '1px solid rgba(92, 207, 230, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: 'var(--blue-500)',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span style={{ flexShrink: 0 }}>ℹ️</span>
                    <span>This server requires OAuth client credentials. Please provide your client ID and secret.</span>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Client ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="your-client-id"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Client Secret</label>
                    <input
                      type="password"
                      className="form-input"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="your-client-secret"
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Token URL (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tokenUrl}
                      onChange={(e) => setTokenUrl(e.target.value)}
                      placeholder="https://api.example.com/oauth/token"
                    />
                  </div>
                </div>
              )}

              {requiresOAuth && !requiresClientCreds && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(255, 174, 87, 0.1)',
                  border: '1px solid rgba(255, 174, 87, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: 'var(--orange-500)',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <span style={{ flexShrink: 0 }}>ℹ️</span>
                  <span>You'll be redirected to authenticate after connecting.</span>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          {detectionStep === 'idle' && (
            <p style={{
              marginTop: '16px',
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              opacity: 0.7,
              fontWeight: 400
            }}>
              We'll auto-detect transport type, server name, and auth
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDetecting || isConnecting}
          >
            Cancel
          </button>

          {detectionStep === 'idle' && (
            <button
              className="btn btn-primary"
              onClick={handleDetect}
              disabled={isDetecting || !url.trim()}
            >
              Connect
            </button>
          )}

          {showDetectedInfo && (
            <button
              className="btn btn-primary"
              onClick={() => handleConnect()}
              disabled={!canConnect}
            >
              {isConnecting
                ? 'Connecting...'
                : requiresClientCreds
                  ? 'Connect'
                  : requiresOAuth
                    ? 'Authorize →'
                    : 'Connect'
              }
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

// Helper component for detection stage items
function DetectionStageItem({ stage, isLast }: { stage: DetectionStage; isLast: boolean }) {
  const getStatusIcon = () => {
    switch (stage.status) {
      case 'pending':
        return <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }} />;
      case 'active':
        return <div className="spinner-small" style={{ width: '16px', height: '16px' }} />;
      case 'complete':
        return <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</div>;
      case 'error':
        return <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--red-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✗</div>;
    }
  };

  const getTextColor = () => {
    switch (stage.status) {
      case 'pending':
        return 'var(--text-secondary)';
      case 'active':
        return 'var(--text-primary)';
      case 'complete':
        return 'var(--text-primary)';
      case 'error':
        return 'var(--red-500)';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: isLast ? '0' : '16px'
      }}>
        <div style={{ flexShrink: 0 }}>
          {getStatusIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 500,
            color: getTextColor(),
            marginBottom: stage.message ? '2px' : '0'
          }}>
            {stage.label}
          </div>
          {stage.message && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {stage.message}
            </div>
          )}
        </div>
      </div>
      {!isLast && stage.status !== 'pending' && (
        <div style={{
          position: 'absolute',
          left: '7px',
          top: '20px',
          width: '2px',
          height: '16px',
          background: stage.status === 'complete' ? 'var(--accent-color)' : 'var(--border-color)',
          opacity: 0.5
        }} />
      )}
    </div>
  );
}

// Helper component for server details
interface ServerDetailProps {
  label: string;
  value: string | null;
  icon: string;
  badge?: boolean;
  isLast?: boolean;
  subtitle?: string; // Optional subtitle for additional context
  secondaryValue?: string | null; // Secondary value (e.g., version)
  secondaryLabel?: string; // Label for secondary value (e.g., "v")
}

function ServerDetail({ label, value, icon, badge, isLast, subtitle, secondaryValue, secondaryLabel }: ServerDetailProps) {
  return (
    <div style={{ marginBottom: isLast ? '0' : '12px' }}>
      <div style={{
        color: 'var(--text-secondary)',
        fontSize: '11px',
        fontWeight: 600,
        marginBottom: '4px',
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
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px'
      }}>
        <div style={{
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 500,
          ...(badge && {
            display: 'inline-block',
            background: 'var(--bg-hover)',
            padding: '4px 10px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            color: 'var(--blue-500)',
            fontSize: '12px',
            fontWeight: 600,
          })
        }}>
          {value}
        </div>
        {secondaryValue && (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            {secondaryLabel}{secondaryValue}
          </div>
        )}
        {subtitle && (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            opacity: 0.6
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

