import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import './CollapsibleJson.css';

interface CollapsibleJsonProps {
    data: any;
    title?: string;
    defaultCollapsed?: boolean;
}

export function CollapsibleJson({ data, title, defaultCollapsed = false }: CollapsibleJsonProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(jsonText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Handle both string and object data
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const lineCount = jsonString.split('\n').length;

    return (
        <div className="collapsible-json">
            <div className="json-header">
                <button
                    className="json-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    {title && <span className="json-title">{title}</span>}
                    <span className="json-meta">
                        {lineCount} line{lineCount !== 1 ? 's' : ''}
                        {isCollapsed && ` • collapsed`}
                    </span>
                </button>
                <button
                    className="json-copy"
                    onClick={handleCopy}
                    title="Copy JSON"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            </div>
            {!isCollapsed && (
                <pre className="json-content">
                    <code>{jsonString}</code>
                </pre>
            )}
        </div>
    );
}

