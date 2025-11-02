import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    category?: string;
    handler: (e: KeyboardEvent) => void;
    preventDefault?: boolean;
}

export interface ShortcutGroup {
    category: string;
    shortcuts: Array<Omit<KeyboardShortcut, 'handler' | 'category'>>;
}

/**
 * Hook to register keyboard shortcuts
 * Handles both Windows/Linux (Ctrl) and macOS (Cmd) modifiers
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea (unless explicitly overridden)
            const target = e.target as HTMLElement;
            const isInputField =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            for (const shortcut of shortcuts) {
                // Match key (case-insensitive)
                const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
                if (!keyMatches) continue;

                // Match modifiers
                const ctrlMatches = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
                const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
                const altMatches = shortcut.alt ? e.altKey : !e.altKey;
                const metaMatches = shortcut.meta ? e.metaKey : true; // Meta is optional on Mac

                if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
                    // Skip if in input field (for most shortcuts)
                    if (isInputField && !shortcut.preventDefault) {
                        continue;
                    }

                    if (shortcut.preventDefault !== false) {
                        e.preventDefault();
                    }

                    shortcut.handler(e);
                    break;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Format shortcut for display (e.g., "Ctrl+K" or "⌘K" on Mac)
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcut>): string {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const parts: string[] = [];

    if (shortcut.ctrl) {
        parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) {
        parts.push(isMac ? '⇧' : 'Shift');
    }
    if (shortcut.alt) {
        parts.push(isMac ? '⌥' : 'Alt');
    }
    if (shortcut.key) {
        // Capitalize single letters, keep special keys as-is
        const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
        parts.push(key);
    }

    return isMac ? parts.join('') : parts.join('+');
}

/**
 * Get a human-readable shortcut hint for tooltips
 */
export function getShortcutHint(description: string, shortcut: Partial<KeyboardShortcut>): string {
    return `${description} (${formatShortcut(shortcut)})`;
}

