import { AgentPerformanceChart } from '@client/components/agents/agent-performance-chart';
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

describe('AgentPerformanceChart', () => {
  const mockEvaluationScores = [
    {
      time_bucket: '2025-01-15T10:00:00Z',
      avg_score: 0.875,
      count: 2,
    },
    {
      time_bucket: '2025-01-15T11:00:00Z',
      avg_score: 0.9,
      count: 2,
    },
    {
      time_bucket: '2025-01-15T12:00:00Z',
      avg_score: 0.925,
      count: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render empty state when no evaluation runs are provided', () => {
    render(<AgentPerformanceChart evaluationScores={[]} />);

    // Component always renders chart, no empty state UI
    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
  });

  it('should render chart with evaluation data', () => {
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    expect(screen.getByText('Line Chart Mock')).toBeInTheDocument();
  });

  it.skip('should render all time interval buttons', () => {
    // Time interval UI removed from component
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    expect(screen.getByText('5 Min')).toBeInTheDocument();
    expect(screen.getByText('30 Min')).toBeInTheDocument();
    expect(screen.getByText('1 Hour')).toBeInTheDocument();
    expect(screen.getByText('1 Day')).toBeInTheDocument();
  });

  it.skip('should have 1 Hour selected by default', () => {
    // Time interval UI removed from component
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const oneHourButton = screen.getByText('1 Hour');
    expect(oneHourButton).toHaveClass('bg-blue-500', 'text-white');
  });

  it.skip('should change interval when clicking different interval button', () => {
    // Time interval UI removed from component
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const thirtyMinButton = screen.getByText('30 Min');
    const oneHourButton = screen.getByText('1 Hour');

    // Initially 1 Hour is selected
    expect(oneHourButton).toHaveClass('bg-blue-500', 'text-white');
    expect(thirtyMinButton).toHaveClass('bg-gray-100', 'text-gray-600');

    // Click 30 Min button
    fireEvent.click(thirtyMinButton);

    // Now 30 Min should be selected
    expect(thirtyMinButton).toHaveClass('bg-blue-500', 'text-white');
    expect(oneHourButton).toHaveClass('bg-gray-100', 'text-gray-600');
  });

  it.skip('should update chart data when interval changes', () => {
    // Time interval UI removed from component
    const { rerender } = render(
      <AgentPerformanceChart evaluationScores={mockEvaluationScores} />,
    );

    const chart = screen.getByTestId('line-chart');
    const initialData = chart.getAttribute('data-chart-data');

    // Click on 1 Day interval
    fireEvent.click(screen.getByText('1 Day'));

    // Re-render to get updated chart data
    rerender(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const updatedChart = screen.getByTestId('line-chart');
    const updatedData = updatedChart.getAttribute('data-chart-data');

    // Data should change when interval changes
    expect(updatedData).not.toBe(initialData);
  });

  it('should aggregate data across all skills', () => {
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    // Should have datasets
    expect(chartData.datasets).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);

    // Should have labels (time buckets)
    expect(chartData.labels).toBeDefined();
    expect(chartData.labels.length).toBeGreaterThan(0);
  });

  it('should configure chart options correctly', () => {
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const chart = screen.getByTestId('line-chart');
    const chartOptions = JSON.parse(
      chart.getAttribute('data-chart-options') || '{}',
    );

    expect(chartOptions.responsive).toBe(true);
    expect(chartOptions.maintainAspectRatio).toBe(false);
    expect(chartOptions.scales.y.min).toBe(0);
    expect(chartOptions.scales.y.max).toBe(100);
  });

  it('should display default chart title correctly', () => {
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const chart = screen.getByTestId('line-chart');
    const chartOptions = JSON.parse(
      chart.getAttribute('data-chart-options') || '{}',
    );

    expect(chartOptions.plugins.title.display).toBe(true);
    expect(chartOptions.plugins.title.text).toBe(
      'Agent Performance Over Time (All Skills)',
    );
  });

  it('should display custom chart title when provided', () => {
    const customTitle = 'Custom Performance Chart';
    render(
      <AgentPerformanceChart
        evaluationScores={mockEvaluationScores}
        title={customTitle}
      />,
    );

    const chart = screen.getByTestId('line-chart');
    const chartOptions = JSON.parse(
      chart.getAttribute('data-chart-options') || '{}',
    );

    expect(chartOptions.plugins.title.text).toBe(customTitle);
  });

  it('should span gaps in data correctly', () => {
    render(<AgentPerformanceChart evaluationScores={mockEvaluationScores} />);

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    const dataset = chartData.datasets[0];
    expect(dataset.spanGaps).toBe(true);
  });
});
