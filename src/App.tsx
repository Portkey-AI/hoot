import { useState, useEffect } from 'react';
import { ServerSidebar } from './components/ServerSidebar';
import { ToolsSidebar } from './components/ToolsSidebar';
import { MainArea } from './components/MainArea';
import { AddServerModal } from './components/AddServerModal';
import { EditServerModal } from './components/EditServerModal';
import { OAuthCallback } from './components/OAuthCallback';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAutoReconnect } from './hooks/useAutoReconnect';
import { useToastStore } from './stores/toastStore';
import type { ServerConfig } from './types';
import './lib/logger'; // Initialize logger in development
import './App.css';

function App() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
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
        <ServerSidebar
          onAddServer={() => setShowAddModal(true)}
          onEditServer={(server) => setEditingServer(server)}
        />
        <ToolsSidebar />
        <MainArea />
        {showAddModal && <AddServerModal onClose={() => setShowAddModal(false)} />}
        {editingServer && <EditServerModal server={editingServer} onClose={() => setEditingServer(null)} />}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;

