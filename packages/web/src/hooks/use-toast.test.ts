import { act, renderHook } from '@testing-library/react';
import { reducer, toast, useToast } from '@web/hooks/use-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('reducer', () => {
    const initialState = { toasts: [] };

    it('adds a toast with ADD_TOAST action', () => {
      const newToast = {
        id: '1',
        title: 'Test Toast',
        description: 'Test description',
      };

      const result = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: newToast,
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0]).toEqual(newToast);
    });

    it('limits toasts to TOAST_LIMIT (1)', () => {
      const state = {
        toasts: [{ id: '1', title: 'First Toast' }],
      };

      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'Second Toast' },
      });

      // TOAST_LIMIT is 1, so only the newest toast should be kept
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('updates a toast with UPDATE_TOAST action', () => {
      const state = {
        toasts: [{ id: '1', title: 'Original Title' }],
      };

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated Title' },
      });

      expect(result.toasts[0].title).toBe('Updated Title');
    });

    it('does not update non-matching toasts', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ],
      };

      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      });

      expect(result.toasts[0].title).toBe('Updated');
      expect(result.toasts[1].title).toBe('Second');
    });

    it('dismisses a specific toast with DISMISS_TOAST action', () => {
      const state = {
        toasts: [{ id: '1', title: 'Toast', open: true }],
      };

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });

      expect(result.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when no toastId provided', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First', open: true },
          { id: '2', title: 'Second', open: true },
        ],
      };

      const result = reducer(state, {
        type: 'DISMISS_TOAST',
      });

      expect(result.toasts.every((t) => t.open === false)).toBe(true);
    });

    it('removes a specific toast with REMOVE_TOAST action', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ],
      };

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });

      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('removes all toasts when no toastId provided', () => {
      const state = {
        toasts: [
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ],
      };

      const result = reducer(state, {
        type: 'REMOVE_TOAST',
      });

      expect(result.toasts).toHaveLength(0);
    });
  });

  describe('toast function', () => {
    it('returns an object with id, dismiss, and update functions', () => {
      const result = toast({ title: 'Test' });

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('string');
      expect(typeof result.dismiss).toBe('function');
      expect(typeof result.update).toBe('function');
    });

    it('generates unique IDs for each toast', () => {
      const toast1 = toast({ title: 'First' });
      const toast2 = toast({ title: 'Second' });
      const toast3 = toast({ title: 'Third' });

      expect(toast1.id).not.toBe(toast2.id);
      expect(toast2.id).not.toBe(toast3.id);
      expect(toast1.id).not.toBe(toast3.id);
    });
  });

  describe('useToast hook', () => {
    it('returns toasts array, toast function, and dismiss function', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current).toHaveProperty('toasts');
      expect(result.current).toHaveProperty('toast');
      expect(result.current).toHaveProperty('dismiss');
      expect(Array.isArray(result.current.toasts)).toBe(true);
      expect(typeof result.current.toast).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');
    });

    it('adds toast to state when toast is called', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'New Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('New Toast');
    });

    it('dismisses toast when dismiss is called', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        const t = result.current.toast({ title: 'Toast to dismiss' });
        toastId = t.id;
      });

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0]?.open).toBe(false);
    });

    it('updates toast state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast({ title: 'Shared Toast' });
      });

      // Both hook instances should see the same toast
      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
      expect(result1.current.toasts[0].title).toBe('Shared Toast');
      expect(result2.current.toasts[0].title).toBe('Shared Toast');
    });

    it('cleans up listener on unmount', () => {
      const { result, unmount } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      // Unmount should clean up without errors
      unmount();
    });
  });

  describe('toast with options', () => {
    it('creates toast with title and description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Title',
          description: 'Description',
        });
      });

      expect(result.current.toasts[0].title).toBe('Title');
      expect(result.current.toasts[0].description).toBe('Description');
    });

    it('creates toast with variant', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Error',
          variant: 'destructive',
        });
      });

      expect(result.current.toasts[0].variant).toBe('destructive');
    });
  });
});
