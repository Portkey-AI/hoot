# Tool State Management

## Overview

Hoot now maintains persistent state for tools and their parameters, all securely stored in browser localStorage and scoped to each server. This enhances the user experience by remembering your work across sessions.

## Features

### 1. Tool Execution State

Every time a tool is successfully executed, Hoot records:
- **Last Execution Time**: When the tool was last run
- **Execution Count**: How many times the tool has been executed

This information is stored per server, so the same tool on different servers has separate execution history.

### 2. Parameter Persistence

When you enter parameters for a tool, Hoot automatically saves them (with a 500ms debounce). The next time you select that tool:
- Previously entered values are automatically restored
- Parameters are merged with schema defaults to handle schema changes gracefully
- Empty default values (empty strings, false booleans, empty arrays/objects) are not saved

### 3. Visual Indicators

In the Tools Sidebar, you'll see:
- ✓ **Green checkmark icon**: Tool has been executed at least once (hover to see execution count)
- **Blue dot**: Tool has saved parameters but hasn't been executed yet

### 4. Data Scoping

All data is scoped by server ID, ensuring:
- Tool state for "Server A" doesn't interfere with "Server B"
- When a server is deleted, all its associated tool state is automatically cleaned up
- Each server maintains its own parameter values, even for tools with the same name

## Storage Details

- **Storage Type**: Browser localStorage
- **Storage Key**: `hoot-tool-state`
- **Data Structure**:
  ```typescript
  {
    serverData: {
      [serverId: string]: {
        toolStates: {
          [toolName: string]: {
            lastExecuted: Date;
            executionCount: number;
          }
        },
        toolParameters: {
          [toolName: string]: {
            [parameterName: string]: any;
          }
        }
      }
    }
  }
  ```

## Security

- Data is stored in localStorage, which is:
  - Scoped to the origin (protocol + domain + port)
  - Not accessible by other websites
  - Stored locally on your device only
  - Not transmitted over the network

## API

The `useToolStateStore` provides the following methods:

```typescript
// Record a successful tool execution
recordToolExecution(serverId: string, toolName: string): void

// Save parameter values for a tool
saveToolParameters(serverId: string, toolName: string, parameters: ToolParameterValues): void

// Retrieve saved parameters for a tool
getToolParameters(serverId: string, toolName: string): ToolParameterValues | undefined

// Get execution state for a tool
getToolState(serverId: string, toolName: string): ToolState | undefined

// Clear all data for a server
clearServerData(serverId: string): void

// Clear parameters for a specific tool
clearToolParameters(serverId: string, toolName: string): void
```

## Implementation Notes

1. **Automatic Cleanup**: When a server is removed from the app, all associated tool state is automatically deleted
2. **Debounced Saves**: Parameter changes are debounced by 500ms to avoid excessive writes to localStorage
3. **Date Handling**: Date objects are properly serialized and deserialized using custom storage middleware
4. **Graceful Degradation**: If saved parameters don't match the current schema, they're merged with defaults

## Future Enhancements

Potential future additions could include:
- Export/import tool state
- Clear all tool state for a server (manual cleanup)
- Tool execution history (not just count, but actual execution details)
- Parameter templates and presets
- Sharing parameter sets across servers

