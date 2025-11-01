import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeHills } from './lib/hillsGenerator';

// Initialize randomized hills on page load (new hills every time!)
initializeHills();

// Expose initializeHills globally for theme switcher
if (typeof window !== 'undefined') {
  (window as any).initializeHills = initializeHills;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

