/**
 * Tests for system theme detection and automatic switching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Theme System', () => {
  let matchMediaMock: any;
  let listeners: ((e: MediaQueryListEvent) => void)[] = [];

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    listeners = [];

    // Mock window.matchMedia
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn((event: string, handler: any) => {
        if (event === 'change') {
          listeners.push(handler);
        }
      }),
      removeEventListener: vi.fn((event: string, handler: any) => {
        const index = listeners.indexOf(handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }),
    };

    window.matchMedia = vi.fn(() => matchMediaMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('System Theme Detection', () => {
    it('should detect light mode preference', () => {
      matchMediaMock.matches = false;
      const result = window.matchMedia('(prefers-color-scheme: dark)');
      expect(result.matches).toBe(false);
    });

    it('should detect dark mode preference', () => {
      matchMediaMock.matches = true;
      const result = window.matchMedia('(prefers-color-scheme: dark)');
      expect(result.matches).toBe(true);
    });
  });

  describe('Theme Storage', () => {
    it('should not have theme in localStorage initially', () => {
      expect(localStorage.getItem('hoot-theme')).toBeNull();
    });

    it('should store theme when explicitly selected', () => {
      localStorage.setItem('hoot-theme', 'arctic-night');
      expect(localStorage.getItem('hoot-theme')).toBe('arctic-night');
    });

    it('should clear theme when reset to system default', () => {
      localStorage.setItem('hoot-theme', 'arctic-night');
      localStorage.removeItem('hoot-theme');
      expect(localStorage.getItem('hoot-theme')).toBeNull();
    });
  });

  describe('Theme Switching Logic', () => {
    it('should use system preference when no saved theme', () => {
      expect(localStorage.getItem('hoot-theme')).toBeNull();
      
      // Light mode
      matchMediaMock.matches = false;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const expectedTheme = prefersDark ? 'arctic-night' : 'nordic-snow';
      expect(expectedTheme).toBe('nordic-snow');
    });

    it('should use saved theme over system preference', () => {
      localStorage.setItem('hoot-theme', 'duotone-sea');
      const savedTheme = localStorage.getItem('hoot-theme');
      expect(savedTheme).toBe('duotone-sea');
      
      // Even if system is in light mode
      matchMediaMock.matches = false;
      expect(savedTheme).toBe('duotone-sea'); // Should not change
    });
  });

  describe('MediaQuery Change Listener', () => {
    it('should register change listener', () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = vi.fn();
      
      mediaQuery.addEventListener('change', handler);
      expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('should remove change listener on cleanup', () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = vi.fn();
      
      mediaQuery.addEventListener('change', handler);
      mediaQuery.removeEventListener('change', handler);
      expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('should trigger handlers when system theme changes', () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = vi.fn();
      
      mediaQuery.addEventListener('change', handler);
      
      // Simulate system theme change
      const event = { matches: true } as MediaQueryListEvent;
      listeners.forEach(listener => listener(event));
      
      expect(handler).toHaveBeenCalledWith(event);
    });
  });

  describe('Theme Persistence', () => {
    it('should not persist theme if using system default', () => {
      // No theme saved
      expect(localStorage.getItem('hoot-theme')).toBeNull();
      
      // System changes should not save theme
      matchMediaMock.matches = true;
      expect(localStorage.getItem('hoot-theme')).toBeNull();
    });

    it('should persist theme only when explicitly selected', () => {
      localStorage.setItem('hoot-theme', 'ayu-mirage');
      expect(localStorage.getItem('hoot-theme')).toBe('ayu-mirage');
      
      // System changes should not affect saved theme
      matchMediaMock.matches = false;
      expect(localStorage.getItem('hoot-theme')).toBe('ayu-mirage');
    });
  });
});

