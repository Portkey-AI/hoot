import Portkey from 'portkey-ai';
import { getSessionToken } from './backendClient';

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

    constructor() {
        // Initialize without client - will be created on first use
    }

    private async ensureClient() {
        if (!this.client || !this.jwtToken) {
            // Get token (same one used by Hoot backend!)
            this.jwtToken = await getSessionToken();

            // Create Portkey client with JWT
            this.client = new Portkey({
                apiKey: this.jwtToken, // Use JWT as API key
                dangerouslyAllowBrowser: true,
            });

            // Only log in development
            if (import.meta.env.DEV) {
                console.log('✅ Portkey client initialized with unified JWT');
            }
        }
    }

    async createChatCompletion(options: ChatCompletionOptions): Promise<any> {
        try {
            await this.ensureClient();

            const model = options.model || getSelectedModel();
            console.log(`🤖 Using model: ${getDisplayModelName(model)}`);

            const response = await this.client!.chat.completions.create({
                model,
                messages: options.messages as any,
                tools: options.tools as any,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 2000,
                stream: options.stream ?? false,
            });

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

            const stream = await this.client!.chat.completions.create({
                model,
                messages: options.messages as any,
                tools: options.tools as any,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 2000,
                stream: true,
            });

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
     * Refresh JWT token (useful for long sessions)
     */
    async refreshToken() {
        this.client = null;
        this.jwtToken = null;
        await this.ensureClient();
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

