import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Use vi.hoisted to ensure mock state is available before vi.mock runs
const hoisted = vi.hoisted(() => {
  const navigate = vi.fn();
  const back = vi.fn();
  const forward = vi.fn();
  const go = vi.fn();
  const state = {
    pathname: '/',
    params: {} as Record<string, string | undefined>,
    navigate,
    back,
    forward,
    go,
  };

  return {
    routerMockState: state,
    setMockPathname: (pathname: string) => {
      state.pathname = pathname;
    },
    setMockParams: (params: Record<string, string | undefined>) => {
      state.params = params;
    },
    getMockNavigate: () => state.navigate,
    getMockBack: () => state.back,
    resetRouterMocks: () => {
      state.navigate.mockClear();
      state.back.mockClear();
      state.forward.mockClear();
      state.go.mockClear();
      state.pathname = '/';
      state.params = {};
    },
  };
});

// Export the hoisted values
export const routerMockState = hoisted.routerMockState;
export const setMockPathname = hoisted.setMockPathname;
export const setMockParams = hoisted.setMockParams;
export const getMockNavigate = hoisted.getMockNavigate;
export const resetRouterMocks = hoisted.resetRouterMocks;

// Mock TanStack Router hooks globally but pass through route creation functions
// This allows tests using real routers (test-router.tsx) to work while providing
// default mocks for hooks in tests that don't set up their own router context.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...original,
    // Mock hooks with sensible defaults
    useNavigate: () => hoisted.routerMockState.navigate,
    useLocation: () => ({
      pathname: hoisted.routerMockState.pathname,
      search: '',
      hash: '',
      state: {},
      href: hoisted.routerMockState.pathname,
    }),
    useParams: () => hoisted.routerMockState.params,
    useRouter: () => ({
      navigate: hoisted.routerMockState.navigate,
      history: {
        push: hoisted.routerMockState.navigate,
        replace: hoisted.routerMockState.navigate,
        go: hoisted.routerMockState.go,
        back: hoisted.routerMockState.back,
        forward: hoisted.routerMockState.forward,
      },
      state: {
        location: {
          pathname: hoisted.routerMockState.pathname,
          search: '',
          hash: '',
        },
      },
    }),
    useMatch: () => ({
      params: hoisted.routerMockState.params,
      pathname: hoisted.routerMockState.pathname,
    }),
    useSearch: () => ({}),
    useRouterState: () => ({
      location: {
        pathname: hoisted.routerMockState.pathname,
        search: '',
        hash: '',
      },
    }),
    // Pass through the Link component with a simple mock that preserves navigation
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      [key: string]: unknown;
    }) => {
      const { onClick, ...rest } = props as {
        onClick?: () => void;
        [key: string]: unknown;
      };
      return (
        <a
          href={to}
          onClick={(e) => {
            e.preventDefault();
            hoisted.routerMockState.navigate({ to });
            onClick?.();
          }}
          {...rest}
        >
          {children}
        </a>
      );
    },
    // Keep the original implementations for router creation (needed by test-router.tsx)
    createFileRoute: original.createFileRoute,
    createRootRoute: original.createRootRoute,
    createRoute: original.createRoute,
    createRouter: original.createRouter,
    createMemoryHistory: original.createMemoryHistory,
    RouterProvider: original.RouterProvider,
    Outlet: original.Outlet,
  };
});

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    __proto__: {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  },
  writable: true,
});

// Ensure process.nextTick exists without replacing the whole process object
// Some environments (jsdom) may not provide a full Node `process` impl.
// We only define `nextTick` if missing to avoid breaking methods like `emit`.
if (typeof process !== 'undefined' && typeof process.nextTick !== 'function') {
  process.nextTick = (fn: () => void): void => {
    setTimeout(fn, 0);
  };
}

// Mock ResizeObserver for components that use it (e.g., Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
};

// jsdom has no scrollIntoView, which cmdk calls as its list highlights an item
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = (): void => {
    // Mock implementation
  };
}

// Soften noisy React warnings that don't affect assertions in our suite.
// These warnings can flood output and cause OOM in CI when many async state
// updates happen during provider effects.
const originalConsoleError = console.error;
console.error = (...args: unknown[]): void => {
  const [first] = args as [unknown];
  if (
    typeof first === 'string' &&
    (first.includes('not wrapped in act(...)') ||
      first.includes('Each child in a list should have a unique "key" prop') ||
      first.includes('useRouter must be used inside a <RouterProvider>'))
  ) {
    return; // ignore these specific, noisy warnings during tests
  }
  originalConsoleError(...args);
};
