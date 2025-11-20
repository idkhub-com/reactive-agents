import type { NavigationMetrics } from '@client/hooks/use-navigation-performance';

/**
 * Performance DevTools for debugging navigation metrics
 * Access these in browser console via window.perfTools
 */

interface PerformanceReport {
  totalNavigations: number;
  averageLoadTime: string;
  fastestNavigation: {
    route: string;
    time: string;
  };
  slowestNavigation: {
    route: string;
    time: string;
  };
}

interface PerformanceDevTools {
  getMetrics: () => NavigationMetrics[];
  getReport: () => PerformanceReport | null;
  clearMetrics: () => void;
  showSlowRoutes: (threshold?: number) => void;
  exportMetrics: () => string;
  analyzeRoute: (route: string) => void;
}

export function setupPerformanceDevTools() {
  if (typeof window === 'undefined') return;

  const METRICS_KEY = 'agent-navigation-metrics';

  const devTools: PerformanceDevTools = {
    // Get all stored metrics
    getMetrics: () => {
      try {
        const stored = localStorage.getItem(METRICS_KEY);
        if (!stored || stored.trim() === '') {
          return [];
        }
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to get metrics:', error);
        // Clear corrupted data
        try {
          localStorage.removeItem(METRICS_KEY);
        } catch {
          // Ignore cleanup errors
        }
        return [];
      }
    },

    // Get performance report
    getReport: (): PerformanceReport | null => {
      const metrics = devTools.getMetrics();
      const validMetrics = metrics.filter((m) => m.loadTime);

      if (validMetrics.length === 0) {
        console.log('No performance metrics available');
        return null;
      }

      const totalLoadTime = validMetrics.reduce(
        (sum: number, m) => sum + (m.loadTime || 0),
        0,
      );
      const avgLoadTime = totalLoadTime / validMetrics.length;

      const sorted = [...validMetrics].sort(
        (a, b) => (a.loadTime || 0) - (b.loadTime || 0),
      );

      return {
        totalNavigations: validMetrics.length,
        averageLoadTime: `${avgLoadTime.toFixed(2)}ms`,
        fastestNavigation: {
          route: sorted[0]?.route || 'Unknown',
          time: `${(sorted[0]?.loadTime || 0).toFixed(2)}ms`,
        },
        slowestNavigation: {
          route: sorted[sorted.length - 1]?.route || 'Unknown',
          time: `${(sorted[sorted.length - 1]?.loadTime || 0).toFixed(2)}ms`,
        },
      };
    },

    // Clear all metrics
    clearMetrics: () => {
      try {
        localStorage.removeItem(METRICS_KEY);
        console.log('✅ Performance metrics cleared');
      } catch (error) {
        console.error('Failed to clear metrics:', error);
      }
    },

    // Show routes slower than threshold (default 500ms)
    showSlowRoutes: (threshold = 500) => {
      const metrics = devTools.getMetrics();
      const slowRoutes = metrics.filter((m) => (m.loadTime || 0) > threshold);

      if (slowRoutes.length === 0) {
        console.log(`No routes slower than ${threshold}ms`);
        return;
      }

      console.table(
        slowRoutes.map((m) => ({
          route: m.route,
          loadTime: `${(m.loadTime || 0).toFixed(2)}ms`,
          renderTime: m.renderTime ? `${m.renderTime.toFixed(2)}ms` : 'N/A',
          timestamp: new Date(m.timestamp).toLocaleString(),
        })),
      );
    },

    // Export metrics as CSV
    exportMetrics: () => {
      const metrics = devTools.getMetrics();

      if (metrics.length === 0) {
        console.log('No metrics to export');
        return '';
      }

      const csv = [
        'Route,Load Time (ms),Render Time (ms),FCP (ms),LCP (ms),Timestamp',
        ...metrics.map(
          (m) =>
            `"${m.route}",${m.loadTime || ''},${m.renderTime || ''},${m.fcp || ''},${m.lcp || ''},${m.timestamp}`,
        ),
      ].join('\n');

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('✅ Metrics exported to CSV');
      return csv;
    },

    // Analyze specific route performance
    analyzeRoute: (route: string) => {
      const metrics = devTools.getMetrics();
      const routeMetrics = metrics.filter((m) => m.route.includes(route));

      if (routeMetrics.length === 0) {
        console.log(`No metrics found for route: ${route}`);
        return;
      }

      const loadTimes = routeMetrics
        .map((m) => m.loadTime)
        .filter((time): time is number => typeof time === 'number');
      const avgLoadTime =
        loadTimes.reduce((a: number, b: number) => a + b, 0) / loadTimes.length;
      const minLoadTime = Math.min(...loadTimes);
      const maxLoadTime = Math.max(...loadTimes);

      console.log(`📊 Performance Analysis for: ${route}`);
      console.log(`   Navigations: ${routeMetrics.length}`);
      console.log(`   Average: ${avgLoadTime.toFixed(2)}ms`);
      console.log(`   Min: ${minLoadTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxLoadTime.toFixed(2)}ms`);
      console.log(`   Variance: ${(maxLoadTime - minLoadTime).toFixed(2)}ms`);

      // Show performance trend
      console.log('\n📈 Recent Performance:');
      console.table(
        routeMetrics.slice(-5).map((m, i: number) => ({
          '#': i + 1,
          loadTime: m.loadTime ? `${m.loadTime.toFixed(2)}ms` : 'N/A',
          renderTime: m.renderTime ? `${m.renderTime.toFixed(2)}ms` : 'N/A',
          time: new Date(m.timestamp).toLocaleTimeString(),
        })),
      );
    },
  };

  // Attach to window for console access
  (window as Window & { perfTools?: PerformanceDevTools }).perfTools = devTools;

  // Log availability
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '%c🚀 Performance DevTools Ready',
      'color: #4CAF50; font-weight: bold; font-size: 14px',
    );
    console.log('Available commands:');
    console.log(
      '  window.perfTools.getReport()        - View performance summary',
    );
    console.log(
      '  window.perfTools.showSlowRoutes()   - Show slow routes (>500ms)',
    );
    console.log(
      '  window.perfTools.analyzeRoute(path) - Analyze specific route',
    );
    console.log(
      '  window.perfTools.exportMetrics()    - Export metrics as CSV',
    );
    console.log('  window.perfTools.clearMetrics()     - Clear all metrics');
  }
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  setupPerformanceDevTools();
}
