import { memo, useRef, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import './JsonEditor.css';

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Syntax highlights JSON with colors matching the Ayu Mirage theme
 */
function syntaxHighlightJsonText(text: string): ReactElement[] {
    const elements: ReactElement[] = [];
    let key = 0;

    // Regex patterns for JSON syntax
    const patterns = [
        { regex: /"[^"\\]*(?:\\.[^"\\]*)*"(?=\s*:)/g, className: 'json-key' }, // Keys (strings followed by :)
        { regex: /"[^"\\]*(?:\\.[^"\\]*)*"/g, className: 'json-string' }, // String values
        { regex: /\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g, className: 'json-number' }, // Numbers
        { regex: /\b(true|false)\b/g, className: 'json-boolean' }, // Booleans
        { regex: /\bnull\b/g, className: 'json-null' }, // Null
        { regex: /[{}[\]]/g, className: 'json-bracket' }, // Brackets
        { regex: /[:,]/g, className: 'json-punctuation' }, // Punctuation
    ];

    let lastIndex = 0;
    const tokens: Array<{ start: number; end: number; className: string }> = [];

    // Find all matches
    patterns.forEach((pattern) => {
        const regex = new RegExp(pattern.regex.source, 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
            tokens.push({
                start: match.index,
                end: match.index + match[0].length,
                className: pattern.className,
            });
        }
    });

    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    // Remove overlapping tokens (keep the first one)
    const filteredTokens: typeof tokens = [];
    let lastEnd = -1;
    tokens.forEach((token) => {
        if (token.start >= lastEnd) {
            filteredTokens.push(token);
            lastEnd = token.end;
        }
    });

    // Build the highlighted output
    filteredTokens.forEach((token) => {
        // Add any plain text before this token
        if (lastIndex < token.start) {
            elements.push(<span key={key++}>{text.slice(lastIndex, token.start)}</span>);
        }

        // Add the highlighted token
        elements.push(
            <span key={key++} className={token.className}>
                {text.slice(token.start, token.end)}
            </span>
        );

        lastIndex = token.end;
    });

    // Add any remaining plain text
    if (lastIndex < text.length) {
        elements.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return elements;
}

export const JsonEditor = memo(function JsonEditor({
    value,
    onChange,
    placeholder,
    className = '',
}: JsonEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Sync scroll between textarea and highlight layer
    const handleScroll = () => {
        if (textareaRef.current) {
            setScrollTop(textareaRef.current.scrollTop);
            setScrollLeft(textareaRef.current.scrollLeft);
        }
    };

    useEffect(() => {
        if (highlightRef.current) {
            highlightRef.current.scrollTop = scrollTop;
            highlightRef.current.scrollLeft = scrollLeft;
        }
    }, [scrollTop, scrollLeft]);

    const highlightedContent = value ? syntaxHighlightJsonText(value) : null;

    return (
        <div className={`json-editor-wrapper ${className}`}>
            <div
                ref={highlightRef}
                className="json-editor-highlight"
                aria-hidden="true"
            >
                <pre>{highlightedContent}</pre>
            </div>
            <textarea
                ref={textareaRef}
                className="json-editor-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                spellCheck={false}
            />
        </div>
    );
});

