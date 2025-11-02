import { memo, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { formatShortcut } from '../hooks/useKeyboardShortcuts';
import './Modal.css';
import './KeyboardShortcutsModal.css';

export interface ShortcutDefinition {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
}

export interface ShortcutCategory {
    category: string;
    shortcuts: ShortcutDefinition[];
}

interface KeyboardShortcutsModalProps {
    onClose: () => void;
    shortcuts: ShortcutCategory[];
}

export const KeyboardShortcutsModal = memo(function KeyboardShortcutsModal({
    onClose,
    shortcuts,
}: KeyboardShortcutsModalProps) {
    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-row">
                        <Keyboard size={24} />
                        <h2>Keyboard Shortcuts</h2>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="shortcuts-grid">
                        {shortcuts.map((group) => (
                            <div key={group.category} className="shortcut-category">
                                <h3 className="shortcut-category-title">{group.category}</h3>
                                <div className="shortcut-list">
                                    {group.shortcuts.map((shortcut, index) => (
                                        <div key={index} className="shortcut-item">
                                            <span className="shortcut-description">{shortcut.description}</span>
                                            <kbd className="shortcut-key">{formatShortcut(shortcut)}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
});

