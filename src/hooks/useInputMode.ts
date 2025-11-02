/**
 * Hook for managing input mode preference (form vs json)
 * Uses localStorage for persistence across sessions
 */

import { useState, useEffect } from 'react';
import { getPreference, setPreference } from '../lib/preferences';
import type { InputMode } from '../types';

export function useInputMode() {
  const [inputMode, setInputModeState] = useState<InputMode>(() => 
    getPreference('input-mode', 'form')
  );

  const setInputMode = (mode: InputMode) => {
    setInputModeState(mode);
    setPreference('input-mode', mode);
  };

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hoot-input-mode' && e.newValue) {
        try {
          const newMode = JSON.parse(e.newValue) as InputMode;
          setInputModeState(newMode);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { inputMode, setInputMode };
}

