import Portkey from 'portkey-ai';

export interface PortkeyConfig {
    apiKey: string;
}

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
}

export class PortkeyClient {
    private client: Portkey;
    private config: PortkeyConfig;

    constructor(config: PortkeyConfig) {
        this.config = config;
        this.client = new Portkey({
            apiKey: config.apiKey,
            provider: 'openai',
            dangerouslyAllowBrowser: true, // Safe for Hoot - API key is user's own, stored locally
        });
    }

    async createChatCompletion(options: ChatCompletionOptions) {
        try {
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: options.messages as any,
                tools: options.tools as any,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 2000,
                stream: options.stream ?? false,
            });

            return response;
        } catch (error) {
            console.error('Portkey API error:', error);
            throw error;
        }
    }

    async *createChatCompletionStream(options: ChatCompletionOptions) {
        try {
            const stream = await this.client.chat.completions.create({
                model: 'gpt-4o',
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
            throw error;
        }
    }

    updateConfig(config: Partial<PortkeyConfig>) {
        this.config = { ...this.config, ...config };
        this.client = new Portkey({
            apiKey: this.config.apiKey,
            provider: 'openai',
            dangerouslyAllowBrowser: true, // Safe for Hoot - API key is user's own, stored locally
        });
    }
}

// Singleton instance
let portkeyClient: PortkeyClient | null = null;

export function getPortkeyClient(config?: PortkeyConfig): PortkeyClient | null {
    if (config) {
        portkeyClient = new PortkeyClient(config);
    }
    return portkeyClient;
}

export function hasPortkeyClient(): boolean {
    return portkeyClient !== null;
}

export function clearPortkeyClient() {
    portkeyClient = null;
}

