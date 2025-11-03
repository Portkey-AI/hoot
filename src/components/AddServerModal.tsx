import { useState, memo, useEffect } from 'react';
import * as backendClient from '../lib/backendClient';
import { ServerConfigForm } from './ServerConfigForm';
import { useAppStore } from '../stores/appStore';
import { useMCPConnection } from '../hooks/useMCP';
import type { ServerConfig } from '../types';
import { Button, Input } from './ui';
import './Modal.css';

interface AddServerModalProps {
  onClose: () => void;
}

type DetectionStep = 'idle' | 'detecting' | 'success' | 'error' | 'configuring';

interface DetectionStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

export const AddServerModal = memo(function AddServerModal({ onClose }: AddServerModalProps) {
  console.log('🦉 AddServerModal rendered');

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key to close modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [detectionStep, setDetectionStep] = useState<DetectionStep>('idle');

  // Detection results to pass to ServerConfigForm
  const [detectedConfig, setDetectedConfig] = useState<Partial<ServerConfig> | null>(null);

  const addServer = useAppStore((state) => state.addServer);
  const { connect } = useMCPConnection();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Detection stages for visual progress
  const [stages, setStages] = useState<DetectionStage[]>([
    { id: 'connect', label: 'Finding your server', status: 'pending' },
    { id: 'transport', label: 'Checking how to connect', status: 'pending' },
    { id: 'metadata', label: 'Getting server details', status: 'pending' },
    { id: 'auth', label: 'Checking if login is needed', status: 'pending' },
  ]);

  const updateStage = (stageId: string, status: DetectionStage['status'], message?: string) => {
    setStages(prev =>
      prev.map(stage =>
        stage.id === stageId ? { ...stage, status, message } : stage
      )
    );
  };

  const handleDetect = async () => {
    setError('');

    if (!url.trim()) {
      setError('Server URL is required');
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      setError('Please enter a valid URL (e.g., http://localhost:3000)');
      return;
    }

    setDetectionStep('detecting');

    setStages([
      { id: 'connect', label: 'Finding your server', status: 'active' },
      { id: 'transport', label: 'Checking how to connect', status: 'pending' },
      { id: 'metadata', label: 'Getting server details', status: 'pending' },
      { id: 'auth', label: 'Checking if login is needed', status: 'pending' },
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 400));

      const result = await backendClient.autoDetectServer(url.trim());

      if (!result.success) {
        updateStage('connect', 'error', result.error || 'Connection failed');
        setDetectionStep('error');
        setError(result.error || 'Could not connect to server');
        return;
      }

      updateStage('connect', 'complete');
      updateStage('transport', 'active');
      await new Promise(resolve => setTimeout(resolve, 300));

      updateStage('transport', 'complete', result.transport?.toUpperCase());

      updateStage('metadata', 'active');
      await new Promise(resolve => setTimeout(resolve, 300));

      const serverName = result.serverInfo?.name || 'Unknown Server';
      updateStage('metadata', 'complete', serverName);

      updateStage('auth', 'active');
      await new Promise(resolve => setTimeout(resolve, 300));

      let authMessage = 'None Required';
      if (result.requiresClientCredentials) {
        authMessage = 'Client Credentials Required';
      } else if (result.requiresOAuth) {
        authMessage = 'OAuth Required';
      } else if (result.requiresHeaderAuth) {
        authMessage = 'Custom Auth Required';
      }
      updateStage('auth', 'complete', authMessage);

      setDetectionStep('success');

      const config: Partial<ServerConfig> = {
        id: `server-${Date.now()}`,
        name: serverName,
        url: url.trim(),
        transport: result.transport || 'http',
      };

      if (result.requiresOAuth) {
        config.auth = { type: 'oauth' };
      } else if (result.requiresHeaderAuth) {
        config.auth = { type: 'headers', headers: {} };
      } else {
        config.auth = { type: 'none' };
      }

      setDetectedConfig(config);

      // Smooth transition to config
      await new Promise(resolve => setTimeout(resolve, 600));
      setDetectionStep('configuring');
    } catch (err) {
      console.error('Detection error:', err);
      setDetectionStep('error');
      setError(err instanceof Error ? err.message : 'Failed to detect server configuration');
    }
  };

  const handleSubmit = async (config: Partial<ServerConfig>) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const newServerId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newServer: ServerConfig = {
        id: newServerId,
        name: config.name!,
        transport: config.transport!,
        connected: false,
        url: config.url,
        command: config.command,
        auth: config.auth,
      };

      addServer(newServer);

      if (config.auth?.type === 'oauth') {
        sessionStorage.setItem('oauth_server_id', newServerId);
      }

      const success = await connect(newServer);

      if (success) {
        onClose();
      } else {
        const serverAfterConnect = useAppStore.getState().servers.find(s => s.id === newServerId);

        if (serverAfterConnect?.error) {
          setSubmitError(serverAfterConnect.error);
        } else {
          console.log('🔐 OAuth redirect initiated');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect. Check settings and try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: detectionStep === 'configuring' ? '600px' : '560px' }}>
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
            <h2 style={{ margin: 0 }}>
              {detectionStep === 'configuring' ? 'Configure Server' : 'Add MCP Server'}
            </h2>
          </div>
          {detectionStep !== 'configuring' && (
            <p style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 400,
              marginTop: '4px',
              marginBottom: '24px'
            }}>
              Enter your server URL and we'll figure out the rest
            </p>
          )}
        </div>

        <div className="modal-body">
          {detectionStep === 'configuring' && detectedConfig ? (
            <ServerConfigForm
              server={detectedConfig as ServerConfig}
              mode="add"
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={submitError}
            />
          ) : (
            <>
              {/* URL Input */}
              <Input
                label="Server URL"
                placeholder="http://localhost:3000/mcp"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && detectionStep === 'idle') {
                    handleDetect();
                  }
                }}
                disabled={detectionStep === 'detecting'}
                autoFocus
              />

              {/* Detection Progress */}
              {detectionStep === 'detecting' && (
                <div style={{ marginTop: '24px' }}>
                  {stages.map((stage) => (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        marginBottom: '8px',
                        background: stage.status === 'active' || stage.status === 'complete'
                          ? 'rgba(92, 207, 230, 0.1)'
                          : 'rgba(31, 36, 48, 0.6)',
                        borderRadius: '8px',
                        border: `1px solid ${stage.status === 'active' ? 'rgba(92, 207, 230, 0.3)' :
                          stage.status === 'complete' ? 'rgba(34, 197, 94, 0.3)' :
                            stage.status === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                              'rgba(92, 207, 230, 0.1)'
                          }`,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                        {stage.status === 'active' && <div className="spinner-small" />}
                        {stage.status === 'complete' && <span style={{ color: 'var(--green-500)', fontSize: '16px' }}>✓</span>}
                        {stage.status === 'error' && <span style={{ color: 'var(--red-500)', fontSize: '16px' }}>✕</span>}
                        {stage.status === 'pending' && <span style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>○</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {stage.label}
                        </div>
                        {stage.message && (
                          <div style={{
                            fontSize: '12px',
                            color: stage.status === 'error' ? 'var(--red-500)' : 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>
                            {stage.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Success State */}
              {detectionStep === 'success' && (
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                  <div style={{ color: 'var(--green-500)', fontWeight: 600, marginBottom: '4px' }}>
                    Detection Complete!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Opening configuration...
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="error-message" style={{ marginTop: '16px' }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {detectionStep !== 'configuring' && (
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={detectionStep === 'detecting'}
            >
              Cancel
            </Button>
            {detectionStep === 'idle' || detectionStep === 'error' ? (
              <Button
                variant="primary"
                onClick={handleDetect}
                disabled={!url.trim()}
              >
                Detect Server
                <kbd style={{
                  marginLeft: '8px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  fontSize: '13px',
                  fontWeight: '700',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: '1',
                }}>↵</kbd>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
});
