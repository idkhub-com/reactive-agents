'use client';

import type { SkillOptimizationEvaluationRun } from '@shared/types/data/skill-optimization-evaluation-run';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface ClusterPerformanceChartProps {
  evaluationRuns: SkillOptimizationEvaluationRun[];
}

const METHOD_COLORS: Record<string, string> = {
  task_completion: 'rgb(59, 130, 246)', // blue
  argument_correctness: 'rgb(168, 85, 247)', // purple
  role_adherence: 'rgb(34, 197, 94)', // green
  turn_relevancy: 'rgb(251, 146, 60)', // orange
  tool_correctness: 'rgb(236, 72, 153)', // pink
  hallucination: 'rgb(14, 165, 233)', // sky
  custom: 'rgb(168, 85, 247)', // purple
};

export function ClusterPerformanceChart({
  evaluationRuns,
}: ClusterPerformanceChartProps) {
  const chartData = useMemo(() => {
    if (evaluationRuns.length === 0) return null;

    // Group by method, then by hour
    const methodHourlyScores = new Map<
      EvaluationMethodName,
      Map<string, number[]>
    >();

    for (const run of evaluationRuns) {
      const date = new Date(run.created_at);
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;

      for (const result of run.results) {
        if (!methodHourlyScores.has(result.method)) {
          methodHourlyScores.set(result.method, new Map());
        }
        const hourlyScores = methodHourlyScores.get(result.method)!;

        if (!hourlyScores.has(hourKey)) {
          hourlyScores.set(hourKey, []);
        }
        hourlyScores.get(hourKey)!.push(result.score);
      }
    }

    // Get all unique hours sorted
    const allHours = new Set<string>();
    for (const hourlyScores of methodHourlyScores.values()) {
      for (const hour of hourlyScores.keys()) {
        allHours.add(hour);
      }
    }
    const sortedHours = Array.from(allHours).sort();

    // Format method name
    const formatMethodName = (method: string) => {
      return method
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // Build datasets for Chart.js
    const datasets = Array.from(methodHourlyScores.entries()).map(
      ([method, hourlyScores]) => {
        const data = sortedHours.map((hour) => {
          const scores = hourlyScores.get(hour) || [];
          return scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : null;
        });

        const color = METHOD_COLORS[method] || 'rgb(148, 163, 184)';

        // Show points when there's only one data point (can't draw a line with one point)
        const hasOnlyOnePoint = sortedHours.length === 1;

        return {
          label: formatMethodName(method),
          data,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointRadius: hasOnlyOnePoint ? 1 : 0,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 2,
          tension: 0.3,
          spanGaps: true,
        };
      },
    );

    return {
      labels: sortedHours.map((hour) => {
        // Format to show just time for compact display
        const parts = hour.split(' ');
        return parts[1] || hour;
      }),
      datasets,
    };
  }, [evaluationRuns]);

  if (!chartData) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
        No performance data
      </div>
    );
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          padding: 8,
          font: {
            size: 9,
          },
          color: 'rgb(115, 115, 115)',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(3)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 9,
          },
          color: 'rgb(115, 115, 115)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 5,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(115, 115, 115, 0.1)',
        },
        ticks: {
          font: {
            size: 9,
          },
          color: 'rgb(115, 115, 115)',
          maxTicksLimit: 4,
          callback: (value) => {
            return Number(value).toFixed(2);
          },
        },
        min: 0,
        max: 1,
      },
    },
  };

  return (
    <div className="w-full h-32">
      <Line data={chartData} options={options} />
    </div>
  );
}
