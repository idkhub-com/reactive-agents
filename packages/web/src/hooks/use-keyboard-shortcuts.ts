'use client';

import { useEffect, useMemo } from 'react';

// Detect user's operating system
export const useOperatingSystem = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('linux')) return 'linux';

    return 'unknown';
  }, []);
};

// Get the appropriate modifier key symbol
export const useModifierKey = () => {
  const os = useOperatingSystem();

  return useMemo(() => {
    switch (os) {
      case 'mac':
        return '⌘';
      case 'windows':
        return 'Ctrl';
      case 'linux':
        return 'Ctrl';
      default:
        return 'Ctrl';
    }
  }, [os]);
};

// Check if the correct modifier key is pressed
export const isModifierPressed = (
  event: KeyboardEvent,
  os: string,
): boolean => {
  if (os === 'mac') {
    return event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  }
  return event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
};

// Hook for handling keyboard shortcuts
interface UseKeyboardShortcutsOptions {
  onShortcutAction: (key: string) => void;
  shortcuts: string[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onShortcutAction,
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) => {
  const os = useOperatingSystem();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when modifier is pressed
      if (!isModifierPressed(event, os)) return;

      // Check if the pressed key matches any of our shortcuts
      const key = event.key.toLowerCase();
      if (shortcuts.includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        onShortcutAction(key);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onShortcutAction, shortcuts, enabled, os]);
};
