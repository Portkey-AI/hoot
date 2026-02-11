import Portkey from 'portkey-ai';
import { getSessionToken } from './backendClient';
import { useAppStore } from '../stores/appStore';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

export interface ChatCompletionOptions {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    model?: string; // Allow overriding the model
}

// Helper to get the selected model from localStorage
function getSelectedModel(): string {
    return localStorage.getItem('hoot-selected-model') || '@openai/gpt-4o-mini';
}

// Helper to display model name (strip prefix before /)
export function getDisplayModelName(model: string): string {
    const parts = model.split('/');
    return parts.length > 1 ? parts[parts.length - 1] : model;
}

export class PortkeyClient {
    private client: Portkey | null = null;
    private jwtToken: string | null = null;
    private lastAuthMode: 'jwt' | 'apiKey' | null = null;
    private lastBaseUrl: string | null = null;

    constructor() {
        // Initialize without client - will be created on first use
    }

    /**
     * Get current auth configuration from store
     */
    private getAuthConfig() {
        const state = useAppStore.getState();
        return state.portkeyAuth;
    }

    private async ensureClient() {
        const authConfig = this.getAuthConfig();
        const currentAuthMode = authConfig.useApiKey ? 'apiKey' : 'jwt';
        const currentBaseUrl = authConfig.baseUrl || null;

        // Recreate client if auth mode or base URL changed
        if ((this.lastAuthMode && this.lastAuthMode !== currentAuthMode) ||
            (this.lastBaseUrl !== currentBaseUrl)) {
            this.client = null;
            this.jwtToken = null;
        }

        if (!this.client) {
            // Build client options with optional custom base URL
            const clientOptions: { apiKey: string; dangerouslyAllowBrowser: boolean; baseURL?: string } = {
                apiKey: '',
                dangerouslyAllowBrowser: true,
            };

            // Add custom base URL if configured
            if (authConfig.baseUrl) {
                clientOptions.baseURL = authConfig.baseUrl;
            }

            if (authConfig.useApiKey && authConfig.apiKey) {
                // Use direct API key
                clientOptions.apiKey = authConfig.apiKey;
                this.client = new Portkey(clientOptions);
                this.lastAuthMode = 'apiKey';
                this.lastBaseUrl = currentBaseUrl;

                if (import.meta.env.DEV) {
                    console.log('✅ Portkey client initialized with API key' + (authConfig.baseUrl ? ` (${authConfig.baseUrl})` : ''));
                }
            } else {
                // Use JWT (default)
                this.jwtToken = await getSessionToken();
                clientOptions.apiKey = this.jwtToken;
                this.client = new Portkey(clientOptions);
                this.lastAuthMode = 'jwt';
                this.lastBaseUrl = currentBaseUrl;

                if (import.meta.env.DEV) {
                    console.log('✅ Portkey client initialized with unified JWT' + (authConfig.baseUrl ? ` (${authConfig.baseUrl})` : ''));
                }
            }
        }
    }

    async createChatCompletion(options: ChatCompletionOptions): Promise<any> {
        try {
            await this.ensureClient();

            const model = options.model || getSelectedModel();
            console.log(`🤖 Using model: ${getDisplayModelName(model)}`);

            // GPT-5 models require max_completion_tokens instead of max_tokens
            const modelName = getDisplayModelName(model).toLowerCase();
            const isGPT5Model = modelName.includes('gpt-5');
            
            const requestParams: any = {
                model,
                messages: options.messages as any,
                tools: options.tools as any,
                temperature: options.temperature ?? 0.7,
                stream: options.stream ?? false,
            };

            // Use the correct token parameter based on model
            if (isGPT5Model) {
                requestParams.max_completion_tokens = options.max_tokens ?? 2000;
            } else {
                requestParams.max_tokens = options.max_tokens ?? 2000;
            }

            const response = await this.client!.chat.completions.create(requestParams);

            return response;
        } catch (error) {
            console.error('Portkey API error:', error);

            // Check if it's an auth error - try refreshing JWT
            if (error instanceof Error && error.message.includes('401')) {
                console.log('🔄 JWT expired, refreshing...');
                this.client = null;
                this.jwtToken = null;
                // Retry once with fresh token
                return this.createChatCompletion(options);
            }

            throw error;
        }
    }

    async *createChatCompletionStream(options: ChatCompletionOptions): AsyncGenerator<any> {
        try {
            await this.ensureClient();

            const model = options.model || getSelectedModel();
            console.log(`🤖 Using model (streaming): ${getDisplayModelName(model)}`);

            // GPT-5 models require max_completion_tokens instead of max_tokens
            const modelName = getDisplayModelName(model).toLowerCase();
            const isGPT5Model = modelName.includes('gpt-5');
            
            const requestParams: any = {
                model,
                messages: options.messages as any,
                tools: options.tools as any,
                temperature: options.temperature ?? 0.7,
                stream: true,
            };

            // Use the correct token parameter based on model
            if (isGPT5Model) {
                requestParams.max_completion_tokens = options.max_tokens ?? 2000;
            } else {
                requestParams.max_tokens = options.max_tokens ?? 2000;
            }

            const stream = await this.client!.chat.completions.create(requestParams);

            for await (const chunk of stream as any) {
                yield chunk;
            }
        } catch (error) {
            console.error('Portkey streaming error:', error);

            // Check if it's an auth error
            if (error instanceof Error && error.message.includes('401')) {
                console.log('🔄 JWT expired, refreshing...');
                this.client = null;
                this.jwtToken = null;
                // Retry once with fresh token
                yield* this.createChatCompletionStream(options);
                return;
            }

            throw error;
        }
    }

    /**
     * Refresh token/client (useful for long sessions or auth config changes)
     */
    async refreshToken() {
        this.client = null;
        this.jwtToken = null;
        this.lastAuthMode = null;
        this.lastBaseUrl = null;
        await this.ensureClient();
    }

    /**
     * Get current auth mode
     */
    getAuthMode(): 'jwt' | 'apiKey' {
        const authConfig = this.getAuthConfig();
        return authConfig.useApiKey && authConfig.apiKey ? 'apiKey' : 'jwt';
    }

    /**
     * List available models from Portkey
     */
    async listModels(): Promise<any> {
        try {
            await this.ensureClient();
            const response = await this.client!.models.list();
            return response;
        } catch (error) {
            console.error('Failed to list models:', error);

            // Check if it's an auth error
            if (error instanceof Error && error.message.includes('401')) {
                console.log('🔄 JWT expired, refreshing...');
                this.client = null;
                this.jwtToken = null;
                // Retry once with fresh token
                return this.listModels();
            }

            throw error;
        }
    }
}

// Singleton instance
let portkeyClient: PortkeyClient | null = null;

export function getPortkeyClient(): PortkeyClient {
    if (!portkeyClient) {
        portkeyClient = new PortkeyClient();
    }
    return portkeyClient;
}

export function hasPortkeyClient(): boolean {
    return portkeyClient !== null;
}

export function clearPortkeyClient() {
    portkeyClient = null;
}

