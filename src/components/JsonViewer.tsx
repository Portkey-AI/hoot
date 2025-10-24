import { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './JsonViewer.css';

interface JsonViewerProps {
    content: string;
    className?: string;
    preserveQuotes?: boolean; // If true, keep quotes around unescaped JSON strings
}

/**
 * Attempts to detect and unescape JSON that has been escaped/stringified multiple times.
 * Returns the parsed object if successful, or the original string if not JSON.
 */
function unescapeAndParseJson(content: string): unknown {
    let current = content.trim();
    let attempts = 0;
    const maxAttempts = 5; // Prevent infinite loops

    while (attempts < maxAttempts) {
        try {
            const parsed = JSON.parse(current);

            // If parsed result is a string, it might be escaped JSON - try again
            if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
                current = parsed;
                attempts++;
                continue;
            }

            // Successfully parsed to an object/array
            return parsed;
        } catch {
            // Not valid JSON, return as is
            return current;
        }
    }

    return current;
}

/**
 * Extracts JSON from MCP-style response format
 * Example: [{ type: "text", text: "{...}" }] -> "{...}"
 */
function extractMCPContent(obj: unknown): unknown {
    // Handle array of content items
    if (Array.isArray(obj)) {
        // If it's a single-item array with type="text", extract the text
        if (obj.length === 1 &&
            typeof obj[0] === 'object' &&
            obj[0] !== null &&
            'type' in obj[0] &&
            obj[0].type === 'text' &&
            'text' in obj[0]) {
            const textContent = (obj[0] as any).text;
            // Try to parse the text as JSON
            const parsed = unescapeAndParseJson(textContent);
            return typeof parsed === 'string' ? parsed : parsed;
        }

        // Handle multiple content items
        if (obj.length > 0 &&
            obj.every(item =>
                typeof item === 'object' &&
                item !== null &&
                'type' in item &&
                'text' in item
            )) {
            // Extract all text content
            const texts = obj.map(item => {
                const textContent = (item as any).text;
                const parsed = unescapeAndParseJson(textContent);
                return parsed;
            });

            // If we only have one text item, return it directly
            if (texts.length === 1) {
                return texts[0];
            }

            return texts;
        }
    }

    return obj;
}

interface CollapsibleNodeProps {
    value: unknown;
    indent: number;
}

function CollapsibleNode({ value, indent }: CollapsibleNodeProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const indentStr = '  '.repeat(indent);

    if (value === null) {
        return <span className="json-null">null</span>;
    }

    if (typeof value === 'boolean') {
        return <span className="json-boolean">{String(value)}</span>;
    }

    if (typeof value === 'number') {
        return <span className="json-number">{String(value)}</span>;
    }

    if (typeof value === 'string') {
        return <span className="json-string">"{value}"</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="json-bracket">[]</span>;
        }

        return (
            <>
                <span
                    className="json-collapse-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </span>
                <span className="json-bracket">[</span>
                {!isCollapsed && (
                    <>
                        <span>{'\n'}</span>
                        {value.map((item, index) => (
                            <span key={index}>
                                <span>{indentStr}  </span>
                                <CollapsibleNode
                                    value={item}
                                    indent={indent + 1}
                                />
                                {index < value.length - 1 && <span className="json-punctuation">,</span>}
                                <span>{'\n'}</span>
                            </span>
                        ))}
                        <span>{indentStr}</span>
                    </>
                )}
                {isCollapsed && <span className="json-ellipsis">...</span>}
                <span className="json-bracket">]</span>
            </>
        );
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);

        if (entries.length === 0) {
            return <span className="json-bracket">{'{}'}</span>;
        }

        return (
            <>
                <span
                    className="json-collapse-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </span>
                <span className="json-bracket">{'{'}</span>
                {!isCollapsed && (
                    <>
                        <span>{'\n'}</span>
                        {entries.map(([k, v], index) => (
                            <span key={k}>
                                <span>{indentStr}  </span>
                                <span className="json-key">"{k}"</span>
                                <span className="json-punctuation">: </span>
                                <CollapsibleNode
                                    value={v}
                                    indent={indent + 1}
                                />
                                {index < entries.length - 1 && <span className="json-punctuation">,</span>}
                                <span>{'\n'}</span>
                            </span>
                        ))}
                        <span>{indentStr}</span>
                    </>
                )}
                {isCollapsed && <span className="json-ellipsis">...</span>}
                <span className="json-bracket">{'}'}</span>
            </>
        );
    }

    return <span>{String(value)}</span>;
}

export const JsonViewer = memo(function JsonViewer({
    content,
    className = '',
    preserveQuotes = false
}: JsonViewerProps) {
    const highlightedContent = useMemo(() => {
        // Try to detect and unescape JSON
        let unescaped = unescapeAndParseJson(content);

        // Extract content from MCP response format
        unescaped = extractMCPContent(unescaped);

        // If it's a string (not parsed JSON), display as plain text
        if (typeof unescaped === 'string') {
            // If we shouldn't preserve quotes and the string is wrapped in quotes, remove them
            let displayString = unescaped;
            if (!preserveQuotes && displayString.startsWith('"') && displayString.endsWith('"') && displayString.length > 1) {
                displayString = displayString.slice(1, -1);
            }
            return <span>{displayString}</span>;
        }

        // Otherwise, render the collapsible JSON tree
        return <CollapsibleNode value={unescaped} indent={0} />;
    }, [content, preserveQuotes]);

    return <pre className={`json-viewer ${className}`}>{highlightedContent}</pre>;
});
