import type { ServerConfig, ToolSchema } from '../types';
import { HootOAuthProvider } from './oauthProvider';
import * as backendClient from './backendClient';

// MCP Client Manager - now acts as a relay to the Node.js backend
// The backend handles the actual MCP SDK connections, eliminating CORS issues
class MCPClientManager {
  private oauthProviders: Map<string, HootOAuthProvider> = new Map();
  private connectedServers: Set<string> = new Set();

  /**
   * Connect to an MCP server through the backend
   */
  async connect(config: ServerConfig, authorizationCode?: string, skipOAuthRedirect = false): Promise<void> {
    // Disconnect existing connection if any
    if (this.connectedServers.has(config.id)) {
      await this.disconnect(config.id);
    }

    try {
      console.log(`🔌 Connecting to ${config.name} via backend...`, {
        transport: config.transport,
        url: config.url,
        hasAuth: !!config.auth,
        authType: config.auth?.type,
        hasAuthCode: !!authorizationCode,
      });

      // Check if backend is available
      const backendAvailable = await backendClient.isBackendAvailable();
      if (!backendAvailable) {
        throw new Error(
          'Backend server is not running. Please start it with: npm run backend'
        );
      }

      // Setup OAuth provider if needed (for authorization URL generation)
      if (config.auth?.type === 'oauth' && config.url) {
        const provider = new HootOAuthProvider(config.id, config.url);
        this.oauthProviders.set(config.id, provider);
      }

      // Connect through backend
      const result = await backendClient.connectToServer(config, authorizationCode);

      if (!result.success) {
        // Check if this is an OAuth authorization error
        if (result.needsAuth && result.authorizationUrl) {
          if (skipOAuthRedirect) {
            // Silent fail for auto-reconnect - don't throw error
            console.log(`🔐 ${config.name} needs OAuth authorization (skipped during auto-reconnect)`);
            return;
          }

          // Trigger OAuth redirect using the provider
          const provider = this.oauthProviders.get(config.id);
          if (provider) {
            console.log(`🔐 Redirecting to OAuth: ${result.authorizationUrl}`);
            await provider.redirectToAuthorization(new URL(result.authorizationUrl));
            return; // Redirect will happen, don't throw error
          }
        }

        throw new Error(result.error || 'Connection failed');
      }

      // Mark as connected
      this.connectedServers.add(config.id);

      console.log(`✅ Connected to ${config.name}`);
    } catch (error) {
      // Clean up on failure
      this.oauthProviders.delete(config.id);
      this.connectedServers.delete(config.id);

      console.error(`❌ Connection failed for ${config.name}:`, error);
      throw error;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    try {
      await backendClient.disconnectFromServer(serverId);
      this.connectedServers.delete(serverId);
      this.oauthProviders.delete(serverId);
    } catch (error) {
      console.error('Disconnect error:', error);
      // Clean up local state even if backend disconnect fails
      this.connectedServers.delete(serverId);
      this.oauthProviders.delete(serverId);
    }
  }

  /**
   * Get the OAuth provider for a server (if OAuth is being used)
   */
  getOAuthProvider(serverId: string): HootOAuthProvider | undefined {
    return this.oauthProviders.get(serverId);
  }

  /**
   * Check if a server's OAuth tokens need refresh
   */
  async needsTokenRefresh(serverId: string): Promise<boolean> {
    const provider = this.oauthProviders.get(serverId);
    if (!provider) return false;

    return provider.isTokenExpired();
  }

  async listTools(serverId: string): Promise<ToolSchema[]> {
    if (!this.connectedServers.has(serverId)) {
      throw new Error('Server not connected');
    }

    return await backendClient.listTools(serverId);
  }

  async executeTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.connectedServers.has(serverId)) {
      throw new Error('Server not connected');
    }

    return await backendClient.executeTool(serverId, toolName, args);
  }

  isConnected(serverId: string): boolean {
    return this.connectedServers.has(serverId);
  }

  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.connectedServers);
    await Promise.all(serverIds.map(id => this.disconnect(id)));
  }
}

// Singleton instance for performance
export const mcpClient = new MCPClientManager();

