import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@web/api/v1/super-agents/auth', () => ({
  getAuthStatus: vi.fn(),
}));

import { getAuthStatus } from '@web/api/v1/super-agents/auth';
import { useAuthStatus } from '@web/hooks/use-auth-status';

const mockGetAuthStatus = vi.mocked(getAuthStatus);

describe('useAuthStatus', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('is null until the status arrives', () => {
    mockGetAuthStatus.mockReturnValue(
      new Promise(() => {
        // Never resolves - the status is still in flight
      }),
    );

    const { result } = renderHook(() => useAuthStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeNull();
  });

  it('returns the status the server reported', async () => {
    mockGetAuthStatus.mockResolvedValue({
      authRequired: true,
      authenticated: false,
    });

    const { result } = renderHook(() => useAuthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        authRequired: true,
        authenticated: false,
      });
    });
  });

  // The status endpoint is how the dashboard learns whether a session exists,
  // so an unreachable server has to read as "unknown", not as "no auth".
  it('is null when the server could not be reached', async () => {
    mockGetAuthStatus.mockResolvedValue(null);

    const { result } = renderHook(() => useAuthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetAuthStatus).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });
});
