'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface NavigationMetrics {
  route: string;
  timestamp: number;
  loadTime?: number;
  renderTime?: number;
  ttfb?: number; // Time to first byte
  fcp?: number; // First contentful paint
  lcp?: number; // Largest contentful paint
}

interface PerformanceReport {
  currentRoute: string;
  metrics: NavigationMetrics;
  averageLoadTime: number;
  slowestRoute?: string;
  fastestRoute?: string;
}

const METRICS_STORAGE_KEY = 'agent-navigation-metrics';
const MAX_STORED_METRICS = 100;

export function useNavigationPerformance() {
  const pathname = usePathname();
  const [metrics, setMetrics] = useState<NavigationMetrics[]>([]);
  const [currentMetric, setCurrentMetric] = useState<NavigationMetrics | null>(
    null,
  );
  const navigationStartTime = useRef<number>(0);
  const observer = useRef<PerformanceObserver | null>(null);
  const isMountedRef = useRef(true);

  // Load stored metrics on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        const parsedMetrics = JSON.parse(stored);
        setMetrics(parsedMetrics.slice(-MAX_STORED_METRICS));
      }
    } catch (error) {
      console.warn('Failed to load navigation metrics:', error);
    }
  }, []);

  // Track navigation start
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof performance === 'undefined') return;

    navigationStartTime.current = performance.now();

    const metric: NavigationMetrics = {
      route: pathname,
      timestamp: Date.now(),
    };

    // Mark navigation start
    performance.mark(`navigation-start-${pathname}`);

    // Setup performance observer for paint timings
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        observer.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();

          for (const entry of entries) {
            if (entry.entryType === 'paint') {
              if (entry.name === 'first-contentful-paint') {
                metric.fcp = entry.startTime;
              }
            } else if (entry.entryType === 'largest-contentful-paint') {
              metric.lcp = entry.startTime;
            }
          }

          if (isMountedRef.current) {
            setCurrentMetric({ ...metric });
          }
        });

        observer.current.observe({
          entryTypes: ['paint', 'largest-contentful-paint'],
        });
      } catch (error) {
        console.warn('Performance observer setup failed:', error);
      }
    }

    if (isMountedRef.current) {
      setCurrentMetric(metric);
    }

    // Wait for page to fully load before measuring
    let rafId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const measurePerformance = () => {
      // More realistic timing - wait for next microtask and then measure
      Promise.resolve().then(() => {
        if (typeof window === 'undefined' || !isMountedRef.current) return;
        rafId = requestAnimationFrame(() => {
          const renderTime = performance.now() - navigationStartTime.current;

          // Final measurement after DOM settles
          timeoutId = setTimeout(() => {
            if (!isMountedRef.current) return;
            const finalLoadTime =
              performance.now() - navigationStartTime.current;

            const finalMetric = {
              ...metric,
              loadTime: finalLoadTime,
              renderTime: renderTime,
            };

            // Mark navigation end
            performance.mark(`navigation-end-${pathname}`);

            // Measure navigation duration
            try {
              performance.measure(
                `navigation-${pathname}`,
                `navigation-start-${pathname}`,
                `navigation-end-${pathname}`,
              );
            } catch (error) {
              console.warn('Performance measure failed:', error);
            }

            if (isMountedRef.current) {
              setCurrentMetric(finalMetric);
            }

            // Store metric
            if (!isMountedRef.current) return;
            setMetrics((prev) => {
              const updated = [...prev, finalMetric].slice(-MAX_STORED_METRICS);

              // Persist to localStorage
              try {
                localStorage.setItem(
                  METRICS_STORAGE_KEY,
                  JSON.stringify(updated),
                );
              } catch (error) {
                console.warn('Failed to store navigation metrics:', error);
              }

              return updated;
            });
          }, 10); // Small delay to let DOM settle
        });
      });
    };

    // Use different strategies based on document state
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', measurePerformance, {
        once: true,
      });
    } else if (
      typeof document !== 'undefined' &&
      document.readyState === 'interactive'
    ) {
      // DOM is ready but resources might still be loading
      if (typeof window !== 'undefined') {
        window.addEventListener('load', measurePerformance, { once: true });
      }
    } else {
      // Everything is already loaded
      measurePerformance();
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (observer.current) {
        observer.current.disconnect();
        observer.current = null;
      }

      // Remove event listeners
      if (typeof document !== 'undefined') {
        document.removeEventListener('DOMContentLoaded', measurePerformance);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('load', measurePerformance);
      }

      // Cancel any pending RAF/timeout
      if (typeof window !== 'undefined' && rafId != null) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }

      // Clear performance marks
      try {
        performance.clearMarks(`navigation-start-${pathname}`);
        performance.clearMarks(`navigation-end-${pathname}`);
        performance.clearMeasures(`navigation-${pathname}`);
      } catch (_error) {
        // Ignore cleanup errors
      }
    };
  }, [pathname]);

  // Calculate performance report - memoized to prevent recreating on every render
  const getPerformanceReport = useCallback((): PerformanceReport | null => {
    if (metrics.length === 0) return null;

    const validMetrics = metrics.filter((m) => m.loadTime);
    if (validMetrics.length === 0) return null;

    const totalLoadTime = validMetrics.reduce(
      (sum, m) => sum + (m.loadTime || 0),
      0,
    );
    const averageLoadTime = totalLoadTime / validMetrics.length;

    const sorted = [...validMetrics].sort(
      (a, b) => (a.loadTime || 0) - (b.loadTime || 0),
    );
    const slowest = sorted[sorted.length - 1];
    const fastest = sorted[0];

    return {
      currentRoute: pathname,
      metrics: currentMetric || {
        route: pathname,
        timestamp: Date.now(),
      },
      averageLoadTime,
      slowestRoute: slowest?.route,
      fastestRoute: fastest?.route,
    };
  }, [metrics, pathname, currentMetric]);

  // Get metrics for specific route - memoized
  const getRouteMetrics = useCallback(
    (route: string): NavigationMetrics[] => {
      return metrics.filter((m) => m.route === route);
    },
    [metrics],
  );

  // Clear stored metrics - memoized
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    try {
      localStorage.removeItem(METRICS_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear metrics:', error);
    }
  }, []);

  // Log slow navigations
  useEffect(() => {
    if (currentMetric?.loadTime && currentMetric.loadTime > 100) {
      console.warn('Slow navigation detected:', {
        route: currentMetric.route,
        loadTime: `${currentMetric.loadTime.toFixed(2)}ms`,
        renderTime: currentMetric.renderTime
          ? `${currentMetric.renderTime.toFixed(2)}ms`
          : 'N/A',
      });
    }
  }, [currentMetric]);

  return {
    currentMetric,
    metrics,
    getPerformanceReport,
    getRouteMetrics,
    clearMetrics,
  };
}
