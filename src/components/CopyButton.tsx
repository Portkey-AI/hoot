import { memo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from '../stores/toastStore';
import './CopyButton.css';

interface CopyButtonProps {
    content: string;
    label?: string;
    size?: 'sm' | 'md';
}

export const CopyButton = memo(function CopyButton({
    content,
    label = 'Copy',
    size = 'md',
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            // Toast removed - the checkmark icon is clear enough feedback

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy', 'Clipboard access denied');
        }
    };

    return (
        <button
            className={`copy-btn copy-btn-${size}`}
            onClick={handleCopy}
            title={label}
            aria-label={label}
        >
            {copied ? <Check size={size === 'sm' ? 14 : 16} /> : <Copy size={size === 'sm' ? 14 : 16} />}
            {size === 'md' && <span>{copied ? 'Copied!' : 'Copy'}</span>}
        </button>
    );
});

