import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeHills } from './lib/hillsGenerator';

// Import all theme CSS files so they get bundled
import arcticIceTheme from './themes/arctic-ice.css?inline';
import ayuMirageTheme from './themes/ayu-mirage.css?inline';
import duotoneDarkTheme from './themes/duotone-dark.css?inline';
import duotoneSeaTheme from './themes/duotone-sea.css?inline';
import duotoneForestTheme from './themes/duotone-forest.css?inline';

// Create a map of themes
const themes: Record<string, string> = {
  'arctic-ice': arcticIceTheme,
  'ayu-mirage': ayuMirageTheme,
  'duotone-dark': duotoneDarkTheme,
  'duotone-sea': duotoneSeaTheme,
  'duotone-forest': duotoneForestTheme,
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

// Load saved theme or default
const savedTheme = localStorage.getItem('hoot-theme') || 'ayu-mirage';
applyTheme(savedTheme);

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

