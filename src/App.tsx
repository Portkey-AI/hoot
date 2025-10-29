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
import { Wrench, Sparkles, Github, BookOpen, MessageCircle } from 'lucide-react';
import packageJson from '../package.json';
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
        {/* Global Header */}
        <header className="app-header">
          <div className="app-branding">
            <span className="logo-icon">🦉</span>
            <h1 className="app-title">Hoot</h1>
            <span className="app-tagline">MCP Testing Tool</span>
          </div>

          {ENABLE_HYBRID_MODE && (
            <nav className="app-nav">
              <button
                className={`nav-button ${viewMode === 'test' ? 'active' : ''}`}
                onClick={() => setViewMode('test')}
                title="Test MCP tools manually"
              >
                <Wrench size={18} />
                <span>Test Tools</span>
              </button>
              <button
                className={`nav-button ${viewMode === 'hybrid' ? 'active' : ''}`}
                onClick={() => setViewMode('hybrid')}
                title="Chat with AI to test tools"
              >
                <Sparkles size={18} />
                <span>Chat</span>
              </button>
            </nav>
          )}

          <div className="app-actions">
            <a
              href="https://portkey.ai/docs/hoot"
              target="_blank"
              rel="noopener noreferrer"
              className="header-link"
              title="Documentation"
            >
              <BookOpen size={18} />
            </a>
            <a
              href="https://portkey.ai/community"
              target="_blank"
              rel="noopener noreferrer"
              className="header-link"
              title="Discord"
            >
              <MessageCircle size={18} />
            </a>
            <a
              href="https://github.com/portkey-ai/hoot"
              target="_blank"
              rel="noopener noreferrer"
              className="version-badge"
              title="View on GitHub"
            >
              <Github size={14} />
              <span>v{packageJson.version}</span>
            </a>
          </div>
        </header>

        {/* Content Area */}
        <div className="app-content">
          {viewMode === 'test' && (
            <div className="test-layout">
              <ServerSidebar
                onAddServer={() => setShowAddModal(true)}
                onEditServer={(server) => setEditingServer(server)}
              />
              <ToolsSidebar />
              <MainArea />
            </div>
          )}

          {ENABLE_HYBRID_MODE && viewMode === 'hybrid' && <HybridInterface />}
        </div>

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

