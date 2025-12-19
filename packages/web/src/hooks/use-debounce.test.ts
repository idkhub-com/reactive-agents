import { act, renderHook } from '@testing-library/react';
import { useDebounce } from '@web/hooks/use-debounce';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));

    expect(result.current).toBe('initial');
  });

  it('does not update the value before the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    );

    rerender({ value: 'updated', delay: 300 });

    // Value should still be initial before delay
    expect(result.current).toBe('initial');

    // Advance time but not enough
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');
  });

  it('updates the value after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    );

    rerender({ value: 'updated', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('resets the timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    );

    // First change
    rerender({ value: 'change1', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Second change - should reset timer
    rerender({ value: 'change2', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Third change - should reset timer again
    rerender({ value: 'change3', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only the last value should be set
    expect(result.current).toBe('change3');
  });

  it('works with different data types', () => {
    // Test with number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 100 } },
    );

    rerenderNumber({ value: 100, delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(100);

    // Test with object
    const initialObj = { foo: 'bar' };
    const updatedObj = { foo: 'baz' };
    const { result: objectResult, rerender: rerenderObject } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObj, delay: 100 } },
    );

    rerenderObject({ value: updatedObj, delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(objectResult.current).toEqual(updatedObj);

    // Test with array
    const { result: arrayResult, rerender: rerenderArray } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: [1, 2, 3], delay: 100 } },
    );

    rerenderArray({ value: [4, 5, 6], delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(arrayResult.current).toEqual([4, 5, 6]);
  });

  it('handles delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    );

    // Change both value and delay
    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should still be initial because new delay is 500ms
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('updated');
  });

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } },
    );

    rerender({ value: 'updated', delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } },
    );

    rerender({ value: 'updated', delay: 300 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('handles null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: null as string | null, delay: 100 } },
    );

    expect(result.current).toBe(null);

    rerender({ value: 'not null', delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('not null');

    rerender({ value: null, delay: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(null);
  });
});
