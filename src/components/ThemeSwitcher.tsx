import { Palette } from 'lucide-react';
import './ThemeSwitcher.css';

const THEMES = [
    { id: 'ayu-mirage', name: 'Ayu Mirage', emoji: '🌫️' },
    { id: 'arctic-ice', name: 'Arctic Ice', emoji: '🏔️' },
    { id: 'duotone-dark', name: 'DuoTone Dark', emoji: '🌙' },
    { id: 'duotone-sea', name: 'DuoTone Sea', emoji: '🌊' },
    { id: 'duotone-forest', name: 'DuoTone Forest', emoji: '🌲' },
];

export function ThemeSwitcher() {
    const currentTheme = localStorage.getItem('hoot-theme') || 'ayu-mirage';

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
                        data-tooltip={theme.name}
                        className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                        onClick={() => switchTheme(theme.id)}
                    >
                        <span className="theme-emoji">{theme.emoji}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

