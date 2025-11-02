# Markdown Rendering & Streaming Support

## Overview

The chat interface now supports **rich markdown rendering** and **streaming responses** from LLMs, providing a much better user experience when interacting with AI assistants.

## Features

### 1. Markdown Rendering

LLM responses are now rendered with full markdown support, including:

- **Headings** (H1-H6) with proper hierarchy
- **Text formatting**: bold, italic, strikethrough
- **Code blocks** with syntax highlighting
- **Inline code** with distinct styling
- **Lists**: ordered, unordered, and nested
- **Task lists** (GitHub Flavored Markdown)
- **Links** that open in new tabs
- **Tables** with proper formatting
- **Blockquotes** with styled borders
- **Horizontal rules**
- **Images** with responsive sizing

### 2. Streaming Responses

LLM responses now stream in real-time:

- **Token-by-token display**: See responses as they're generated
- **Immediate feedback**: No waiting for the entire response
- **Better UX**: More natural conversational feel
- **Tool call support**: Streaming works seamlessly with tool execution

### 3. Syntax Highlighting

Code blocks in markdown responses are automatically syntax highlighted using `highlight.js` with support for:

- JavaScript/TypeScript
- Python
- Shell/Bash
- JSON
- And many more languages

## Technical Implementation

### New Components

#### `MarkdownRenderer.tsx`
A React component that renders markdown content using:
- `react-markdown` for parsing and rendering
- `remark-gfm` for GitHub Flavored Markdown support
- `rehype-highlight` for syntax highlighting
- `rehype-raw` for HTML support

```tsx
<MarkdownRenderer content={message.content} />
```

#### `MarkdownRenderer.css`
Comprehensive styles that integrate with the existing theme system:
- Respects CSS variables for colors and spacing
- Theme-aware syntax highlighting
- Responsive design for all markdown elements
- Consistent with Hoot's design system

### Streaming Implementation

The `HybridInterface` component now uses `createChatCompletionStream()` instead of `createChatCompletion()`:

```typescript
const stream = client.createChatCompletionStream({
    messages: currentMessages,
    tools: openaiTools.length > 0 ? openaiTools : undefined,
});

for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta;
    if (delta.content) {
        accumulatedContent += delta.content;
        // Update message in real-time
    }
}
```

## Dependencies Added

- `react-markdown`: Markdown parser and renderer
- `rehype-highlight`: Syntax highlighting for code blocks
- `rehype-raw`: HTML support in markdown
- `remark-gfm`: GitHub Flavored Markdown support
- `@types/react-syntax-highlighter`: TypeScript types

## User Experience Improvements

1. **Better Readability**: Structured content with proper headings, lists, and formatting
2. **Code Visibility**: Syntax-highlighted code blocks are easier to read and understand
3. **Live Feedback**: Streaming shows the AI is thinking and working
4. **Professional Look**: Markdown rendering matches modern chat interfaces like ChatGPT

## Example Use Cases

### Before
```
User: Show me a Python function to calculate Fibonacci numbers
