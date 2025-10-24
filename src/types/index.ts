// Core MCP types
export type TransportType = 'stdio' | 'sse' | 'http';

export type AuthType = 'none' | 'headers' | 'oauth';

export interface AuthConfig {
  type: AuthType;
  // For header-based auth
  headers?: Record<string, string>;
  // For OAuth
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  scope?: string;
  // OAuth tokens (persisted after auth)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface ServerConfig {
  id: string;
  name: string;
  transport: TransportType;
  command?: string; // for stdio
  url?: string; // for sse/http
  auth?: AuthConfig; // Authentication configuration
  connected: boolean;
  lastConnected?: Date;
  error?: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, PropertySchema>;
    required?: string[];
  };
}

export interface PropertySchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}

// MCP Resources
export interface ResourceSchema {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: Blob;
}

// MCP Prompts
export interface PromptSchema {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

export interface PromptResult {
  description?: string;
  messages: PromptMessage[];
}

export interface ExecutionResult {
  success: boolean;
  time: number;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

export interface ExecutionHistory {
  id: string;
  serverId: string;
  toolName: string;
  input: Record<string, unknown>;
  result: ExecutionResult;
  timestamp: Date;
}

export type InputMode = 'form' | 'json';

export interface AppState {
  servers: ServerConfig[];
  selectedServerId: string | null;
  selectedToolName: string | null;
  tools: Record<string, ToolSchema[]>; // serverId -> tools
  history: ExecutionHistory[];
  inputMode: InputMode;
  searchQuery: string;
  executingTools: string[]; // Array of "serverId:toolName" keys for tools currently executing
}

