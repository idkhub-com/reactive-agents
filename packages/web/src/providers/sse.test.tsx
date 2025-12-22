import { renderHook } from '@testing-library/react';
import { SSEProvider, useSSEStatus } from '@web/providers/sse';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

describe('SSEProvider', () => {
  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <SSEProvider>{children}</SSEProvider>
    );
  };

  describe('useSSEStatus', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSSEStatus());
      }).toThrow('useSSEStatus must be used within an SSEProvider');
    });

    it('returns disabled state', () => {
      const { result } = renderHook(() => useSSEStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
    });

    it('returns error indicating SSE is not supported', () => {
      const { result } = renderHook(() => useSSEStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(
        'SSE not supported on Cloudflare Workers',
      );
    });

    it('provides consistent state across multiple renders', () => {
      const { result, rerender } = renderHook(() => useSSEStatus(), {
        wrapper: createWrapper(),
      });

      const firstRender = { ...result.current };
      rerender();
      const secondRender = result.current;

      expect(firstRender.connected).toBe(secondRender.connected);
      expect(firstRender.connecting).toBe(secondRender.connecting);
      expect(firstRender.error?.message).toBe(secondRender.error?.message);
    });
  });
});
