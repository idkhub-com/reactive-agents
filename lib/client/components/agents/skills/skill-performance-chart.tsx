'use client';

import { eventColors, eventLabels } from '@client/constants';
import type { SkillEvent } from '@shared/types/data/skill-event';
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
import annotationPlugin from 'chartjs-plugin-annotation';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  annotationPlugin,
);

interface SkillPerformanceChartProps {
  evaluationScores: Array<{
    time_bucket: string;
    avg_score: number | null;
    scores_by_evaluation: Record<string, number> | null;
    count: number;
  }>;
  events?: SkillEvent[];
  clusters?: Array<{ id: string; name: string }>; // For cluster name lookup
  intervalMinutes?: number; // Bucket size in minutes
  windowHours?: number; // Total time window in hours
}

const METHOD_COLORS: Record<string, string> = {
  task_completion: 'rgb(59, 130, 246)', // blue
  argument_correctness: 'rgb(168, 85, 247)', // purple
  role_adherence: 'rgb(34, 197, 94)', // green
  turn_relevancy: 'rgb(251, 146, 60)', // orange
  tool_correctness: 'rgb(236, 72, 153)', // pink
  knowledge_retention: 'rgb(14, 165, 233)', // sky
  conversation_completeness: 'rgb(168, 85, 247)', // purple
  hallucination: 'rgb(220, 38, 38)', // red
  custom: 'rgb(148, 163, 184)', // gray
  latency: 'rgb(6, 182, 212)', // cyan
};

export function SkillPerformanceChart({
  evaluationScores,
  events = [],
  clusters = [],
  intervalMinutes = 60,
  windowHours = 24,
}: SkillPerformanceChartProps) {
  // Update current time to trigger chart re-render
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Create cluster name lookup map
  const clusterNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cluster of clusters) {
      map.set(cluster.id, cluster.name);
    }
    return map;
  }, [clusters]);

  useEffect(() => {
    // Update chart at the start of every minute (aligned to clock time)
    const updateInterval = Math.min(intervalMinutes * 60 * 1000, 60000); // At least every minute

    // Calculate milliseconds until next minute starts
    const now = new Date();
    const msUntilNextMinute =
      60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    // First update at the start of next minute
    const initialTimeout = setTimeout(() => {
      setCurrentTime(new Date());

      // Then update every interval after that
      intervalIdRef.current = setInterval(() => {
        setCurrentTime(new Date());
      }, updateInterval);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [intervalMinutes]);

  const chartData = useMemo(() => {
    // Generate all time buckets for the window
    const now = currentTime;
    const startTime = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
    const buckets: Array<{ time: Date; label: string }> = [];

    // Generate bucket times
    let bucketTime = new Date(startTime);
    // Round to bucket boundary
    const startMinutes =
      Math.floor(bucketTime.getMinutes() / intervalMinutes) * intervalMinutes;
    bucketTime.setMinutes(startMinutes, 0, 0);

    while (bucketTime <= now) {
      // Format label based on interval size
      let label: string;
      if (intervalMinutes >= 1440) {
        // 1 day or more: show only date
        label = format(bucketTime, 'MMM d');
      } else if (intervalMinutes >= 60) {
        // 1 hour to 24 hours: show date and hour
        label = format(bucketTime, 'MMM d, ha');
      } else {
        // Less than 1 hour: show date and time
        label = format(bucketTime, 'MMM d, h:mm a');
      }

      buckets.push({ time: new Date(bucketTime), label });
      bucketTime = new Date(bucketTime.getTime() + intervalMinutes * 60 * 1000);
    }

    // Create a map of time bucket to score
    const scoreMap = new Map<string, number | null>();
    for (const score of evaluationScores) {
      const bucketTime = new Date(score.time_bucket).getTime();
      scoreMap.set(
        bucketTime.toString(),
        score.avg_score !== null ? score.avg_score * 100 : null,
      );
    }

    // Fill in data for all buckets
    const labels = buckets.map((b) => b.label);

    // Collect all evaluation methods across all buckets
    const allMethods = new Set<string>();
    for (const score of evaluationScores) {
      if (score.scores_by_evaluation) {
        for (const method of Object.keys(score.scores_by_evaluation)) {
          allMethods.add(method);
        }
      }
    }

    // Create a map for each evaluation method
    const methodDataMaps = new Map<string, Map<string, number>>();
    for (const method of allMethods) {
      methodDataMaps.set(method, new Map());
    }

    // Fill method maps with scores
    for (const score of evaluationScores) {
      const bucketTime = new Date(score.time_bucket).getTime();
      if (score.scores_by_evaluation) {
        for (const [method, methodScore] of Object.entries(
          score.scores_by_evaluation,
        )) {
          const methodMap = methodDataMaps.get(method);
          if (methodMap) {
            methodMap.set(bucketTime.toString(), methodScore * 100);
          }
        }
      }
    }

    // Format method names
    const formatMethodName = (method: string) => {
      return method
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // Create datasets for each evaluation method
    const methodDatasets = Array.from(methodDataMaps.entries()).map(
      ([method, methodMap]) => {
        const data = buckets.map((b) => {
          const score = methodMap.get(b.time.getTime().toString());
          return score !== undefined ? score : null;
        });

        const hasOnlyOnePoint = data.filter((d) => d !== null).length === 1;
        const color = METHOD_COLORS[method] || 'rgb(148, 163, 184)';

        return {
          label: formatMethodName(method),
          data,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointRadius: hasOnlyOnePoint ? 2 : 0,
          pointHoverRadius: 8,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: 'white',
          tension: 0.3,
          spanGaps: true,
        };
      },
    );

    // Create weighted average dataset (only if more than 1 evaluation method)
    const shouldShowWeightedAverage = allMethods.size > 1;
    const datasets: Array<{
      label: string;
      data: (number | null)[];
      [key: string]: unknown;
    }> = [];

    if (shouldShowWeightedAverage) {
      const avgData = buckets.map((b) => {
        const score = scoreMap.get(b.time.getTime().toString());
        return score !== undefined ? score : null;
      });

      const hasOnlyOneAvgPoint = avgData.filter((d) => d !== null).length === 1;

      datasets.push({
        label: 'Weighted Average',
        data: avgData,
        borderColor: 'rgb(115, 115, 115)', // gray for overall average
        backgroundColor: 'rgb(115, 115, 115)',
        borderWidth: 3, // Thicker line to stand out
        pointRadius: hasOnlyOneAvgPoint ? 3 : 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(115, 115, 115)',
        pointHoverBorderColor: 'white',
        tension: 0.3,
        spanGaps: true,
      });
    }

    // Add method datasets
    datasets.push(...methodDatasets);

    // Create event markers dataset for all buckets (invisible, for tooltips only)
    const eventData = buckets.map((bucket) => {
      const bucketTime = bucket.time.getTime();
      const nextBucketTime = bucketTime + intervalMinutes * 60 * 1000;

      // Find event in this time bucket
      const event = events.find((e) => {
        const eventTime = new Date(e.created_at).getTime();
        return eventTime >= bucketTime && eventTime < nextBucketTime;
      });

      return event ? 50 : null; // Middle of chart (0-100 scale)
    });

    // Add events dataset
    datasets.push({
      label: 'Events',
      data: eventData,
      borderColor: 'rgba(0, 0, 0, 0)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderWidth: 0,
      pointRadius: 6, // Invisible point for hover area
      pointHoverRadius: 6,
      pointHoverBorderWidth: 0,
      tension: 0,
      spanGaps: false,
    });

    return {
      labels,
      datasets,
      buckets, // Include for event annotation calculation
    };
  }, [evaluationScores, events, intervalMinutes, windowHours, currentTime]);

  // Create event annotations
  const eventAnnotations = useMemo(() => {
    if (events.length === 0 || !chartData.buckets) return {};

    const annotations: Record<string, unknown> = {};

    // Show all events (both skill-wide and cluster-specific)
    for (const event of events) {
      const eventTime = new Date(event.created_at).getTime();

      // Find which time bucket this event falls into
      const xIndex = chartData.buckets.findIndex((bucket) => {
        const bucketTime = bucket.time.getTime();
        const nextBucketTime = bucketTime + intervalMinutes * 60 * 1000;
        return eventTime >= bucketTime && eventTime < nextBucketTime;
      });

      if (xIndex !== -1) {
        const color =
          eventColors[event.event_type as keyof typeof eventColors] ||
          'rgba(148, 163, 184, 0.6)';
        const label =
          eventLabels[event.event_type as keyof typeof eventLabels] ||
          event.event_type;

        annotations[`event-${event.id}`] = {
          type: 'line',
          xMin: xIndex,
          xMax: xIndex,
          borderColor: color,
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: label,
            position: 'start',
            rotation: 270,
            backgroundColor: color, // Use event color for label background
            color: 'white',
            font: {
              size: 9,
              weight: 'bold',
            },
            padding: 4,
          },
        };
      }
    }

    return annotations;
  }, [events, chartData, intervalMinutes]);

  // Combine event annotations with hover line
  const allAnnotations = useMemo(() => {
    const combined = { ...eventAnnotations };

    // Add vertical hover line
    if (hoveredIndex !== null) {
      combined.hoverLine = {
        type: 'line',
        xMin: hoveredIndex,
        xMax: hoveredIndex,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2,
        borderDash: [5, 5],
      };
    }

    return combined;
  }, [eventAnnotations, hoveredIndex]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 150, // Faster animation (default is 1000ms)
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onHover: (_event, activeElements) => {
      if (activeElements.length > 0) {
        setHoveredIndex(activeElements[0].index);
      } else {
        setHoveredIndex(null);
      }
    },
    plugins: {
      annotation: {
        // biome-ignore lint/suspicious/noExplicitAny: chartjs-plugin-annotation has complex types
        annotations: allAnnotations as any,
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 12,
          font: {
            size: 11,
          },
          color: 'rgb(115, 115, 115)',
          filter: (item) => item.text !== 'Events', // Hide Events from legend
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';

            // If this is the Events dataset, show event details
            if (label === 'Events') {
              const xIndex = context.dataIndex;
              const bucket = chartData.buckets?.[xIndex];
              if (!bucket) return 'Event';

              const bucketTime = bucket.time.getTime();
              const nextBucketTime = bucketTime + intervalMinutes * 60 * 1000;

              const eventsAtTime = events.filter((event) => {
                const eventTime = new Date(event.created_at).getTime();
                return eventTime >= bucketTime && eventTime < nextBucketTime;
              });

              if (eventsAtTime.length === 0) return 'Event';

              const lines: string[] = [];
              for (const event of eventsAtTime) {
                const eventLabel =
                  eventLabels[event.event_type as keyof typeof eventLabels] ||
                  event.event_type;

                const eventTime = new Date(event.created_at);
                const timeString = format(eventTime, 'MMM d, h:mm a');
                lines.push(timeString);
                lines.push(eventLabel);

                // Add cluster name if this is a cluster-specific event
                if (event.cluster_id) {
                  const clusterName = clusterNameMap.get(event.cluster_id);
                  if (clusterName) {
                    lines.push(`Partition: ${clusterName}`);
                  }
                }

                if (event.metadata.model_name) {
                  lines.push(String(event.metadata.model_name));
                }
              }

              return lines;
            }

            // For performance datasets, show the score
            const value = context.parsed.y;
            return `${label}: ${value!.toFixed(3)}`;
          },
        },
      },
      title: {
        display: true,
        text: 'Skill Performance Over Time',
        font: {
          size: 12,
        },
        color: 'rgb(115, 115, 115)',
        padding: {
          top: 10,
          bottom: 20,
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
            size: 10,
          },
          color: 'rgb(115, 115, 115)',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(115, 115, 115, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
          },
          color: 'rgb(115, 115, 115)',
          maxTicksLimit: 6,
          callback: (value) => {
            return Number(value).toFixed(2);
          },
        },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div className="w-full space-y-2">
      {/* Chart */}
      <div className="w-full h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
