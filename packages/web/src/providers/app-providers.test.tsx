import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock all the providers to avoid complex setup
vi.mock('@web/providers/query-client', () => ({
  ReactQueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-query-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/sse', () => ({
  SSEProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sse-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/navigation', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navigation-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/ai-providers', () => ({
  AIProvidersProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ai-providers-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/models', () => ({
  ModelsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="models-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/system-settings', () => ({
  SystemSettingsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="system-settings-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/agents', () => ({
  AgentsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="agents-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/skills', () => ({
  SkillsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="skills-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/skill-events', () => ({
  SkillEventsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="skill-events-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/skill-optimization-clusters', () => ({
  SkillOptimizationClustersProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => (
    <div data-testid="skill-optimization-clusters-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/skill-optimization-arms', () => ({
  SkillOptimizationArmsProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="skill-optimization-arms-provider">{children}</div>,
}));

vi.mock('@web/providers/skill-optimization-evaluation-runs', () => ({
  SkillOptimizationEvaluationRunsProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => (
    <div data-testid="skill-optimization-evaluation-runs-provider">
      {children}
    </div>
  ),
}));

vi.mock('@web/providers/skill-optimization-evaluations', () => ({
  SkillOptimizationEvaluationsProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => (
    <div data-testid="skill-optimization-evaluations-provider">{children}</div>
  ),
}));

vi.mock('@web/providers/logs', () => ({
  LogsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="logs-provider">{children}</div>
  ),
}));

vi.mock('@web/components/error-boundary', () => ({
  ErrorBoundary: ({
    children,
  }: {
    children: React.ReactNode;
    fallback?: (error: Error) => React.ReactNode;
  }) => <div data-testid="error-boundary">{children}</div>,
}));

// Import after mocking
import { AppProviders } from '@web/providers/app-providers';

describe('AppProviders', () => {
  it('renders children through all providers', () => {
    render(
      <AppProviders>
        <div data-testid="child-content">Test Content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('wraps providers in correct nesting order', () => {
    render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    // Verify the provider hierarchy by checking the DOM structure
    // ReactQueryProvider should be outermost
    const reactQueryProvider = screen.getByTestId('react-query-provider');
    expect(reactQueryProvider).toBeInTheDocument();

    // ErrorBoundary should be inside ReactQueryProvider
    const errorBoundary = screen.getByTestId('error-boundary');
    expect(reactQueryProvider.contains(errorBoundary)).toBe(true);

    // SSEProvider inside ErrorBoundary
    const sseProvider = screen.getByTestId('sse-provider');
    expect(errorBoundary.contains(sseProvider)).toBe(true);

    // NavigationProvider inside SSEProvider
    const navigationProvider = screen.getByTestId('navigation-provider');
    expect(sseProvider.contains(navigationProvider)).toBe(true);

    // LogsProvider should be innermost (contains children)
    const logsProvider = screen.getByTestId('logs-provider');
    expect(logsProvider).toBeInTheDocument();
    expect(logsProvider.textContent).toContain('Content');
  });

  it('includes all required providers', () => {
    render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    // Check all providers are present
    expect(screen.getByTestId('react-query-provider')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('sse-provider')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-provider')).toBeInTheDocument();
    expect(screen.getByTestId('ai-providers-provider')).toBeInTheDocument();
    expect(screen.getByTestId('models-provider')).toBeInTheDocument();
    expect(screen.getByTestId('system-settings-provider')).toBeInTheDocument();
    expect(screen.getByTestId('agents-provider')).toBeInTheDocument();
    expect(screen.getByTestId('skills-provider')).toBeInTheDocument();
    expect(screen.getByTestId('skill-events-provider')).toBeInTheDocument();
    expect(
      screen.getByTestId('skill-optimization-clusters-provider'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('skill-optimization-arms-provider'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('skill-optimization-evaluation-runs-provider'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('skill-optimization-evaluations-provider'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('logs-provider')).toBeInTheDocument();
  });
});
