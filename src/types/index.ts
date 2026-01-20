// Core MCP types
export type TransportType = 'stdio' | 'sse' | 'http';

export type AuthType = 'none' | 'headers' | 'oauth' | 'oauth_client_credentials';

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
  // Advanced: Additional headers to send with OAuth requests
  additionalHeaders?: Record<string, string>;
  // Advanced: Custom OAuth metadata (overrides auto-discovery)
  customOAuthMetadata?: {
    authorization_endpoint?: string;
    token_endpoint?: string;
    client_id?: string;
    response_types_supported?: string[];
    grant_types_supported?: string[];
    token_endpoint_auth_method?: string;
  };
  // OAuth server metadata (from authorization server discovery)
  oauthServerMetadata?: {
    issuer?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
    logo_uri?: string;
    [key: string]: unknown;
  };
}

// MCP Icon (2025-11-25 spec)
export interface Icon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: 'light' | 'dark';
}

// Server metadata from MCP initialize response (Implementation type)
export interface ServerMetadata {
  name: string;
  version: string;
  title?: string;
  description?: string;
  websiteUrl?: string;
  icons?: Icon[];
  instructions?: string; // Hints for LLM about how to use the server
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
  // Server metadata from MCP protocol
  metadata?: ServerMetadata;
}

// Tool annotations (2025-11-25 spec)
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// Tool execution metadata (2025-11-25 spec)
export interface ToolExecution {
  taskSupport?: 'forbidden' | 'optional' | 'required';
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, PropertySchema>;
    required?: string[];
  };
  // New fields from 2025-11-25 spec
  title?: string;
  icons?: Icon[];
  outputSchema?: {
    type: string;
    properties?: Record<string, PropertySchema>;
    required?: string[];
  };
  execution?: ToolExecution;
  annotations?: ToolAnnotations;
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
  searchQuery: string;
  executingTools: string[]; // Array of "serverId:toolName" keys for tools currently executing
}

