import { useState, useCallback } from 'react';
import { mcpClient } from '../lib/mcpClient';
import { useAppStore } from '../stores/appStore';
import { toast } from '../stores/toastStore';
import type { ServerConfig } from '../types';

// Import UnauthorizedError to detect OAuth redirects
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';

export function useMCPConnection() {
    const [isConnecting, setIsConnecting] = useState(false);
    const updateServer = useAppStore((state) => state.updateServer);
    const setTools = useAppStore((state) => state.setTools);

    const connect = useCallback(async (server: ServerConfig, authorizationCode?: string, skipOAuthRedirect?: boolean) => {
        setIsConnecting(true);
        try {
            console.log(`🔌 Attempting to connect to ${server.name}...`, {
                hasAuth: !!server.auth,
                authType: server.auth?.type,
                hasAuthCode: !!authorizationCode
            });

            await mcpClient.connect(server, authorizationCode, skipOAuthRedirect);

            // If we reach here, connection succeeded
            updateServer(server.id, {
                connected: true,
                error: undefined,
                lastConnected: new Date(),
            });

            // Fetch and cache tools immediately
            const tools = await mcpClient.listTools(server.id);
            setTools(server.id, tools);

            console.log(`✓ Successfully connected to ${server.name}`);
            // Toast removed - connection success is obvious from UI state
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            console.error('Error type:', error?.constructor?.name);

            // Special handling for OAuth - if the error contains "OAuth authorization required"
            // it means the redirect is about to happen, so don't show it as an error
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('OAuth authorization required') ||
                errorMessage.includes('Redirecting to authorization')) {
                console.log('🔐 OAuth redirect is happening - not showing as error');
                updateServer(server.id, {
                    connected: false,
                    error: undefined, // Don't show error during OAuth redirect
                });
                return false; // Return false but don't show error
            }

            // Special handling for OAuth UnauthorizedError - this means redirect is happening
            if (error instanceof UnauthorizedError) {
                console.log('🔐 UnauthorizedError caught - OAuth redirect should be happening...');
                // Don't mark as error - the redirect is expected
                updateServer(server.id, {
                    connected: false,
                    error: undefined, // Don't show error during OAuth redirect
                });
                // The redirect should happen automatically via the OAuth provider
                // Return false but don't show it as an error
                return false;
            }

            // Check if it's an error with name 'UnauthorizedError' (in case instanceof doesn't work)
            if (error && typeof error === 'object' && 'name' in error && error.name === 'UnauthorizedError') {
                console.log('🔐 UnauthorizedError detected by name - OAuth redirect should be happening...');
                updateServer(server.id, {
                    connected: false,
                    error: undefined, // Don't show error during OAuth redirect
                });
                return false;
            }

            let finalErrorMessage = error instanceof Error ? error.message : 'Connection failed';

            // Detect CORS errors
            if (finalErrorMessage.includes('Failed to fetch') || finalErrorMessage.includes('CORS')) {
                finalErrorMessage = 'CORS Error: Server does not allow browser connections. See CORS.md for solutions.';
            }

            // Detect 401 without proper OAuth handling (but not during OAuth flow)
            if (finalErrorMessage.includes('401') || finalErrorMessage.includes('Unauthorized')) {
                if (server.auth?.type === 'oauth' && !authorizationCode) {
                    // This shouldn't happen if OAuth provider worked correctly
                    finalErrorMessage = 'OAuth required but authorization redirect did not occur. Check server OAuth configuration.';
                } else if (server.auth?.type !== 'oauth') {
                    // Check if the error mentions OAuth or Bearer token
                    if (finalErrorMessage.includes('invalid_token') || finalErrorMessage.includes('Bearer')) {
                        finalErrorMessage = `⚠️ This server requires OAuth authentication.\n\n` +
                            `To fix:\n` +
                            `1. Open the server menu (⋮)\n` +
                            `2. Click "Edit Server"\n` +
                            `3. Set Authentication to "OAuth"\n` +
                            `4. Save and connect again`;
                    } else {
                        finalErrorMessage = 'Authentication required (401). Please configure authentication for this server.';
                    }
                }
            }

            console.error(`❌ Connection to ${server.name} failed:`, finalErrorMessage);

            updateServer(server.id, {
                connected: false,
                error: finalErrorMessage,
            });

            // Show toast for non-OAuth errors
            const isOAuthFlow = finalErrorMessage.includes('OAuth authorization required') ||
                finalErrorMessage.includes('Redirecting to authorization') ||
                error instanceof UnauthorizedError;

            if (!isOAuthFlow) {
                toast.error(`Failed to connect to ${server.name}`, finalErrorMessage);
            }

            return false;
        } finally {
            setIsConnecting(false);
        }
    }, [updateServer, setTools]);

    const disconnect = useCallback(async (serverId: string) => {
        await mcpClient.disconnect(serverId);
        updateServer(serverId, {
            connected: false,
        });

        // Toast removed - disconnection is obvious from UI state
    }, [updateServer]);

    return {
        connect,
        disconnect,
        isConnecting,
    };
}

export function useMCPExecution() {
    const [isExecuting, setIsExecuting] = useState(false);
    const addToHistory = useAppStore((state) => state.addToHistory);

    const execute = useCallback(async (
        serverId: string,
        toolName: string,
        args: Record<string, unknown>
    ) => {
        setIsExecuting(true);
        const startTime = performance.now();

        try {
            const result = await mcpClient.executeTool(serverId, toolName, args);
            const time = Math.round(performance.now() - startTime);

            const executionResult = {
                success: true,
                time,
                data: result,
                timestamp: new Date(),
            };

            addToHistory({
                serverId,
                toolName,
                input: args,
                result: executionResult,
            });

            // Toast removed - execution success is shown in the result section
            // Only show toast for errors

            return executionResult;
        } catch (error) {
            const time = Math.round(performance.now() - startTime);

            // Log detailed error for debugging
            console.error('Tool execution error:', {
                serverId,
                toolName,
                args,
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            });

            const errorMessage = error instanceof Error ? error.message : 'Execution failed';

            const executionResult = {
                success: false,
                time,
                error: errorMessage,
                timestamp: new Date(),
            };

            addToHistory({
                serverId,
                toolName,
                input: args,
                result: executionResult,
            });

            toast.error(`Failed to execute ${toolName}`, errorMessage);

            return executionResult;
        } finally {
            setIsExecuting(false);
        }
    }, [addToHistory]);

    return {
        execute,
        isExecuting,
    };
}

