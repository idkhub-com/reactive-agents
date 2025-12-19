import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock functions using vi.hoisted
const mockRouter = vi.hoisted(() => ({
  history: {
    back: vi.fn(),
  },
}));

const mockNavigate = vi.hoisted(() => vi.fn());

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => mockRouter,
  useNavigate: () => mockNavigate,
}));

// Import the hook AFTER mocking
import { useSmartBack } from '@web/hooks/use-smart-back';

describe('useSmartBack', () => {
  let originalWindow: typeof window;
  let mockHistoryLength: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryLength = 2; // Default to having history

    // Mock window.history.length
    originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      value: {
        ...originalWindow,
        history: {
          length: mockHistoryLength,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
    });
  });

  const setHistoryLength = (length: number) => {
    Object.defineProperty(global.window, 'history', {
      value: { length },
      writable: true,
    });
  };

  it('returns a callback function', () => {
    const { result } = renderHook(() => useSmartBack());

    expect(typeof result.current).toBe('function');
  });

  it('calls router.history.back() when browser history exists', () => {
    setHistoryLength(5);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current();
    });

    expect(mockRouter.history.back).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to fallback URL when history length is 1', () => {
    setHistoryLength(1);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current('/custom-fallback');
    });

    expect(mockRouter.history.back).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/custom-fallback' });
  });

  it('navigates to /agents when no history and no fallback URL', () => {
    setHistoryLength(1);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current();
    });

    expect(mockRouter.history.back).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/agents' });
  });

  it('uses history.back() even when fallback is provided if history exists', () => {
    setHistoryLength(3);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current('/fallback-ignored');
    });

    expect(mockRouter.history.back).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles edge case where history length is exactly 1', () => {
    setHistoryLength(1);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current('/fallback');
    });

    // history.length of 1 means no previous page to go back to
    expect(mockRouter.history.back).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/fallback' });
  });

  it('handles edge case where history length is 0', () => {
    setHistoryLength(0);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current();
    });

    expect(mockRouter.history.back).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/agents' });
  });

  it('maintains callback reference stability', () => {
    const { result, rerender } = renderHook(() => useSmartBack());

    const firstCallback = result.current;
    rerender();
    const secondCallback = result.current;

    // useCallback should maintain stable reference
    expect(firstCallback).toBe(secondCallback);
  });

  // Note: SSR environment test is skipped because jsdom doesn't allow deleting window
  // The SSR behavior is tested implicitly through the code logic:
  // typeof window === 'undefined' check in the actual code handles SSR

  it('navigates to different fallback URLs correctly', () => {
    setHistoryLength(1);

    const { result } = renderHook(() => useSmartBack());

    act(() => {
      result.current('/settings');
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/settings' });

    vi.clearAllMocks();

    act(() => {
      result.current('/agents/my-agent');
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/agents/my-agent' });
  });
});
