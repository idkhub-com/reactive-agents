/**
 * Test Providers for React Query and common testing utilities
 *
 * For TanStack Router testing:
 * - The global vitest.setup.tsx provides mocks for @tanstack/react-router
 * - Use setMockPathname() and setMockParams() from @/vitest.setup to control router state
 * - Use resetRouterMocks() before each test to clean up
 *
 * @see https://tanstack.com/router/latest/docs/framework/react/how-to/test-file-based-routing
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

// Default query client options for tests
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface RenderWithQueryClientOptions {
  queryClient?: QueryClient;
  renderOptions?: Omit<RenderOptions, 'wrapper'>;
}

/**
 * Renders a component with React Query provider only
 * Use this for components that don't need router context
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options: RenderWithQueryClientOptions = {},
) {
  const { queryClient = createTestQueryClient(), renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Creates a wrapper function for testing hooks with React Query
 * Use with renderHook from @testing-library/react
 *
 * @example
 * const wrapper = createQueryClientWrapper();
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 */
export function createQueryClientWrapper(
  options: { queryClient?: QueryClient } = {},
) {
  const { queryClient = createTestQueryClient() } = options;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/**
 * Creates a wrapper for testing hooks that use TanStack Router
 * Works with the global mocks from vitest.setup.tsx
 *
 * @example
 * // In your test file:
 * import { setMockPathname, setMockParams } from '@/vitest.setup';
 *
 * beforeEach(() => {
 *   setMockPathname('/my-route');
 *   setMockParams({ id: '123' });
 * });
 *
 * const wrapper = createTestWrapper();
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 */
export function createTestWrapper(
  options: { queryClient?: QueryClient; initialPath?: string } = {},
) {
  const { queryClient = createTestQueryClient() } = options;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}
