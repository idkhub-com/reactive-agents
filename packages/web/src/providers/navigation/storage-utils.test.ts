import {
  checkStorageAvailability,
  getSelectedAgentName,
  removeSelectedAgentName,
  saveSelectedAgentName,
} from '@web/providers/navigation/storage-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('storage-utils', () => {
  let mockStore: Record<string, string>;
  let mockLocalStorage: Storage;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockStore = {};
    mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
      key: vi.fn((index: number) => Object.keys(mockStore)[index] ?? null),
      get length() {
        return Object.keys(mockStore).length;
      },
    };

    originalLocalStorage = global.localStorage;
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('checkStorageAvailability', () => {
    it('returns true when localStorage is available and working', () => {
      const result = checkStorageAvailability();
      expect(result).toBe(true);
    });

    it('returns false when localStorage.setItem throws', () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = checkStorageAvailability();
      expect(result).toBe(false);
    });

    it('returns false when localStorage.removeItem throws', () => {
      vi.mocked(mockLocalStorage.removeItem).mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const result = checkStorageAvailability();
      expect(result).toBe(false);
    });
  });

  describe('saveSelectedAgentName', () => {
    it('saves agent name to localStorage', () => {
      saveSelectedAgentName('Test Agent');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'selectedAgentName',
        'Test Agent',
      );
      expect(mockStore.selectedAgentName).toBe('Test Agent');
    });

    it('handles special characters in agent name', () => {
      saveSelectedAgentName('Test Agent <script>alert("xss")</script>');
      expect(mockStore.selectedAgentName).toBe(
        'Test Agent <script>alert("xss")</script>',
      );
    });

    it('handles empty string agent name', () => {
      saveSelectedAgentName('');
      expect(mockStore.selectedAgentName).toBe('');
    });

    it('overwrites existing agent name', () => {
      saveSelectedAgentName('First Agent');
      expect(mockStore.selectedAgentName).toBe('First Agent');

      saveSelectedAgentName('Second Agent');
      expect(mockStore.selectedAgentName).toBe('Second Agent');
    });

    it('does not throw and logs warning when save fails after availability check', () => {
      let callCount = 0;
      vi.mocked(mockLocalStorage.setItem).mockImplementation(
        (key: string, value: string) => {
          callCount++;
          if (callCount === 1) {
            // Let availability check pass
            mockStore[key] = value;
          } else {
            throw new Error('QuotaExceededError');
          }
        },
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // intentionally empty - suppress console output in tests
      });

      expect(() => saveSelectedAgentName('Test Agent')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save to localStorage:',
        expect.any(Error),
      );
    });

    it('does nothing when storage is not available', () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      // Should not throw, just silently fail
      expect(() => saveSelectedAgentName('Test Agent')).not.toThrow();
      expect(mockStore.selectedAgentName).toBeUndefined();
    });
  });

  describe('getSelectedAgentName', () => {
    it('returns agent name from localStorage', () => {
      mockStore.selectedAgentName = 'Test Agent';
      const result = getSelectedAgentName();
      expect(result).toBe('Test Agent');
    });

    it('returns null when no agent name is stored', () => {
      const result = getSelectedAgentName();
      expect(result).toBe(null);
    });

    it('returns null and logs warning when read fails', () => {
      // Let availability check pass
      let readCallCount = 0;
      vi.mocked(mockLocalStorage.getItem).mockImplementation(() => {
        readCallCount++;
        if (readCallCount === 1) {
          throw new Error('SecurityError');
        }
        return null;
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // intentionally empty - suppress console output in tests
      });

      const result = getSelectedAgentName();
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read from localStorage:',
        expect.any(Error),
      );
    });

    it('returns null when storage is not available', () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const result = getSelectedAgentName();
      expect(result).toBe(null);
    });
  });

  describe('removeSelectedAgentName', () => {
    it('removes agent name from localStorage', () => {
      mockStore.selectedAgentName = 'Test Agent';
      expect(mockStore.selectedAgentName).toBe('Test Agent');

      removeSelectedAgentName();
      expect(mockStore.selectedAgentName).toBeUndefined();
    });

    it('does not throw when no agent is stored', () => {
      expect(() => removeSelectedAgentName()).not.toThrow();
    });

    it('does not throw and logs warning when remove fails after availability check', () => {
      let removeCallCount = 0;
      vi.mocked(mockLocalStorage.removeItem).mockImplementation(
        (key: string) => {
          removeCallCount++;
          if (removeCallCount === 1) {
            // Let availability check pass
            delete mockStore[key];
          } else {
            throw new Error('SecurityError');
          }
        },
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // intentionally empty - suppress console output in tests
      });

      expect(() => removeSelectedAgentName()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to remove from localStorage:',
        expect.any(Error),
      );
    });

    it('does nothing when storage is not available', () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      expect(() => removeSelectedAgentName()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('save and retrieve agent name flow', () => {
      // Initially no agent selected
      expect(getSelectedAgentName()).toBe(null);

      // Save agent name
      saveSelectedAgentName('My Agent');
      expect(getSelectedAgentName()).toBe('My Agent');

      // Update agent name
      saveSelectedAgentName('Another Agent');
      expect(getSelectedAgentName()).toBe('Another Agent');

      // Remove agent name
      removeSelectedAgentName();
      expect(getSelectedAgentName()).toBe(null);
    });

    it('persists across multiple get calls', () => {
      saveSelectedAgentName('Persistent Agent');

      expect(getSelectedAgentName()).toBe('Persistent Agent');
      expect(getSelectedAgentName()).toBe('Persistent Agent');
      expect(getSelectedAgentName()).toBe('Persistent Agent');
    });
  });
});
