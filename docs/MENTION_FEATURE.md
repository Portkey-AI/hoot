# Pin Servers & Tools Feature

## Overview

The chat interface now supports pinning specific MCP servers or tools to the conversation context. When you pin servers or tools, they will always be included in the tool list sent to the LLM, bypassing semantic filtering.

**Pills appear as visual tags at the top of the input box**, making them easy to see and manage while keeping your message text clean.

## How to Use

### Adding Pins

**Two ways to add pins:**

1. **Click "Filter servers and tools" button** (or `+` if you already have pins)
   - A dropdown appears with a search box and list
   - Type to search or browse the list
   - Click an item or press **Enter** to pin it

2. **Type @ in the message box**
   - Dropdown appears automatically
   - Type after @ to filter (e.g., `@weather` or `@github/search`)
   - The @ and search text are removed when you select

### Searching

- Type in the search box to filter by server or tool name
- **Spaces are allowed** in your search query
- Use arrow keys (↑/↓) to navigate results
- Press **Enter** to select the highlighted item
- Press **Escape** to close and stop searching

### Pin Display

- **Server pill**: Shows server name with server icon
- **Tool pill**: Shows `ServerName/ToolName` with tool icon
- Pills appear at the top of the input box
- Pills persist across messages until you remove them

### Managing Pins

- **Remove**: Click the `×` button on any pill
- **Add more**: Click the `+` button in the pill row
- **Clear all**: Clear the chat to reset pins
- **Persist**: Pins stay active until explicitly removed

## Behavior Changes

### When Pins Are Active

1. **Semantic Filtering Bypassed**: Only pinned tools are included
2. **Indicator Updated**: Info bar shows "X Pinned" in orange
3. **No Filter Time**: Shown as 0ms since filtering is bypassed
4. **Tool Count**: Shows number of pinned tools vs total available

### Filter Metrics Display

The filter metrics card in the chat shows which tools were used:
- When pinned: Shows the exact tools from your pins
- When filtered: Shows semantically filtered tools
- Hover over the metric to see detailed breakdown by server

## Technical Details

### Architecture

- **Component**: `MentionInput.tsx` - Reusable component with pill management
- **State**: Pins stored separately from message text
- **Integration**: Integrated into `HybridInterface` component
- **Filtering**: Modified `getFilteredTools()` to prioritize pinned tools
- **Persistence**: Pins remain active across messages

### Key Files Modified

1. `src/components/MentionInput.tsx` - Pin input component
2. `src/components/MentionInput.css` - Styles for pills and dropdown
3. `src/components/HybridInterface.tsx` - Integrated pin functionality
4. `src/components/HybridInterface.css` - Updated input container styles

### Features Implemented

✅ "Filter servers and tools" button (becomes + when pills exist)
✅ @ mention support for quick pinning
✅ Search input with fuzzy filtering (spaces allowed)
✅ Visual pill tags with icons
✅ Keyboard navigation (arrow keys, Enter, Escape)
✅ Click-to-select from dropdown
✅ Remove pills by clicking × button
✅ Bypass semantic filtering for pinned tools
✅ Updated chat indicators to show pinned status
✅ Persistent across messages
✅ Pills integrated into input box design
✅ @ text is removed after selection

## Example Usage

### Pin a Server via @
Type `@weather` → select from dropdown → @ is removed, pill appears

### Pin a Tool via @
Type `@github/search` → select → @ is removed, pill shows `github/search_repositories`

### Pin via Button
Click "Filter servers and tools" → search "filesystem" → select → pill appears

### Multiple Pins
Use @ or click + to add as many pins as you need

## UI Indicators

### Top Info Bar

- **No Pins**: Shows semantic filtering status (green "Filtered")
- **With Pins**: Shows orange "X Pinned" indicator
- **Filter Time**: Only shown for semantic filtering, not pinned tools

### Input Box

- **Initial state**: Shows "Filter servers and tools" button at top
- **With pills**: Shows pills at top, `+` button to add more
- **@ mentions**: Type @ anywhere to trigger dropdown
- **Clean text**: Your message text stays separate from pills

### Chat Messages

Filter metrics cards show which tools were actually used for each LLM call, with color-coded indicators based on whether filtering or pinning was active.

## Notes

- Pills persist across messages until explicitly removed
- Clearing the chat also clears all pins
- The feature works alongside existing semantic filtering
- When pinned tools are used, semantic filtering is completely bypassed for better control
- Pills are purely visual - they don't add text to your messages

