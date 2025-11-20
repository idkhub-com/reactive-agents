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
import { useMemo, useState } from 'react';
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

interface AgentPerformanceChartProps {
  evaluationScores: Array<{
    time_bucket: string;
    skill_id: string;
    avg_score: number | null;
    count: number;
  }>;
  events?: SkillEvent[];
  skills?: Array<{ id: string; name: string }>; // For skill name lookup
  title?: string;
  intervalMinutes?: number;
  windowHours?: number;
  endTime?: Date; // End time for the chart (rightmost bucket)
}

// Color palette for skill lines
const SKILL_COLORS = [
  'rgb(59, 130, 246)', // blue
  'rgb(168, 85, 247)', // purple
  'rgb(34, 197, 94)', // green
  'rgb(251, 146, 60)', // orange
  'rgb(236, 72, 153)', // pink
  'rgb(14, 165, 233)', // sky
  'rgb(6, 182, 212)', // cyan
  'rgb(245, 158, 11)', // amber
  'rgb(239, 68, 68)', // red
  'rgb(99, 102, 241)', // indigo
];

export function AgentPerformanceChart({
  evaluationScores,
  events = [],
  skills = [],
  title = 'Agent Performance Over Time (All Skills)',
  intervalMinutes = 60,
  windowHours = 24,
  endTime = new Date(),
}: AgentPerformanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Create skill name lookup map
  const skillNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const skill of skills) {
      map.set(skill.id, skill.name);
    }
    return map;
  }, [skills]);

  const chartData = useMemo(() => {
    // Generate all time buckets for the window
    const now = endTime;
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

    // Group scores by skill_id
    const skillScoreMap = new Map<string, Map<string, number | null>>();

    for (const score of evaluationScores) {
      if (!skillScoreMap.has(score.skill_id)) {
        skillScoreMap.set(score.skill_id, new Map());
      }
      const bucketTime = new Date(score.time_bucket).getTime();
      skillScoreMap
        .get(score.skill_id)!
        .set(
          bucketTime.toString(),
          score.avg_score !== null ? score.avg_score * 100 : null,
        );
    }

    // Fill in data for all buckets
    const labels = buckets.map((b) => b.label);

    // Create datasets for each skill
    const skillDatasets: Array<{
      label: string;
      data: (number | null)[];
      [key: string]: unknown;
    }> = [];

    let colorIndex = 0;
    for (const [skillId, scoreMap] of Array.from(skillScoreMap.entries())) {
      const skillName = skillNameMap.get(skillId) || 'Unknown Skill';
      const color = SKILL_COLORS[colorIndex % SKILL_COLORS.length];
      colorIndex++;

      const data = buckets.map((b) => {
        const score = scoreMap.get(b.time.getTime().toString());
        return score !== undefined ? score : null;
      });

      const hasOnlyOnePoint = data.filter((d) => d !== null).length === 1;

      skillDatasets.push({
        label: skillName,
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
      });
    }

    // Create event markers dataset for all buckets (invisible, for tooltips only)
    const eventData = buckets.map((bucket) => {
      const bucketTime = bucket.time.getTime();
      const nextBucketTime = bucketTime + intervalMinutes * 60 * 1000;

      // Find event in this time bucket (skill-wide events only, cluster_id is null)
      const event = events.find((e) => {
        if (e.cluster_id !== null) return false;
        const eventTime = new Date(e.created_at).getTime();
        return eventTime >= bucketTime && eventTime < nextBucketTime;
      });

      return event ? 50 : null; // Middle of chart (0-100 scale)
    });

    // Add events dataset
    const eventsDataset = {
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
    };

    return {
      labels,
      datasets: [...skillDatasets, eventsDataset],
      buckets, // Include for event annotation calculation
    };
  }, [
    evaluationScores,
    events,
    intervalMinutes,
    windowHours,
    endTime,
    skillNameMap,
  ]);

  // Create event annotations
  const eventAnnotations = useMemo(() => {
    if (events.length === 0 || !chartData.buckets) return {};

    const annotations: Record<string, unknown> = {};

    // Filter for skill-wide events only
    const skillWideEvents = events.filter((event) => event.cluster_id === null);

    for (const event of skillWideEvents) {
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
            backgroundColor: color,
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
    layout: {
      padding: {
        top: 5,
      },
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
                if (event.cluster_id !== null) return false;
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

                // Add skill name
                const skillName = skillNameMap.get(event.skill_id);
                if (skillName) {
                  lines.push(`Skill: ${skillName}`);
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
        text: title,
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
