import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeHills } from './lib/hillsGenerator';

// Import all theme CSS files so they get bundled
// Dark Themes
import arcticNightTheme from './themes/arctic-night.css?inline';
import ayuMirageTheme from './themes/ayu-mirage.css?inline';
import duotoneDarkTheme from './themes/duotone-dark.css?inline';
import duotoneSeaTheme from './themes/duotone-sea.css?inline';
import duotoneForestTheme from './themes/duotone-forest.css?inline';
// Light Themes
import nordicSnowTheme from './themes/nordic-snow.css?inline';
import ayuLightTheme from './themes/ayu-light.css?inline';
import duotoneLightTheme from './themes/duotone-light.css?inline';

// Create a map of themes
const themes: Record<string, string> = {
  'arctic-night': arcticNightTheme,
  'ayu-mirage': ayuMirageTheme,
  'duotone-dark': duotoneDarkTheme,
  'duotone-sea': duotoneSeaTheme,
  'duotone-forest': duotoneForestTheme,
  'nordic-snow': nordicSnowTheme,
  'ayu-light': ayuLightTheme,
  'duotone-light': duotoneLightTheme,
};

// Function to apply theme
function applyTheme(themeId: string) {
  const themeCSS = themes[themeId];
  if (!themeCSS) return;

  let styleElement = document.getElementById('theme-style') as HTMLStyleElement;
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'theme-style';
    document.head.appendChild(styleElement);
  }
  styleElement.textContent = themeCSS;
}

// Get default theme based on system preference
function getDefaultTheme(): string {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'arctic-night' : 'nordic-snow';
}

// Load saved theme or default to system preference
const savedTheme = localStorage.getItem('hoot-theme');
const themeToApply = savedTheme || getDefaultTheme();
applyTheme(themeToApply);

// If no saved theme, save the detected default
if (!savedTheme) {
  localStorage.setItem('hoot-theme', themeToApply);
}

// Expose theme functions globally
if (typeof window !== 'undefined') {
  (window as any).applyTheme = applyTheme;
  (window as any).initializeHills = initializeHills;
}

// Initialize randomized hills on page load (new hills every time!)
initializeHills();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

