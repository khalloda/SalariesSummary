import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;
}

/**
 * Hook to bind keyboard shortcuts
 * @param shortcuts - Array of shortcut definitions
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        if (shortcut.enabled === false) return;

        const keyMatch = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shift !== undefined ? (shortcut.shift === e.shiftKey) : true;
        const altMatch = shortcut.alt !== undefined ? (shortcut.alt === e.altKey) : true;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

/**
 * Helper to create Ctrl+S / Cmd+S shortcut
 */
export function createSaveShortcut(handler: () => void, enabled: boolean = true): KeyboardShortcut {
  return {
    key: 's',
    ctrl: true,
    meta: true, // Also support Cmd+S on Mac
    handler: (e) => {
      e.preventDefault();
      handler();
    },
    enabled,
  };
}

/**
 * Helper to create Esc shortcut
 */
export function createEscapeShortcut(handler: () => void, enabled: boolean = true): KeyboardShortcut {
  return {
    key: 'Escape',
    handler: (e) => {
      e.preventDefault();
      handler();
    },
    enabled,
  };
}
