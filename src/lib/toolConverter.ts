import type { ToolSchema } from '../types';
import type { ToolDefinition } from './portkeyClient';
import type { ScoredTool } from '@portkey-ai/mcp-tool-filter';

/**
 * Converts MCP tool schema to OpenAI function calling format
 */
export function convertMCPToolToOpenAI(mcpTool: ToolSchema): ToolDefinition {
    return {
        type: 'function',
        function: {
            name: mcpTool.name,
            description: mcpTool.description || `Call the ${mcpTool.name} tool`,
            parameters: {
                type: 'object',
                properties: mcpTool.inputSchema.properties || {},
                required: mcpTool.inputSchema.required || [],
            },
        },
    };
}

/**
 * Converts filtered/scored tools from semantic filter to OpenAI format
 * Deduplicates tools by name to prevent sending duplicates
 */
export function convertFilteredToolsToOpenAI(scoredTools: ScoredTool[]): ToolDefinition[] {
    const seenTools = new Set<string>();
    const uniqueTools: ToolDefinition[] = [];

    for (const scoredTool of scoredTools) {
        // Skip if we've already seen this tool name
        if (seenTools.has(scoredTool.toolName)) {
            console.warn(`[ToolConverter] Skipping duplicate tool: ${scoredTool.toolName}`);
            continue;
        }

        seenTools.add(scoredTool.toolName);
        uniqueTools.push({
            type: 'function',
            function: {
                name: scoredTool.toolName,
                description: scoredTool.tool.description || `Call the ${scoredTool.toolName} tool`,
                parameters: {
                    type: 'object',
                    properties: (scoredTool.tool.inputSchema as any)?.properties || {},
                    required: (scoredTool.tool.inputSchema as any)?.required || [],
                },
            },
        });
    }

    return uniqueTools;
}

/**
 * Converts all MCP tools from multiple servers to OpenAI format
 * Deduplicates tools by name to prevent sending duplicates
 */
export function convertAllMCPToolsToOpenAI(
    toolsByServer: Record<string, ToolSchema[]>
): ToolDefinition[] {
    const seenTools = new Set<string>();
    const uniqueTools: ToolDefinition[] = [];

    for (const tools of Object.values(toolsByServer)) {
        for (const tool of tools) {
            // Skip if we've already seen this tool name
            if (seenTools.has(tool.name)) {
                console.warn(`[ToolConverter] Skipping duplicate tool: ${tool.name}`);
                continue;
            }

            seenTools.add(tool.name);
            uniqueTools.push(convertMCPToolToOpenAI(tool));
        }
    }

    return uniqueTools;
}

/**
 * Finds which server a tool belongs to
 */
export function findServerForTool(
    toolName: string,
    toolsByServer: Record<string, ToolSchema[]>
): string | null {
    for (const [serverId, tools] of Object.entries(toolsByServer)) {
        if (tools.some((t) => t.name === toolName)) {
            return serverId;
        }
    }
    return null;
}

