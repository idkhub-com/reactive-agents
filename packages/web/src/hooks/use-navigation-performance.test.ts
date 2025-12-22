import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestWrapper } from '../test-utils/test-providers';

// Create mock state using vi.hoisted - MUST be before vi.mock
const mockState = vi.hoisted(() => ({
  pathname: '/test-route',
  search: '',
  hash: '',
  state: {},
  href: '/test-route',
}));

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockState,
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    state: { location: mockState },
    navigate: vi.fn(),
  }),
  useParams: () => ({}),
  useSearch: () => ({}),
  useMatch: () => ({ params: {}, pathname: mockState.pathname }),
  useRouterState: () => ({ location: mockState }),
  Link: ({ children }: { children: React.ReactNode }) => children,
  RouterProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import the hook AFTER mocking
import { useNavigationPerformance } from '@web/hooks/use-navigation-performance';

// Helper to update mock pathname
const setMockPathname = (pathname: string) => {
  mockState.pathname = pathname;
  mockState.href = pathname;
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 100),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock PerformanceObserver
const mockPerformanceObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
};

global.PerformanceObserver = vi.fn(
  () => mockPerformanceObserver,
) as unknown as typeof PerformanceObserver;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

// Mock document ready state
Object.defineProperty(document, 'readyState', {
  writable: true,
  value: 'complete',
});

describe('useNavigationPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockPathname('/test-route');
    mockLocalStorage.getItem.mockReturnValue(null);
    mockPerformance.now.mockReturnValue(100);
  });

  it('should initialize with empty metrics', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    expect(result.current.metrics).toEqual([]);
    expect(result.current.getPerformanceReport()).toBeNull();
  });

  it('should load stored metrics from localStorage on mount', () => {
    const storedMetrics = [
      {
        route: '/previous-route',
        timestamp: Date.now(),
        loadTime: 200,
        renderTime: 30,
      },
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedMetrics));

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      'agent-navigation-metrics',
    );
    expect(result.current.metrics).toEqual(storedMetrics);
  });

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('LocalStorage error');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty mock implementation
    });

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    expect(result.current.metrics).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load navigation metrics:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should provide performance tracking functions', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    expect(typeof result.current.getPerformanceReport).toBe('function');
    expect(typeof result.current.getRouteMetrics).toBe('function');
    expect(typeof result.current.clearMetrics).toBe('function');
  });

  it('should generate performance report with valid metrics', () => {
    const existingMetrics = [
      { route: '/route-1', timestamp: Date.now(), loadTime: 100 },
      { route: '/route-2', timestamp: Date.now(), loadTime: 200 },
      { route: '/route-3', timestamp: Date.now(), loadTime: 150 },
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingMetrics));

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    const report = result.current.getPerformanceReport();

    expect(report).toBeTruthy();
    expect(report?.averageLoadTime).toBe(150); // (100 + 200 + 150) / 3
    expect(report?.slowestRoute).toBe('/route-2');
    expect(report?.fastestRoute).toBe('/route-1');
  });

  it('should clear metrics and localStorage', () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    act(() => {
      result.current.clearMetrics();
    });

    expect(result.current.metrics).toEqual([]);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'agent-navigation-metrics',
    );
  });

  it('should get metrics for specific route', () => {
    const existingMetrics = [
      { route: '/route-1', timestamp: Date.now(), loadTime: 100 },
      { route: '/route-2', timestamp: Date.now(), loadTime: 200 },
      { route: '/route-1', timestamp: Date.now(), loadTime: 120 },
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingMetrics));

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    const routeMetrics = result.current.getRouteMetrics('/route-1');

    expect(routeMetrics).toHaveLength(2);
    expect(routeMetrics.every((m) => m.route === '/route-1')).toBe(true);
  });

  it('should handle large numbers of metrics', () => {
    // Create many metrics
    const manyMetrics = Array.from({ length: 50 }, (_, i) => ({
      route: `/route-${i}`,
      timestamp: Date.now(),
      loadTime: 100 + i,
    }));

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(manyMetrics));

    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    // Should load the metrics
    expect(result.current.metrics).toHaveLength(50);
  });

  it('should cleanup on unmount', () => {
    const wrapper = createTestWrapper();
    const { unmount } = renderHook(() => useNavigationPerformance(), {
      wrapper,
    });

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });

  it('should handle different document ready states', () => {
    // Test loading state
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'loading',
    });

    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    const wrapper = createTestWrapper();
    renderHook(() => useNavigationPerformance(), { wrapper });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'DOMContentLoaded',
      expect.any(Function),
      { once: true },
    );

    addEventListenerSpy.mockRestore();

    // Reset document ready state
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete',
    });
  });
});
