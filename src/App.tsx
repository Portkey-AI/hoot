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
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useAutoReconnect } from './hooks/useAutoReconnect';
import { useURLState } from './hooks/useURLState';
import { useToastStore } from './stores/toastStore';
import { useAppStore } from './stores/appStore';
import { initializeBackendClient } from './lib/backendClient';
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

/**
 * Get view mode from URL path
 */
function getViewModeFromPath(pathname: string): ViewMode {
  if (pathname.startsWith('/chat')) return 'hybrid';
  return 'test';
}

/**
 * Navigate to a specific view mode
 */
function navigateToView(mode: ViewMode) {
  const path = mode === 'hybrid' ? '/chat' : '/test';
  const searchParams = new URLSearchParams(window.location.search);
  const newURL = `${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  window.history.pushState({}, '', newURL);

  // Trigger popstate to update the UI
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function App() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const viewMode = getViewModeFromPath(currentPath);
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  const { readURL } = useURLState();
  const setSelectedServer = useAppStore((state) => state.setSelectedServer);
  const setSelectedTool = useAppStore((state) => state.setSelectedTool);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);

  // Initialize backend client (fetch session token) on app start
  useEffect(() => {
    initializeBackendClient();
  }, []);

  // Auto-reconnect to saved servers with cached tools
  useAutoReconnect();

  // Restore state from URL on mount and when URL changes
  useEffect(() => {
    const urlState = readURL();

    if (urlState.server) {
      setSelectedServer(urlState.server);
    }

    if (urlState.tool) {
      setSelectedTool(urlState.tool);
    }

    if (urlState.search) {
      setSearchQuery(urlState.search);
    }

    // Handle execution deep links (future enhancement)
    if (urlState.execution) {
      // TODO: Scroll to and highlight specific execution
      console.log('Deep link to execution:', urlState.execution);
    }
  }, [currentPath, readURL, setSelectedServer, setSelectedTool, setSearchQuery]);

  // Listen for navigation events (back/forward and programmatic navigation)
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
          <div className="app-header-left">
            <div className="app-branding">
              <span className="logo-icon">🦉</span>
              <h1 className="app-title">Hoot</h1>
            </div>

            {ENABLE_HYBRID_MODE && (
              <nav className="app-nav">
                <button
                  className={`nav-button ${viewMode === 'test' ? 'active' : ''}`}
                  onClick={() => navigateToView('test')}
                  title="Test MCP tools manually"
                >
                  <Wrench size={18} />
                  <span>Test Tools</span>
                </button>
                <button
                  className={`nav-button ${viewMode === 'hybrid' ? 'active' : ''}`}
                  onClick={() => navigateToView('hybrid')}
                  title="Chat with AI to test tools"
                >
                  <Sparkles size={18} />
                  <span>Chat</span>
                </button>
              </nav>
            )}
          </div>

          <div className="app-actions">
            <ThemeSwitcher />
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

