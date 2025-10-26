import { AgentsView } from '@client/components/agents/agents-view';
import { AgentsProvider } from '@client/providers/agents';
import { NavigationProvider } from '@client/providers/navigation';
import { SkillsProvider } from '@client/providers/skills';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js navigation
const mockPush = vi.fn();
type Params = Partial<{
  agentName: string;
  skillName: string;
  logId: string;
  clusterName: string;
  armName: string;
}>;
const mockParams: Params = {};
let mockPathname = '/agents';
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathname),
  useSearchParams: vi.fn(() => mockSearchParams),
}));

// Mock API functions
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn(),
}));

// Mock all agent view components
vi.mock('@client/components/agents/agents-list-view', () => ({
  AgentsListView: () => <div data-testid="agents-list-view">Agents List</div>,
}));

vi.mock('@client/components/agents/edit-agent-view', () => ({
  EditAgentView: () => <div data-testid="edit-agent-view">Edit Agent</div>,
}));

vi.mock('@client/components/agents/skills/skills-list-view', () => ({
  SkillsListView: () => <div data-testid="skills-list-view">Skills List</div>,
}));

vi.mock('@client/components/agents/skills/skill-dashboard-view', () => ({
  SkillDashboardView: () => (
    <div data-testid="skill-dashboard-view">Skill Dashboard</div>
  ),
}));

vi.mock('@client/components/agents/skills/edit-skill-view', () => ({
  EditSkillView: () => <div data-testid="edit-skill-view">Edit Skill</div>,
}));

vi.mock('@client/components/agents/skills/logs/logs-view', () => ({
  LogsView: () => <div data-testid="logs-view">Logs View</div>,
}));

vi.mock('@client/components/agents/skills/logs/log-details-view', () => ({
  LogDetailsView: () => <div data-testid="log-details-view">Log Detail</div>,
}));

vi.mock('@client/components/agents/skills/clusters/clusters-view', () => ({
  ClustersView: () => <div data-testid="clusters-view">Clusters</div>,
}));

vi.mock('@client/components/agents/skills/clusters/cluster-arms-view', () => ({
  ClusterArmsView: () => (
    <div data-testid="cluster-arms-view">Cluster Arms</div>
  ),
}));

vi.mock('@client/components/agents/skills/arms/arm-detail-view', () => ({
  ArmDetailView: () => <div data-testid="arm-detail-view">Arm Detail</div>,
}));

vi.mock('@client/components/agents/skills/models/models-view', () => ({
  ModelsView: () => <div data-testid="models-view">Models</div>,
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
        <NavigationProvider>
          <AgentsProvider>
            <SkillsProvider>{component}</SkillsProvider>
          </AgentsProvider>
        </NavigationProvider>
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
    delete mockParams.logId;
    delete mockParams.clusterName;
    delete mockParams.armName;
    mockPathname = '/agents';
  });

  it('renders agents list view when path is /agents', async () => {
    mockPathname = '/agents';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('agents-list-view')).toBeInTheDocument();
    expect(screen.getByText('Agents List')).toBeInTheDocument();
  });

  it('renders skills list view when agent is selected', async () => {
    mockParams.agentName = 'Test Agent';
    mockPathname = '/agents/Test%20Agent';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('skills-list-view')).toBeInTheDocument();
    expect(screen.getByText('Skills List')).toBeInTheDocument();
  });

  it('renders edit agent view when current view is edit-agent', async () => {
    mockParams.agentName = 'Test Agent';
    mockPathname = '/agents/Test%20Agent/edit';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('edit-agent-view')).toBeInTheDocument();
    expect(screen.getByText('Edit Agent')).toBeInTheDocument();
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

  it('renders models view when current view is models', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/models';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('models-view')).toBeInTheDocument();
  });

  it('renders clusters view when current view is clusters', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockPathname = '/agents/Test%20Agent/Test%20Skill/partitions';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('clusters-view')).toBeInTheDocument();
  });

  it('renders cluster arms view when current view is cluster-arms', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockParams.clusterName = 'cluster-123';
    mockPathname =
      '/agents/Test%20Agent/Test%20Skill/partitions/cluster-123/arms';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('cluster-arms-view')).toBeInTheDocument();
  });

  it('renders arm detail view when current view is arm-detail', async () => {
    mockParams.agentName = 'Test Agent';
    mockParams.skillName = 'Test Skill';
    mockParams.clusterName = 'cluster-123';
    mockParams.armName = 'arm-123';
    mockPathname =
      '/agents/Test%20Agent/Test%20Skill/partitions/cluster-123/arms/arm-123';

    await renderWithProviders(<AgentsView />);

    expect(screen.getByTestId('arm-detail-view')).toBeInTheDocument();
  });

  it('renders skills list view for invalid routes as fallback', async () => {
    mockPathname = '/agents/invalid/path/structure';

    await renderWithProviders(<AgentsView />);

    // Invalid routes default to skills-list view
    expect(screen.getByTestId('skills-list-view')).toBeInTheDocument();
  });

  it('has proper layout structure with flex container', async () => {
    mockPathname = '/agents';

    await renderWithProviders(<AgentsView />);

    const container =
      screen.getByTestId('agents-list-view').parentElement?.parentElement;
    expect(container).toHaveClass('flex', 'flex-col', 'h-full');

    const contentWrapper = screen.getByTestId('agents-list-view').parentElement;
    expect(contentWrapper).toHaveClass('flex-1', 'overflow-auto');
  });
});
