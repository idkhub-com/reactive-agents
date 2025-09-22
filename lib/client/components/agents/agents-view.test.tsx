import { NavigationProvider } from '@client/providers/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsView } from './agents-view';

// Mock Next.js navigation
const mockPush = vi.fn();
type Params = Partial<{
  agentName: string;
  skillName: string;
  logId: string;
  evalId: string;
  datasetId: string;
}>;
const mockParams: Params = {};
let mockPathname = '/agents';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathname),
}));

// Mock API functions
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn(),
}));

// Mock all agent view components
vi.mock('./skills/skills-list-view', () => ({
  SkillsListView: () => <div data-testid="skills-list-view">Skills List</div>,
}));

vi.mock('./skills/skill-dashboard-view', () => ({
  SkillDashboardView: () => (
    <div data-testid="skill-dashboard-view">Skill Dashboard</div>
  ),
}));

vi.mock('./skills/edit-skill-view', () => ({
  EditSkillView: () => <div data-testid="edit-skill-view">Edit Skill</div>,
}));

vi.mock('./skills/logs/logs-view', () => ({
  LogsView: () => <div data-testid="logs-view">Logs View</div>,
}));

vi.mock('./skills/logs/log-details-view', () => ({
  LogDetailsView: () => <div data-testid="log-details-view">Log Detail</div>,
}));

vi.mock('./skills/evaluation-runs/evaluation-runs-view', () => ({
  EvaluationRunsView: () => (
    <div data-testid="evaluation-runs-view">Evaluations</div>
  ),
}));

vi.mock('./skills/evaluation-runs/evaluation-run-details-view', () => ({
  EvaluationRunDetailsView: () => (
    <div data-testid="evaluation-detail-view">Evaluation Detail</div>
  ),
}));

vi.mock('./skills/datasets/datasets-view', () => ({
  DatasetsView: () => <div data-testid="datasets-view">Datasets</div>,
}));

vi.mock('./skills/datasets/dataset-details-view', () => ({
  DatasetDetailsView: () => (
    <div data-testid="dataset-detail-view">Dataset Detail</div>
  ),
}));

vi.mock('./skills/evaluation-runs/create-evaluation-run-view', () => ({
  CreateEvaluationRunView: () => (
    <div data-testid="create-evaluation-view">Create Evaluation</div>
  ),
}));

vi.mock('./skills/datasets/create-dataset-view', () => ({
  CreateDatasetView: () => (
    <div data-testid="create-dataset-view">Create Dataset</div>
  ),
}));

import { getAgents } from '@client/api/v1/idk/agents';
import { getSkills } from '@client/api/v1/idk/skills';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const renderWithProviders = async (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return await act(() => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>{component}</NavigationProvider>
      </QueryClientProvider>,
    );
  });
};

describe('AgentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgents).mockResolvedValue([]);
    vi.mocked(getSkills).mockResolvedValue([]);
    mockLocalStorage.getItem.mockReturnValue(null);
    delete mockParams.agentName;
    delete mockParams.skillName;
    mockPathname = '/agents';
  });

  it('renders skills list view by default', async () => {
    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('skills-list-view')).toBeInTheDocument();
    expect(screen.getByText('Skills List')).toBeInTheDocument();
  });

  it('renders skill dashboard view when current view is skill-dashboard', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('skill-dashboard-view')).toBeInTheDocument();
  });

  it('renders edit skill view when current view is edit-skill', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/edit';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
    expect(screen.getByText('Edit Skill')).toBeInTheDocument();
  });

  it('renders logs view when current view is logs', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/logs';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('logs-view')).toBeInTheDocument();
  });

  it('renders log detail view when current view is log-detail', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockParams.logId = 'log-123';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/logs/log-123';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('log-details-view')).toBeInTheDocument();
  });

  it('renders evaluations view when current view is evaluations', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/evaluations';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('evaluation-runs-view')).toBeInTheDocument();
  });

  it('renders evaluation detail view when current view is evaluation-detail', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockParams.evalId = 'eval-123';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/evaluations/eval-123';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('evaluation-detail-view')).toBeInTheDocument();
  });

  it('renders datasets view when current view is datasets', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/datasets';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('datasets-view')).toBeInTheDocument();
  });

  it('renders dataset detail view when current view is dataset-detail', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockParams.datasetId = 'dataset-123';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/datasets/dataset-123';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('dataset-detail-view')).toBeInTheDocument();
  });

  it('renders create evaluation view when current view is create-evaluation', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/evaluations/create';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('create-evaluation-view')).toBeInTheDocument();
  });

  it('renders create dataset view when current view is create-dataset', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/datasets/create';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('create-dataset-view')).toBeInTheDocument();
  });

  it('renders default view for invalid routes', async () => {
    mockPathname = '/agents/invalid/path/structure';

    await renderWithProviders(<AgentsView />);

    // Invalid routes default to skills-list view
    expect(screen.getByTestId('skills-list-view')).toBeInTheDocument();
  });

  it('has proper layout structure with flex container', async () => {
    await renderWithProviders(<AgentsView />);

    const container =
      screen.getByTestId('skills-list-view').parentElement?.parentElement;
    expect(container).toHaveClass('flex', 'flex-col', 'h-full');

    const contentWrapper = screen.getByTestId('skills-list-view').parentElement;
    expect(contentWrapper).toHaveClass('flex-1', 'overflow-auto');
  });
});
