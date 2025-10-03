'use client';

import type { SkillOptimizationEvaluationRun } from '@shared/types/data/skill-optimization-evaluation-run';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { useMemo } from 'react';

interface ClusterPerformanceChartProps {
  evaluationRuns: SkillOptimizationEvaluationRun[];
}

interface MethodDataPoint {
  hour: string;
  score: number;
}

interface MethodData {
  method: EvaluationMethodName;
  data: MethodDataPoint[];
  color: string;
}

const METHOD_COLORS: Record<string, string> = {
  task_completion: 'hsl(var(--chart-1))',
  argument_correctness: 'hsl(var(--chart-2))',
  role_adherence: 'hsl(var(--chart-3))',
  turn_relevancy: 'hsl(var(--chart-4))',
  tool_correctness: 'hsl(var(--chart-5))',
  hallucination: 'hsl(220, 70%, 50%)',
  custom: 'hsl(280, 70%, 50%)',
};

export function ClusterPerformanceChart({
  evaluationRuns,
}: ClusterPerformanceChartProps) {
  const chartData = useMemo(() => {
    if (evaluationRuns.length === 0) return { methods: [], hours: [] };

    // Group by method, then by hour
    const methodHourlyScores = new Map<
      EvaluationMethodName,
      Map<string, number[]>
    >();

    for (const run of evaluationRuns) {
      const date = new Date(run.created_at);
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;

      for (const result of run.results) {
        if (!methodHourlyScores.has(result.evaluation_method)) {
          methodHourlyScores.set(result.evaluation_method, new Map());
        }
        const hourlyScores = methodHourlyScores.get(result.evaluation_method)!;

        if (!hourlyScores.has(hourKey)) {
          hourlyScores.set(hourKey, []);
        }
        hourlyScores.get(hourKey)!.push(result.evaluation_score);
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

    // Build data for each method
    const methods: MethodData[] = Array.from(methodHourlyScores.entries()).map(
      ([method, hourlyScores]) => ({
        method,
        color: METHOD_COLORS[method] || 'hsl(var(--primary))',
        data: sortedHours.map((hour) => {
          const scores = hourlyScores.get(hour) || [];
          const avgScore =
            scores.length > 0
              ? scores.reduce((sum, s) => sum + s, 0) / scores.length
              : 0;
          return { hour, score: avgScore };
        }),
      }),
    );

    return { methods, hours: sortedHours };
  }, [evaluationRuns]);

  if (chartData.methods.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
        No performance data
      </div>
    );
  }

  const width = 250;
  const height = 80;
  const padding = 5;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Get overall min/max across all methods
  const allScores = chartData.methods.flatMap((m) =>
    m.data.map((d) => d.score),
  );
  const maxScore = Math.max(...allScores);
  const minScore = Math.min(...allScores);
  const scoreRange = maxScore - minScore || 1;

  const formatMethodName = (method: string) => {
    return method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="w-full space-y-2">
      <svg
        width={width}
        height={height}
        className="w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Cluster performance chart by evaluation method"
      >
        {/* Grid lines */}
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={1}
        />

        {/* Line chart for each method */}
        {chartData.methods.map((methodData) => {
          const points = methodData.data
            .map((d, i) => {
              const x =
                (i / (chartData.hours.length - 1 || 1)) * chartWidth + padding;
              const y =
                chartHeight -
                ((d.score - minScore) / scoreRange) * chartHeight +
                padding;
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <g key={methodData.method}>
              <polyline
                points={points}
                fill="none"
                stroke={methodData.color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {methodData.data.map((d, i) => {
                const x =
                  (i / (chartData.hours.length - 1 || 1)) * chartWidth +
                  padding;
                const y =
                  chartHeight -
                  ((d.score - minScore) / scoreRange) * chartHeight +
                  padding;
                return (
                  <circle
                    key={`${methodData.method}-${d.hour}`}
                    cx={x}
                    cy={y}
                    r={1.5}
                    fill={methodData.color}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {chartData.methods.map((methodData) => (
          <div key={methodData.method} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: methodData.color }}
            />
            <span className="text-[9px] text-muted-foreground">
              {formatMethodName(methodData.method)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Score: {minScore.toFixed(2)}</span>
        <span>{maxScore.toFixed(2)}</span>
      </div>
    </div>
  );
}
