import { Palette } from 'lucide-react';
import './ThemeSwitcher.css';
import { useState, useEffect } from 'react';

const THEMES = [
    // Dark Themes
    { id: 'arctic-night', name: 'Arctic Night', emoji: '🌑', type: 'dark' },
    { id: 'ayu-mirage', name: 'Ayu Mirage', emoji: '🌀', type: 'dark' },
    { id: 'duotone-dark', name: 'DuoTone Dark', emoji: '🌙', type: 'dark' },
    { id: 'duotone-sea', name: 'DuoTone Sea', emoji: '🌊', type: 'dark' },
    { id: 'duotone-forest', name: 'DuoTone Forest', emoji: '🌲', type: 'dark' },
    // Light Themes
    { id: 'nordic-snow', name: 'Nordic Snow', emoji: '❄️', type: 'light' },
    { id: 'ayu-light', name: 'Ayu Light', emoji: '☀️', type: 'light' },
    { id: 'duotone-light', name: 'DuoTone Light', emoji: '✨', type: 'light' },
] as const;

export function ThemeSwitcher() {
    const getDefaultTheme = () => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'arctic-night' : 'nordic-snow';
    };

    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('hoot-theme') || getDefaultTheme();
    });

    const [isSystemDefault, setIsSystemDefault] = useState(() => {
        return !localStorage.getItem('hoot-theme');
    });

    const switchTheme = (themeId: string) => {
        // Use the globally exposed applyTheme function
        if ((window as any).applyTheme) {
            (window as any).applyTheme(themeId);
        }

        localStorage.setItem('hoot-theme', themeId);
        setCurrentTheme(themeId);
        setIsSystemDefault(false);

        // Regenerate hills with new theme colors
        setTimeout(() => {
            if ((window as any).initializeHills) {
                (window as any).initializeHills();
            }
        }, 100);
    };

    const resetToSystemDefault = () => {
        // Remove the saved theme preference
        localStorage.removeItem('hoot-theme');
        
        // Apply the system default theme
        const systemTheme = getDefaultTheme();
        if ((window as any).applyTheme) {
            (window as any).applyTheme(systemTheme);
        }

        setCurrentTheme(systemTheme);
        setIsSystemDefault(true);

        // Regenerate hills with new theme colors
        setTimeout(() => {
            if ((window as any).initializeHills) {
                (window as any).initializeHills();
            }
        }, 100);
    };

    // Listen for system theme changes when in system default mode
    useEffect(() => {
        if (!isSystemDefault) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'arctic-night' : 'nordic-snow';
            setCurrentTheme(newTheme);
            if ((window as any).applyTheme) {
                (window as any).applyTheme(newTheme);
            }
            if ((window as any).initializeHills) {
                (window as any).initializeHills();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [isSystemDefault]);

    return (
        <div className="theme-switcher-header">
            <button className="theme-trigger" title="Change theme">
                <Palette size={18} />
            </button>

            <div className="theme-dropdown">
                {/* System Default Option */}
                <button
                    data-theme="system"
                    data-tooltip="System Default"
                    className={`theme-option ${isSystemDefault ? 'active' : ''} theme-option-system`}
                    onClick={resetToSystemDefault}
                >
                    <span className="theme-emoji">🌗</span>
                </button>
                
                {/* Divider */}
                <div className="theme-divider"></div>
                
                {THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        data-theme={theme.id}
                        data-theme-type={theme.type}
                        data-tooltip={theme.name}
                        className={`theme-option ${!isSystemDefault && currentTheme === theme.id ? 'active' : ''} theme-option-${theme.type}`}
                        onClick={() => switchTheme(theme.id)}
                    >
                        <span className="theme-emoji">{theme.emoji}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

