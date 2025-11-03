import { Palette } from 'lucide-react';
import './ThemeSwitcher.css';

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

    const currentTheme = localStorage.getItem('hoot-theme') || getDefaultTheme();

    const switchTheme = (themeId: string) => {
        // Use the globally exposed applyTheme function
        if ((window as any).applyTheme) {
            (window as any).applyTheme(themeId);
        }

        localStorage.setItem('hoot-theme', themeId);

        // Force re-render by updating the active state
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === themeId);
        });

        // Regenerate hills with new theme colors
        setTimeout(() => {
            if ((window as any).initializeHills) {
                (window as any).initializeHills();
            }
        }, 100);
    };

    return (
        <div className="theme-switcher-header">
            <button className="theme-trigger" title="Change theme">
                <Palette size={18} />
            </button>

            <div className="theme-dropdown">
                {THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        data-theme={theme.id}
                        data-theme-type={theme.type}
                        data-tooltip={theme.name}
                        className={`theme-option ${currentTheme === theme.id ? 'active' : ''} theme-option-${theme.type}`}
                        onClick={() => switchTheme(theme.id)}
                    >
                        <span className="theme-emoji">{theme.emoji}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

