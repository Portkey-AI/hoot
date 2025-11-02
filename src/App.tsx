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
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import type { ShortcutCategory } from './components/KeyboardShortcutsModal';
import { useAutoReconnect } from './hooks/useAutoReconnect';
import { useURLState } from './hooks/useURLState';
import { useKeyboardShortcuts, getShortcutHint } from './hooks/useKeyboardShortcuts';
import { useToastStore } from './stores/toastStore';
import { useAppStore } from './stores/appStore';
import { initializeBackendClient } from './lib/backendClient';
import type { ServerConfig } from './types';
import { Wrench, Sparkles, Github, BookOpen, MessageCircle, Keyboard } from 'lucide-react';
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const viewMode = getViewModeFromPath(currentPath);
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  const { readURL } = useURLState();
  const servers = useAppStore((state) => state.servers);
  const selectedServerId = useAppStore((state) => state.selectedServerId);
  const selectedToolName = useAppStore((state) => state.selectedToolName);
  const tools = useAppStore((state) => state.tools);
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

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    // Server management - simple 'a' for Add
    {
      key: 'a',
      description: 'Add new server',
      handler: () => setShowAddModal(true),
    },
    // Tool search focus with "/" key
    {
      key: '/',
      description: 'Focus on tool search',
      handler: () => {
        const searchInput = document.querySelector('.search-box') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
    },
    // Server navigation with Up/Down arrows
    {
      key: 'ArrowUp',
      description: 'Previous server',
      handler: () => {
        if (servers.length === 0) return;
        const currentIndex = servers.findIndex(s => s.id === selectedServerId);
        const prevIndex = currentIndex <= 0 ? servers.length - 1 : currentIndex - 1;
        const newServerId = servers[prevIndex].id;
        setSelectedServer(newServerId);

        // Scroll server into view
        setTimeout(() => {
          const serverElement = document.querySelector(`.server-item[data-server-id="${newServerId}"]`);
          if (serverElement) {
            serverElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        }, 0);
      },
    },
    {
      key: 'ArrowDown',
      description: 'Next server',
      handler: () => {
        if (servers.length === 0) return;
        const currentIndex = servers.findIndex(s => s.id === selectedServerId);
        const nextIndex = currentIndex >= servers.length - 1 ? 0 : currentIndex + 1;
        const newServerId = servers[nextIndex].id;
        setSelectedServer(newServerId);

        // Scroll server into view
        setTimeout(() => {
          const serverElement = document.querySelector(`.server-item[data-server-id="${newServerId}"]`);
          if (serverElement) {
            serverElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        }, 0);
      },
    },
    // Tool navigation with j/k (Vim-style)
    {
      key: 'j',
      description: 'Next tool',
      handler: () => {
        if (!selectedServerId) return;
        const serverTools = tools[selectedServerId] || [];
        if (serverTools.length === 0) return;
        const currentIndex = serverTools.findIndex(t => t.name === selectedToolName);
        const nextIndex = currentIndex >= serverTools.length - 1 ? 0 : currentIndex + 1;
        const newToolName = serverTools[nextIndex].name;
        setSelectedTool(newToolName);

        // Scroll tool into view
        setTimeout(() => {
          const toolElement = document.querySelector(`.tool-item[data-tool-name="${newToolName}"]`);
          if (toolElement) {
            toolElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        }, 0);
      },
    },
    {
      key: 'k',
      description: 'Previous tool',
      handler: () => {
        if (!selectedServerId) return;
        const serverTools = tools[selectedServerId] || [];
        if (serverTools.length === 0) return;
        const currentIndex = serverTools.findIndex(t => t.name === selectedToolName);
        const prevIndex = currentIndex <= 0 ? serverTools.length - 1 : currentIndex - 1;
        const newToolName = serverTools[prevIndex].name;
        setSelectedTool(newToolName);

        // Scroll tool into view
        setTimeout(() => {
          const toolElement = document.querySelector(`.tool-item[data-tool-name="${newToolName}"]`);
          if (toolElement) {
            toolElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        }, 0);
      },
    },
    // Execute tool with Cmd/Ctrl + Enter
    {
      key: 'Enter',
      ctrl: true,
      description: 'Execute current tool',
      handler: () => {
        // Trigger execution if a tool is selected
        const executeBtn = document.querySelector('.execute-btn:not(.executing)') as HTMLButtonElement;
        if (executeBtn) {
          executeBtn.click();
        }
      },
    },
    // Help
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      handler: () => setShowShortcutsModal(true),
    },
    // Escape key handling
    {
      key: 'Escape',
      description: 'Close modals or clear search',
      handler: () => {
        if (showAddModal) setShowAddModal(false);
        else if (editingServer) setEditingServer(null);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else {
          // Clear search if in tool search
          const searchInput = document.querySelector('.search-box') as HTMLInputElement;
          if (searchInput && searchInput === document.activeElement) {
            setSearchQuery('');
            searchInput.blur();
          }
        }
      },
      preventDefault: false,
    },
  ]);

  // Define shortcuts for the help modal
  const shortcutCategories: ShortcutCategory[] = [
    {
      category: 'Servers',
      shortcuts: [
        { key: 'ArrowUp', description: 'Previous server' },
        { key: 'ArrowDown', description: 'Next server' },
        { key: 'a', description: 'Add new server' },
      ],
    },
    {
      category: 'Tools',
      shortcuts: [
        { key: '/', description: 'Focus tool search' },
        { key: 'k', description: 'Previous tool (Vim)' },
        { key: 'j', description: 'Next tool (Vim)' },
        { key: 'Enter', ctrl: true, description: 'Execute current tool' },
        { key: 'm', description: 'Toggle Form/JSON mode' },
      ],
    },
    {
      category: 'General',
      shortcuts: [
        { key: '?', shift: true, description: 'Show shortcuts' },
        { key: 'Escape', description: 'Close modal/Clear search' },
      ],
    },
  ];

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
            <button
              className="header-link"
              onClick={() => setShowShortcutsModal(true)}
              title={getShortcutHint('Keyboard shortcuts', { key: '?', shift: true })}
            >
              <Keyboard size={18} />
            </button>
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
        {showShortcutsModal && (
          <KeyboardShortcutsModal
            shortcuts={shortcutCategories}
            onClose={() => setShowShortcutsModal(false)}
          />
        )}
        <TryInHootHandler />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;

