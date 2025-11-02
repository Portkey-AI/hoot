import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import './MarkdownRenderer.css';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
    isStreaming?: boolean;
}

/**
 * Sanitizes markdown content to ensure it renders properly during streaming
 * by handling incomplete markdown syntax.
 * 
 * Strategy based on: https://github.com/orgs/remarkjs/discussions/1332
 * We buffer incomplete constructs and only render complete elements.
 */
function sanitizeStreamingMarkdown(content: string): string {
    let result = content;

    // Handle incomplete code blocks
    const codeFenceCount = (content.match(/^```/gm) || []).length;
    if (codeFenceCount % 2 !== 0) {
        // Find the last incomplete code fence
        const lastFenceIndex = content.lastIndexOf('```');
        if (lastFenceIndex !== -1) {
            const afterFence = content.slice(lastFenceIndex + 3);
            const hasNewline = afterFence.includes('\n');

            // If there's a newline after the fence, it's likely starting a code block
            // Keep it but close it temporarily for clean rendering
            if (hasNewline && !afterFence.trim().endsWith('```')) {
                result = content + '\n```';
            }
        }
    }

    // Handle incomplete inline code (single backticks)
    const backtickCount = (content.match(/(?<!`)`(?!`)/g) || []).length;
    if (backtickCount % 2 !== 0) {
        // Find position of last unclosed backtick
        const lastBacktickIndex = content.lastIndexOf('`');
        const afterBacktick = content.slice(lastBacktickIndex + 1);

        // Only close if there's actual content after (not just whitespace)
        if (afterBacktick.trim().length > 0) {
            result = content + '`';
        }
    }

    // Handle incomplete links [text](url
    // Match opening brackets that don't have a closing parenthesis
    const incompleteLinkMatch = content.match(/\[([^\]]*)\]\((?!.*?\))/);
    if (incompleteLinkMatch) {
        // Temporarily close the incomplete link
        result = content + ')';
    }

    // Handle incomplete bold/italic
    // Count unmatched ** or *
    const boldCount = (content.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
        result = result + '**';
    }

    return result;
}

export function MarkdownRenderer({ content, className = '', isStreaming = false }: MarkdownRendererProps) {
    const sanitizedContent = useMemo(() => {
        return isStreaming ? sanitizeStreamingMarkdown(content) : content;
    }, [content, isStreaming]);

    // Don't render empty content
    if (!content && !sanitizedContent) {
        return null;
    }

    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                    // Customize code blocks
                    code({ node, inline, className, children, ...props }: any) {
                        return inline ? (
                            <code className="inline-code" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Customize links to open in new tab
                    a({ node, children, href, ...props }: any) {
                        return (
                            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                                {children}
                            </a>
                        );
                    },
                }}
            >
                {sanitizedContent}
            </ReactMarkdown>
            {isStreaming && <span className="streaming-cursor">▊</span>}
        </div>
    );
}

