import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

interface TestRouterOptions {
  initialPath?: string;
  routes?: Array<{ path: string; component?: () => ReactElement }>;
}

/**
 * Creates a test router with memory history for testing components that use TanStack Router
 *
 * Recommended by TanStack Router team:
 * - Use real router instances with createMemoryHistory instead of mocking
 * - Set defaultPendingMinMs: 0 to prevent 500ms delays in tests
 * - Wrap components with RouterProvider for tests
 *
 * @see https://tanstack.com/router/latest/docs/framework/react/how-to/test-file-based-routing
 */
export function createTestRouter(options: TestRouterOptions = {}) {
  const { initialPath = '/', routes = [] } = options;

  // Create root route
  const rootRoute = createRootRoute({
    component: ({ children }: { children?: ReactNode }) => <>{children}</>,
  });

  // Create child routes
  const childRoutes = routes.map((route) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: route.path,
      component: route.component || (() => null),
    }),
  );

  // Add a catch-all route
  const catchAllRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: () => null,
  });

  // Create route tree
  const routeTree = rootRoute.addChildren([...childRoutes, catchAllRoute]);

  // Create memory history
  const memoryHistory = createMemoryHistory({
    initialEntries: [initialPath],
  });

  // Create router with optimized test settings
  const router = createRouter({
    routeTree,
    history: memoryHistory,
    // Important: Set to 0 to prevent 500ms delays in tests
    defaultPendingMinMs: 0,
    // Disable preloading in tests
    defaultPreload: false,
  });

  return router;
}

interface RenderWithRouterOptions extends TestRouterOptions {
  queryClient?: QueryClient;
}

/**
 * Renders a component with TanStack Router and React Query context
 */
export function renderWithRouter(
  ui: ReactElement,
  options: RenderWithRouterOptions = {},
) {
  const {
    initialPath = '/',
    routes = [],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
  } = options;

  const router = createTestRouter({ initialPath, routes });

  function Wrapper({ children }: { children: ReactNode }) {
    // Note: RouterProvider doesn't accept children directly.
    // The router renders routes via its internal mechanism.
    // For testing, we wrap with QueryClientProvider and render children alongside.
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper }),
    router,
    queryClient,
  };
}

/**
 * Creates a wrapper component for testing with router context
 */
export function createRouterWrapper(options: RenderWithRouterOptions = {}) {
  const {
    initialPath = '/',
    routes = [],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
  } = options;

  const router = createTestRouter({ initialPath, routes });

  return function Wrapper({ children }: { children: ReactNode }) {
    // Note: RouterProvider doesn't accept children directly.
    // The router renders routes via its internal mechanism.
    // For testing, we wrap with QueryClientProvider and render children alongside.
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {children}
      </QueryClientProvider>
    );
  };
}
