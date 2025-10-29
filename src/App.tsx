import { useState, useEffect } from 'react';
import { ServerSidebar } from './components/ServerSidebar';
import { ToolsSidebar } from './components/ToolsSidebar';
import { MainArea } from './components/MainArea';
import { HybridInterface } from './components/HybridInterface';
import { AddServerModal } from './components/AddServerModal';
import { EditServerModal } from './components/EditServerModal';
import { OAuthCallback } from './components/OAuthCallback';
import { TryInHootHandler } from './components/TryInHootHandler';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAutoReconnect } from './hooks/useAutoReconnect';
import { useToastStore } from './stores/toastStore';
import type { ServerConfig } from './types';
import { Wrench, Sparkles } from 'lucide-react';
import './lib/logger'; // Initialize logger in development
import './App.css';

// ============================================================================
// HYBRID MODE FEATURE FLAG
// Set to false to completely disable the hybrid mode feature
// ============================================================================
const ENABLE_HYBRID_MODE = true;

type ViewMode = 'test' | 'hybrid';

function App() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [viewMode, setViewMode] = useState<ViewMode>('test');
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  // Auto-reconnect to saved servers with cached tools
  useAutoReconnect();

  // Listen for navigation events
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check if we're on the OAuth callback path
  const isOAuthCallback = currentPath === '/oauth/callback';

  if (isOAuthCallback) {
    return <OAuthCallback />;
  }

  return (
    <ErrorBoundary>
      <div className="app">
        {/* Mode Switcher - Only show if Hybrid mode is enabled */}
        {ENABLE_HYBRID_MODE && (
          <div className="mode-switcher">
            <button
              className={`mode-button ${viewMode === 'test' ? 'active' : ''}`}
              onClick={() => setViewMode('test')}
              title="Test MCP tools manually"
            >
              <Wrench size={18} />
              <span>Test Tools</span>
            </button>
            <button
              className={`mode-button ${viewMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => setViewMode('hybrid')}
              title="Chat + API view side-by-side (DEMO)"
            >
              <Sparkles size={18} />
              <span>Hybrid Mode</span>
              <span className="demo-badge">DEMO</span>
            </button>
          </div>
        )}

        {/* Render based on mode */}
        {viewMode === 'test' && (
          <div className="test-tools-container">
            <ServerSidebar
              onAddServer={() => setShowAddModal(true)}
              onEditServer={(server) => setEditingServer(server)}
            />
            <ToolsSidebar />
            <MainArea />
          </div>
        )}

        {ENABLE_HYBRID_MODE && viewMode === 'hybrid' && <HybridInterface />}

        {/* Modals and other components */}
        {showAddModal && <AddServerModal onClose={() => setShowAddModal(false)} />}
        {editingServer && <EditServerModal server={editingServer} onClose={() => setEditingServer(null)} />}
        <TryInHootHandler />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;

