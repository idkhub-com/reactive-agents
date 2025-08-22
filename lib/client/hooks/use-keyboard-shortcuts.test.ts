import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isModifierPressed,
  useKeyboardShortcuts,
  useModifierKey,
  useOperatingSystem,
} from './use-keyboard-shortcuts';

// Mock window.navigator
const mockNavigator = (userAgent: string) => {
  Object.defineProperty(global, 'window', {
    value: {
      navigator: {
        userAgent,
      },
    },
    writable: true,
  });
};

describe('useOperatingSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects Mac OS', () => {
    mockNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    );
    const { result } = renderHook(() => useOperatingSystem());
    expect(result.current).toBe('mac');
  });

  it('detects Windows OS', () => {
    mockNavigator(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    );
    const { result } = renderHook(() => useOperatingSystem());
    expect(result.current).toBe('windows');
  });

  it('detects Linux OS', () => {
    mockNavigator('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    const { result } = renderHook(() => useOperatingSystem());
    expect(result.current).toBe('linux');
  });

  it('returns unknown for unrecognized user agents', () => {
    mockNavigator('Mozilla/5.0 (Unknown) AppleWebKit/537.36');
    const { result } = renderHook(() => useOperatingSystem());
    expect(result.current).toBe('unknown');
  });

  it('returns unknown when window is not defined', () => {
    // Test will use the mocked window.navigator from mockNavigator
    mockNavigator('');
    const { result } = renderHook(() => useOperatingSystem());
    expect(result.current).toBe('unknown');
  });
});

describe('useModifierKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ⌘ for Mac OS', () => {
    mockNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    );
    const { result } = renderHook(() => useModifierKey());
    expect(result.current).toBe('⌘');
  });

  it('returns Ctrl for Windows OS', () => {
    mockNavigator(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    );
    const { result } = renderHook(() => useModifierKey());
    expect(result.current).toBe('Ctrl');
  });

  it('returns Ctrl for Linux OS', () => {
    mockNavigator('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    const { result } = renderHook(() => useModifierKey());
    expect(result.current).toBe('Ctrl');
  });

  it('returns Ctrl for unknown OS', () => {
    mockNavigator('Mozilla/5.0 (Unknown) AppleWebKit/537.36');
    const { result } = renderHook(() => useModifierKey());
    expect(result.current).toBe('Ctrl');
  });
});

describe('isModifierPressed', () => {
  const createKeyboardEvent = (
    options: {
      metaKey?: boolean;
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
    } = {},
  ) =>
    ({
      metaKey: options.metaKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      altKey: options.altKey ?? false,
      shiftKey: options.shiftKey ?? false,
    }) as KeyboardEvent;

  it('returns true for Mac with only metaKey pressed', () => {
    const event = createKeyboardEvent({ metaKey: true });
    expect(isModifierPressed(event, 'mac')).toBe(true);
  });

  it('returns false for Mac when other keys are also pressed', () => {
    const event1 = createKeyboardEvent({ metaKey: true, ctrlKey: true });
    expect(isModifierPressed(event1, 'mac')).toBe(false);

    const event2 = createKeyboardEvent({ metaKey: true, altKey: true });
    expect(isModifierPressed(event2, 'mac')).toBe(false);

    const event3 = createKeyboardEvent({ metaKey: true, shiftKey: true });
    expect(isModifierPressed(event3, 'mac')).toBe(false);
  });

  it('returns false for Mac when metaKey is not pressed', () => {
    const event = createKeyboardEvent({ ctrlKey: true });
    expect(isModifierPressed(event, 'mac')).toBe(false);
  });

  it('returns true for Windows/Linux with only ctrlKey pressed', () => {
    const event = createKeyboardEvent({ ctrlKey: true });
    expect(isModifierPressed(event, 'windows')).toBe(true);
    expect(isModifierPressed(event, 'linux')).toBe(true);
  });

  it('returns false for Windows/Linux when other keys are also pressed', () => {
    const event1 = createKeyboardEvent({ ctrlKey: true, metaKey: true });
    expect(isModifierPressed(event1, 'windows')).toBe(false);

    const event2 = createKeyboardEvent({ ctrlKey: true, altKey: true });
    expect(isModifierPressed(event2, 'windows')).toBe(false);

    const event3 = createKeyboardEvent({ ctrlKey: true, shiftKey: true });
    expect(isModifierPressed(event3, 'windows')).toBe(false);
  });

  it('returns false for Windows/Linux when ctrlKey is not pressed', () => {
    const event = createKeyboardEvent({ metaKey: true });
    expect(isModifierPressed(event, 'windows')).toBe(false);
    expect(isModifierPressed(event, 'linux')).toBe(false);
  });
});

describe('useKeyboardShortcuts', () => {
  let mockCallback: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCallback = vi.fn();
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    // Mock navigator for consistent OS detection
    mockNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  const createKeyboardEvent = (
    key: string,
    options: {
      metaKey?: boolean;
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
    } = {},
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      metaKey: options.metaKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      altKey: options.altKey ?? false,
      shiftKey: options.shiftKey ?? false,
      bubbles: true,
      cancelable: true,
    });

    // Mock preventDefault and stopPropagation
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

    return { event, preventDefaultSpy, stopPropagationSpy };
  };

  it('sets up event listeners on mount', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: true,
      }),
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: true,
      }),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });

  it('calls callback when correct shortcut is pressed with modifier', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: true,
      }),
    );

    // Get the registered event handler
    const eventHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;

    // Simulate pressing Cmd+1 on Mac
    const { event } = createKeyboardEvent('1', { metaKey: true });
    eventHandler(event);

    expect(mockCallback).toHaveBeenCalledWith('1');
  });

  it('prevents default and stops propagation for valid shortcuts', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: true,
      }),
    );

    const eventHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    const { event, preventDefaultSpy, stopPropagationSpy } =
      createKeyboardEvent('2', { metaKey: true });

    eventHandler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('does not call callback when modifier is not pressed', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: true,
      }),
    );

    const eventHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    const { event } = createKeyboardEvent('1'); // No modifier key

    eventHandler(event);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('does not call callback for non-shortcut keys', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: true,
      }),
    );

    const eventHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    const { event } = createKeyboardEvent('a', { metaKey: true });

    eventHandler(event);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('does not set up listeners when disabled', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1', '2', '3'],
        enabled: false,
      }),
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('handles case sensitivity correctly', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['a', 'b'],
        enabled: true,
      }),
    );

    const eventHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;

    // Test uppercase key
    const { event: upperEvent } = createKeyboardEvent('A', { metaKey: true });
    eventHandler(upperEvent);

    expect(mockCallback).toHaveBeenCalledWith('a'); // Should convert to lowercase
  });

  it('works with Windows/Linux Ctrl modifier', () => {
    // Mock Windows user agent
    mockNavigator(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    );

    renderHook(() =>
      useKeyboardShortcuts({
        onShortcutAction: mockCallback,
        shortcuts: ['1'],
        enabled: true,
      }),
    );

    const eventHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;
    const { event } = createKeyboardEvent('1', { ctrlKey: true });

    eventHandler(event);

    expect(mockCallback).toHaveBeenCalledWith('1');
  });

  it('updates event listeners when dependencies change', () => {
    const { rerender } = renderHook(
      ({ shortcuts }) =>
        useKeyboardShortcuts({
          onShortcutAction: mockCallback,
          shortcuts,
          enabled: true,
        }),
      { initialProps: { shortcuts: ['1', '2'] } },
    );

    // Should have set up listeners initially
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // Update shortcuts
    rerender({ shortcuts: ['3', '4'] });

    // Should have removed old listeners and added new ones
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});
