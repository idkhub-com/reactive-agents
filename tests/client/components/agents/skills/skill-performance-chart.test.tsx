import { SkillPerformanceChart } from '@client/components/agents/skills/skill-performance-chart';
import type { SkillOptimizationEvaluationRun } from '@shared/types/data/skill-optimization-evaluation-run';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Chart.js and react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(({ data, options }) => (
    <div
      data-testid="line-chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
    >
      Line Chart Mock
    </div>
  )),
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

describe('SkillPerformanceChart', () => {
  const mockEvaluationRuns: SkillOptimizationEvaluationRun[] = [
    {
      id: 'run-1',
      skill_id: 'skill-1',
      created_at: '2025-01-15T10:00:00Z',
      results: [
        { method: 'task_completion', score: 0.85 },
        { method: 'argument_correctness', score: 0.9 },
      ],
    },
    {
      id: 'run-2',
      skill_id: 'skill-1',
      created_at: '2025-01-15T11:00:00Z',
      results: [
        { method: 'task_completion', score: 0.88 },
        { method: 'argument_correctness', score: 0.92 },
      ],
    },
    {
      id: 'run-3',
      skill_id: 'skill-1',
      created_at: '2025-01-15T12:00:00Z',
      results: [
        { method: 'task_completion', score: 0.9 },
        { method: 'role_adherence', score: 0.95 },
      ],
    },
  ] as SkillOptimizationEvaluationRun[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render empty state when no evaluation runs are provided', () => {
    render(<SkillPerformanceChart evaluationRuns={[]} />);

    expect(
      screen.getByText(/No performance data available/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Evaluation runs will appear here once they are created/i,
      ),
    ).toBeInTheDocument();
  });

  it('should render chart with evaluation data', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    expect(screen.getByText('Line Chart Mock')).toBeInTheDocument();
  });

  it('should render all time interval buttons', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    expect(screen.getByText('5 Min')).toBeInTheDocument();
    expect(screen.getByText('30 Min')).toBeInTheDocument();
    expect(screen.getByText('1 Hour')).toBeInTheDocument();
    expect(screen.getByText('1 Day')).toBeInTheDocument();
  });

  it('should have 1 Hour selected by default', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const oneHourButton = screen.getByText('1 Hour');
    expect(oneHourButton).toHaveClass('bg-blue-500', 'text-white');
  });

  it('should change interval when clicking different interval button', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const fiveMinButton = screen.getByText('5 Min');
    const oneHourButton = screen.getByText('1 Hour');

    // Initially 1 Hour is selected
    expect(oneHourButton).toHaveClass('bg-blue-500', 'text-white');
    expect(fiveMinButton).toHaveClass('bg-gray-100', 'text-gray-600');

    // Click 5 Min button
    fireEvent.click(fiveMinButton);

    // Now 5 Min should be selected
    expect(fiveMinButton).toHaveClass('bg-blue-500', 'text-white');
    expect(oneHourButton).toHaveClass('bg-gray-100', 'text-gray-600');
  });

  it('should update chart data when interval changes', () => {
    const { rerender } = render(
      <SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />,
    );

    const chart = screen.getByTestId('line-chart');
    const initialData = chart.getAttribute('data-chart-data');

    // Click on 1 Day interval
    fireEvent.click(screen.getByText('1 Day'));

    // Re-render to get updated chart data
    rerender(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const updatedChart = screen.getByTestId('line-chart');
    const updatedData = updatedChart.getAttribute('data-chart-data');

    // Data should change when interval changes
    expect(updatedData).not.toBe(initialData);
  });

  it('should group data correctly for different intervals', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    // Should have datasets for each method
    expect(chartData.datasets).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);

    // Should have labels (time buckets)
    expect(chartData.labels).toBeDefined();
    expect(chartData.labels.length).toBeGreaterThan(0);
  });

  it('should format method names correctly in chart datasets', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    const datasetLabels = chartData.datasets.map(
      (ds: { label: string }) => ds.label,
    );

    // Should convert snake_case to Title Case
    expect(datasetLabels).toContain('Task Completion');
    expect(datasetLabels).toContain('Argument Correctness');
  });

  it('should apply correct colors to methods', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    const taskCompletionDataset = chartData.datasets.find(
      (ds: { label: string }) => ds.label === 'Task Completion',
    );

    expect(taskCompletionDataset).toBeDefined();
    expect(taskCompletionDataset.borderColor).toBe('rgb(59, 130, 246)'); // blue
  });

  it('should average scores within same time bucket', () => {
    // Create runs within the same hour
    const runsInSameHour: SkillOptimizationEvaluationRun[] = [
      {
        id: 'run-1',
        skill_id: 'skill-1',
        created_at: '2025-01-15T10:00:00Z',
        results: [{ method: 'task_completion', score: 0.8 }],
      },
      {
        id: 'run-2',
        skill_id: 'skill-1',
        created_at: '2025-01-15T10:30:00Z',
        results: [{ method: 'task_completion', score: 0.9 }],
      },
    ] as SkillOptimizationEvaluationRun[];

    render(<SkillPerformanceChart evaluationRuns={runsInSameHour} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    const taskCompletionDataset = chartData.datasets.find(
      (ds: { label: string }) => ds.label === 'Task Completion',
    );

    // Should average to 0.85 (0.8 + 0.9) / 2
    expect(taskCompletionDataset.data[0]).toBeCloseTo(0.85, 2);
  });

  it('should handle daily interval correctly', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    // Switch to 1 Day interval
    fireEvent.click(screen.getByText('1 Day'));

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    // Labels should be formatted as MM/DD for daily intervals
    expect(chartData.labels).toBeDefined();
    expect(chartData.labels.length).toBeGreaterThan(0);
    // Label should be in MM/DD format (e.g., "01/15")
    expect(chartData.labels[0]).toMatch(/^\d{2}\/\d{2}$/);
  });

  it('should show point radius when only one data point exists', () => {
    const singleRun: SkillOptimizationEvaluationRun[] = [
      {
        id: 'run-1',
        skill_id: 'skill-1',
        created_at: '2025-01-15T10:00:00Z',
        results: [{ method: 'task_completion', score: 0.85 }],
      },
    ] as SkillOptimizationEvaluationRun[];

    render(<SkillPerformanceChart evaluationRuns={singleRun} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    const dataset = chartData.datasets[0];
    expect(dataset.pointRadius).toBe(2);
  });

  it('should hide points when multiple data points exist', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    const dataset = chartData.datasets[0];
    expect(dataset.pointRadius).toBe(0);
  });

  it('should configure chart options correctly', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    const chartOptions = JSON.parse(
      chart.getAttribute('data-chart-options') || '{}',
    );

    expect(chartOptions.responsive).toBe(true);
    expect(chartOptions.maintainAspectRatio).toBe(false);
    expect(chartOptions.scales.y.min).toBe(0);
    expect(chartOptions.scales.y.max).toBe(1);
  });

  it('should display chart title correctly', () => {
    render(<SkillPerformanceChart evaluationRuns={mockEvaluationRuns} />);

    const chart = screen.getByTestId('line-chart');
    const chartOptions = JSON.parse(
      chart.getAttribute('data-chart-options') || '{}',
    );

    expect(chartOptions.plugins.title.display).toBe(true);
    expect(chartOptions.plugins.title.text).toBe('Skill Performance Over Time');
  });
});
