'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import type { NavigationMetrics } from '@client/hooks/use-navigation-performance';
import { useNavigationPerformance } from '@client/hooks/use-navigation-performance';
import {
  BarChart,
  Clock,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface RouteMetrics {
  route: string;
  count: number;
  totalLoadTime: number;
  avgLoadTime: number;
  minLoadTime: number;
  maxLoadTime: number;
  metrics: NavigationMetrics[];
}

export function PerformanceDashboard() {
  const { metrics, getPerformanceReport, clearMetrics, currentMetric } =
    useNavigationPerformance();
  const [showDetails, setShowDetails] = useState(false);

  // Calculate report directly from metrics instead of using state
  const report = getPerformanceReport();

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Navigation Performance</CardTitle>
          <CardDescription>
            No performance data available yet. Navigate through the app to
            collect metrics.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group metrics by route
  const routeMetrics = metrics.reduce(
    (acc, metric) => {
      if (!metric.loadTime) return acc;

      if (!acc[metric.route]) {
        acc[metric.route] = {
          route: metric.route,
          count: 0,
          totalLoadTime: 0,
          avgLoadTime: 0,
          minLoadTime: Infinity,
          maxLoadTime: 0,
          metrics: [],
        };
      }

      acc[metric.route].count += 1;
      acc[metric.route].totalLoadTime += metric.loadTime;
      acc[metric.route].avgLoadTime =
        acc[metric.route].totalLoadTime / acc[metric.route].count;
      acc[metric.route].minLoadTime = Math.min(
        acc[metric.route].minLoadTime,
        metric.loadTime,
      );
      acc[metric.route].maxLoadTime = Math.max(
        acc[metric.route].maxLoadTime,
        metric.loadTime,
      );
      acc[metric.route].metrics.push(metric);

      return acc;
    },
    {} as Record<string, RouteMetrics>,
  );

  const sortedRoutes = Object.values(routeMetrics).sort(
    (a, b) => b.avgLoadTime - a.avgLoadTime,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Navigation Performance Dashboard
              </CardTitle>
              <CardDescription>
                Real-time performance metrics for pipeline navigation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearMetrics();
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Load Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.averageLoadTime.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {metrics.length} navigations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Slowest Route
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium truncate">
                  {report.slowestRoute || 'N/A'}
                </div>
                {report.slowestRoute && routeMetrics[report.slowestRoute] && (
                  <p className="text-xs text-muted-foreground">
                    {routeMetrics[report.slowestRoute].maxLoadTime.toFixed(0)}ms
                    max
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  Fastest Route
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium truncate">
                  {report.fastestRoute || 'N/A'}
                </div>
                {report.fastestRoute && routeMetrics[report.fastestRoute] && (
                  <p className="text-xs text-muted-foreground">
                    {routeMetrics[report.fastestRoute].minLoadTime.toFixed(0)}ms
                    min
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Current Navigation */}
          {currentMetric && (
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Current Navigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div>Route: {currentMetric.route}</div>
                  {currentMetric.loadTime && (
                    <div>Load Time: {currentMetric.loadTime.toFixed(0)}ms</div>
                  )}
                  {currentMetric.renderTime && (
                    <div>
                      Render Time: {currentMetric.renderTime.toFixed(0)}ms
                    </div>
                  )}
                  {currentMetric.fcp && (
                    <div>
                      First Contentful Paint: {currentMetric.fcp.toFixed(0)}ms
                    </div>
                  )}
                  {currentMetric.lcp && (
                    <div>
                      Largest Contentful Paint: {currentMetric.lcp.toFixed(0)}ms
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Route Performance Table */}
          {showDetails && sortedRoutes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                Route Performance Details
              </h3>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left text-xs font-medium">
                        Route
                      </th>
                      <th className="p-2 text-right text-xs font-medium">
                        Count
                      </th>
                      <th className="p-2 text-right text-xs font-medium">
                        Avg (ms)
                      </th>
                      <th className="p-2 text-right text-xs font-medium">
                        Min (ms)
                      </th>
                      <th className="p-2 text-right text-xs font-medium">
                        Max (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRoutes.map((route) => (
                      <tr key={route.route} className="border-b">
                        <td className="p-2 text-xs font-mono truncate max-w-xs">
                          {route.route}
                        </td>
                        <td className="p-2 text-right text-xs">
                          {route.count}
                        </td>
                        <td className="p-2 text-right text-xs font-medium">
                          {route.avgLoadTime.toFixed(0)}
                        </td>
                        <td className="p-2 text-right text-xs text-green-600">
                          {route.minLoadTime.toFixed(0)}
                        </td>
                        <td className="p-2 text-right text-xs text-red-600">
                          {route.maxLoadTime.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Tips */}
          {report.averageLoadTime > 1000 && (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Performance Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>
                    Average load time is above 1 second - consider optimizing
                    data fetching
                  </li>
                  {sortedRoutes[0]?.avgLoadTime > 1500 && (
                    <li>
                      Route "{sortedRoutes[0].route}" is particularly slow
                    </li>
                  )}
                  <li>Check network tab for slow API calls</li>
                  <li>Consider implementing pagination or lazy loading</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
