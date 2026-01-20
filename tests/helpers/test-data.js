/**
 * Test Data Fixtures
 * 
 * Reusable test data for MCP server testing
 */

/**
 * Valid MCP server configurations
 */
export const validServerConfigs = {
    // OAuth with auto-discovery
    oauthAutoDiscovery: {
        serverId: 'test-oauth-auto',
        serverName: 'OAuth Auto-Discovery Server',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'oauth'
        }
    },

    // OAuth with custom endpoints
    oauthCustomEndpoints: {
        serverId: 'test-oauth-custom',
        serverName: 'OAuth Custom Endpoints Server',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'oauth',
            customOAuthMetadata: {
                authorization_endpoint: 'http://localhost:9001/oauth/authorize',
                token_endpoint: 'http://localhost:9001/oauth/token'
            }
        }
    },

    // OAuth with client credentials (public)
    oauthPublicClient: {
        serverId: 'test-oauth-public',
        serverName: 'OAuth Public Client',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'oauth',
            clientId: 'test-client-public',
            customOAuthMetadata: {
                authorization_endpoint: 'http://localhost:9001/oauth/authorize',
                token_endpoint: 'http://localhost:9001/oauth/token'
            }
        }
    },

    // OAuth with client credentials (confidential)
    oauthConfidentialClient: {
        serverId: 'test-oauth-confidential',
        serverName: 'OAuth Confidential Client',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'oauth',
            clientId: 'test-client-confidential',
            clientSecret: 'test-secret-123',
            customOAuthMetadata: {
                authorization_endpoint: 'http://localhost:9001/oauth/authorize',
                token_endpoint: 'http://localhost:9001/oauth/token',
                token_endpoint_auth_method: 'client_secret_post'
            }
        }
    },

    // API key authentication
    apiKey: {
        serverId: 'test-apikey',
        serverName: 'API Key Server',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'apiKey',
            apiKey: 'test-api-key-valid'
        }
    },

    // No authentication
    noAuth: {
        serverId: 'test-noauth',
        serverName: 'No Auth Server',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'none'
        }
    }
};

/**
 * Invalid/error configurations for testing error handling
 */
export const invalidServerConfigs = {
    // Invalid URL
    invalidUrl: {
        serverId: 'test-invalid-url',
        serverName: 'Invalid URL',
        url: 'not-a-valid-url',
        transport: 'http'
    },

    // Non-existent server
    nonExistent: {
        serverId: 'test-nonexistent',
        serverName: 'Non-Existent Server',
        url: 'http://localhost:9999/mcp',
        transport: 'http'
    },

    // Invalid OAuth endpoints
    invalidOAuth: {
        serverId: 'test-invalid-oauth',
        serverName: 'Invalid OAuth',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'oauth',
            customOAuthMetadata: {
                authorization_endpoint: 'http://invalid-host:9999/authorize',
                token_endpoint: 'http://invalid-host:9999/token'
            }
        }
    },

    // Invalid API key
    invalidApiKey: {
        serverId: 'test-invalid-apikey',
        serverName: 'Invalid API Key',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'apiKey',
            apiKey: 'invalid-key-123'
        }
    },

    // Wrong client credentials
    wrongCredentials: {
        serverId: 'test-wrong-creds',
        serverName: 'Wrong Credentials',
        url: 'http://localhost:9000/mcp',
        transport: 'http',
        auth: {
            type: 'oauth',
            clientId: 'test-client-confidential',
            clientSecret: 'wrong-secret',
            customOAuthMetadata: {
                authorization_endpoint: 'http://localhost:9001/oauth/authorize',
                token_endpoint: 'http://localhost:9001/oauth/token'
            }
        }
    }
};

/**
 * MCP tool test cases
 */
export const toolTestCases = {
    // Simple echo tool
    echo: {
        name: 'echo',
        arguments: {
            message: 'Hello, World!'
        },
        expectedResult: {
            message: 'Hello, World!'
        }
    },

    // Math tool
    add: {
        name: 'add',
        arguments: {
            a: 5,
            b: 3
        },
        expectedResult: {
            sum: 8
        }
    },

    // Tool with optional parameters
    getWeather: {
        name: 'get_weather',
        arguments: {
            location: 'San Francisco',
            units: 'celsius'
        },
        expectedResult: {
            location: 'San Francisco',
            temperature: expect.any(Number),
            units: 'celsius',
            condition: expect.any(String)
        }
    },

    // Complex nested parameters
    complexTool: {
        name: 'complex_tool',
        arguments: {
            config: {
                enabled: true,
                options: ['option1', 'option2'],
                metadata: {
                    version: '1.0',
                    author: 'test'
                }
            }
        },
        expectedResult: {
            processed: true,
            config: expect.any(Object),
            timestamp: expect.any(Number)
        }
    },

    // Long running task
    longRunning: {
        name: 'long_running_task',
        arguments: {
            duration: 1
        },
        expectedResult: {
            completed: true,
            duration: 1,
            timestamp: expect.any(Number)
        }
    }
};

/**
 * Error test cases
 */
export const errorTestCases = {
    // Tool not found
    toolNotFound: {
        name: 'non_existent_tool',
        arguments: {},
        expectedError: {
            code: -32602,
            message: expect.stringContaining('not found')
        }
    },

    // Missing required parameter
    missingParameter: {
        name: 'echo',
        arguments: {},
        expectedError: {
            code: expect.any(Number),
            message: expect.any(String)
        }
    },

    // Invalid parameter type
    invalidParameterType: {
        name: 'add',
        arguments: {
            a: 'not a number',
            b: 3
        },
        expectedError: {
            code: expect.any(Number),
            message: expect.any(String)
        }
    },

    // Validation error
    validationError: {
        name: 'error_generator',
        arguments: {
            errorType: 'validation'
        },
        expectedError: {
            code: -32602,
            message: expect.stringContaining('Validation error')
        }
    },

    // Runtime error
    runtimeError: {
        name: 'error_generator',
        arguments: {
            errorType: 'runtime'
        },
        expectedError: {
            code: -32603,
            message: expect.any(String)
        }
    },

    // Authentication error
    authError: {
        name: 'error_generator',
        arguments: {
            errorType: 'auth'
        },
        expectedError: {
            code: -32001,
            message: expect.stringContaining('Authentication')
        }
    }
};

/**
 * OAuth flow test data
 */
export const oauthFlowData = {
    // Valid authorization request
    validAuthRequest: {
        client_id: 'test-client-public',
        redirect_uri: 'http://localhost:5173/oauth/callback',
        response_type: 'code',
        state: 'test-state-123',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
        scope: 'read write'
    },

    // Valid token request
    validTokenRequest: {
        grant_type: 'authorization_code',
        code: 'auth_code_placeholder',
        redirect_uri: 'http://localhost:5173/oauth/callback',
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        client_id: 'test-client-public'
    },

    // Valid refresh request
    validRefreshRequest: {
        grant_type: 'refresh_token',
        refresh_token: 'refresh_token_placeholder',
        client_id: 'test-client-public'
    },

    // Expected token response structure
    tokenResponseStructure: {
        access_token: expect.any(String),
        token_type: 'Bearer',
        expires_in: expect.any(Number),
        refresh_token: expect.any(String),
        scope: expect.any(String)
    }
};

/**
 * MCP protocol messages
 */
export const mcpMessages = {
    // Initialize request
    initialize: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: {
                name: 'Hoot Test Client',
                version: '1.0.0'
            }
        },
        id: 1
    },

    // Tools list request
    toolsList: {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2
    },

    // Tool call request template
    toolCall: (toolName, args) => ({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: args
        },
        id: 3
    })
};

/**
 * Expected server responses
 */
export const expectedResponses = {
    // Health check response
    health: {
        status: 'healthy',
        server: 'Test MCP Server',
        version: '1.0.0',
        uptime: expect.any(Number),
        timestamp: expect.any(Number)
    },

    // OAuth discovery response
    oauthDiscovery: {
        issuer: 'http://localhost:9001',
        authorization_endpoint: 'http://localhost:9001/oauth/authorize',
        token_endpoint: 'http://localhost:9001/oauth/token',
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: expect.any(Array),
        scopes_supported: expect.any(Array)
    },

    // MCP initialize response structure
    initializeResponse: {
        jsonrpc: '2.0',
        result: {
            protocolVersion: '2025-11-25',
            capabilities: expect.any(Object),
            serverInfo: {
                name: expect.any(String),
                version: expect.any(String)
            }
        },
        id: expect.any(Number)
    },

    // Tools list response structure
    toolsListResponse: {
        jsonrpc: '2.0',
        result: {
            tools: expect.arrayContaining([
                expect.objectContaining({
                    name: expect.any(String),
                    description: expect.any(String),
                    inputSchema: expect.any(Object)
                })
            ])
        },
        id: expect.any(Number)
    }
};

/**
 * Test user data
 */
export const testUsers = {
    standard: {
        userId: 'test-user-1',
        sessionToken: null // Will be generated during tests
    },

    admin: {
        userId: 'test-admin',
        sessionToken: null
    }
};

/**
 * Rate limiting test data
 */
export const rateLimitTests = {
    normalUsage: {
        requests: 50,
        intervalMs: 60000,
        shouldSucceed: true
    },

    exceededLimit: {
        requests: 150,
        intervalMs: 60000,
        shouldSucceed: false,
        expectedStatus: 429
    }
};

/**
 * Helper to create a complete server config with auth
 */
export function createServerConfig(baseConfig, authOverride) {
    return {
        ...baseConfig,
        auth: authOverride || baseConfig.auth
    };
}

/**
 * Helper to create tool execution parameters
 */
export function createToolExecutionParams(serverId, toolName, args) {
    return {
        serverId,
        toolName,
        arguments: args
    };
}

/**
 * Common test timeouts
 */
export const timeouts = {
    short: 2000,      // Quick operations (health check, tool list)
    medium: 5000,     // Tool execution, connection
    long: 10000,      // OAuth flow, long-running tasks
    veryLong: 30000   // Timeout tests, complex workflows
};



