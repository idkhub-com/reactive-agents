import { SkillDashboardView } from '@client/components/agents/skills/skill-dashboard-view';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js router and params before importing component
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
  }),
  useParams: () => ({
    agentName: 'Test%20Agent',
    skillName: 'Test%20Skill',
  }),
  usePathname: () => '/agents/Test%20Agent/Test%20Skill',
}));

// Mock the skills API to prevent real HTTP calls
vi.mock('@client/api/v1/reactive-agents/skills', () => ({
  getSkillEvaluationScoresByTimeBucket: vi.fn().mockResolvedValue([]),
  getSkills: vi.fn().mockResolvedValue([]),
  getSkillClusterStates: vi.fn().mockResolvedValue([]),
  getSkillModels: vi.fn().mockResolvedValue([]),
  getSkillEvaluations: vi.fn().mockResolvedValue([]),
  getSkillEvaluationRuns: vi.fn().mockResolvedValue([]),
}));

// Mock agent and skill objects
const mockAgent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'Test agent description',
  metadata: {},
  created_at: '2023-01-01T10:30:00Z',
  updated_at: '2023-01-01T10:30:00Z',
};

const mockSkill = {
  id: 'skill-1',
  agent_id: 'agent-1',
  name: 'Test Skill',
  description: 'Test skill description',
  metadata: {},
  optimize: true,
  configuration_count: 15,
  created_at: '2023-01-01T10:30:00Z',
  updated_at: '2023-01-01T10:30:00Z',
  clustering_interval: 15,
  reflection_min_requests_per_arm: 3,
  exploration_temperature: 1.0,
};

// Mock the agents provider
vi.mock('@client/providers/agents', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/agents')>();
  return {
    ...actual,
    useAgents: vi.fn(),
  };
});

// Mock the navigation provider
vi.mock('@client/providers/navigation', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/navigation')>();
  return {
    ...actual,
    useNavigation: vi.fn(),
  };
});

// Mock the skills provider
vi.mock('@client/providers/skills', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/skills')>();
  return {
    ...actual,
    useSkills: vi.fn(),
  };
});

// Mock other providers
vi.mock('@client/providers/logs', () => ({
  useLogs: vi.fn(),
}));

vi.mock('@client/providers/models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@client/providers/skill-optimization-clusters', () => ({
  useSkillOptimizationClusters: vi.fn(),
}));

vi.mock('@client/providers/skill-optimization-evaluation-runs', () => ({
  useSkillOptimizationEvaluationRuns: vi.fn(),
}));

vi.mock('@client/providers/skill-optimization-evaluations', () => ({
  useSkillOptimizationEvaluations: vi.fn(),
}));

vi.mock('@client/providers/skill-events', () => ({
  useSkillEvents: vi.fn(),
}));

// Mock dialog components
vi.mock('@client/components/agents/skills/manage-skill-models-dialog', () => ({
  ManageSkillModelsDialog: () => <div data-testid="manage-models-dialog" />,
}));

vi.mock(
  '@client/components/agents/skills/manage-skill-evaluations-dialog',
  () => ({
    ManageSkillEvaluationsDialog: () => (
      <div data-testid="manage-evaluations-dialog" />
    ),
  }),
);

// Mock the skill validation hook
vi.mock('@client/hooks/use-skill-validation', () => ({
  useSkillValidation: vi.fn(),
}));

import { useSkillValidation } from '@client/hooks/use-skill-validation';
import { useAgents } from '@client/providers/agents';
import { useLogs } from '@client/providers/logs';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillEvents } from '@client/providers/skill-events';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkillOptimizationEvaluationRuns } from '@client/providers/skill-optimization-evaluation-runs';
import { useSkillOptimizationEvaluations } from '@client/providers/skill-optimization-evaluations';
import { useSkills } from '@client/providers/skills';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

describe('SkillDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(useAgents).mockReturnValue({
      selectedAgent: mockAgent,
      agents: [mockAgent],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      createError: null,
      updateError: null,
      deleteError: null,
      getAgentById: vi.fn(),
      setSelectedAgent: vi.fn(),
      refreshAgents: vi.fn(),
    } as unknown as never);

    vi.mocked(useNavigation).mockReturnValue({
      navigationState: {
        section: 'agents' as const,
        currentView: 'skill-dashboard' as const,
        selectedAgentName: 'Test Agent',
        selectedSkillName: 'Test Skill',
        breadcrumbs: [],
      },
      navigateToAgents: vi.fn(),
      navigateToAgentDetail: vi.fn(),
      navigateToSkillDashboard: vi.fn(),
      navigateToLogs: vi.fn(),
      navigateToClusters: vi.fn(),
      navigateToClusterArms: vi.fn(),
      navigateToArmDetail: vi.fn(),
    } as unknown as never);

    vi.mocked(useSkills).mockReturnValue({
      selectedSkill: mockSkill,
      skills: [mockSkill],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      queryParams: {},
      setQueryParams: vi.fn(),
      setSelectedSkill: vi.fn(),
      createSkill: vi.fn(),
      updateSkill: vi.fn(),
      deleteSkill: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      createError: null,
      updateError: null,
      deleteError: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      getSkillById: vi.fn(),
      refreshSkills: vi.fn(),
    } as unknown as never);

    vi.mocked(useLogs).mockReturnValue({
      logs: [],
      selectedLog: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      agentId: null,
      setAgentId: vi.fn(),
      skillId: null,
      setSkillId: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      getLogById: vi.fn(),
      refreshLogs: vi.fn(),
    } as unknown as never);

    vi.mocked(useModels).mockReturnValue({
      skillModels: [],
      isLoadingSkillModels: false,
      setSkillId: vi.fn(),
    } as unknown as never);

    vi.mocked(useSkillOptimizationClusters).mockReturnValue({
      clusters: [],
      isLoading: false,
      setSkillId: vi.fn(),
      selectedCluster: null,
      setSelectedCluster: vi.fn(),
      refetch: vi.fn(),
    } as unknown as never);

    vi.mocked(useSkillOptimizationEvaluationRuns).mockReturnValue({
      evaluationRuns: [],
      isLoading: false,
      setSkillId: vi.fn(),
    } as unknown as never);

    vi.mocked(useSkillOptimizationEvaluations).mockReturnValue({
      evaluations: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      setSkillId: vi.fn(),
    } as unknown as never);

    vi.mocked(useSkillValidation).mockReturnValue({
      isReady: true,
      missingRequirements: [],
    } as unknown as never);

    vi.mocked(useSkillEvents).mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      skillId: null,
      setSkillId: vi.fn(),
      clusterId: null,
      setClusterId: vi.fn(),
      eventType: null,
      setEventType: vi.fn(),
      scope: 'all',
      setScope: vi.fn(),
      page: 1,
      pageSize: 20,
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      hasMore: false,
      getEventsByClusterId: vi.fn(() => []),
      getEventsBySkillId: vi.fn(() => []),
      clearFilters: vi.fn(),
    } as unknown as never);
  });

  it('renders skill dashboard with skill name', async () => {
    renderWithProviders(<SkillDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('Test Skill')).toBeInTheDocument();
    });
  });

  it('displays DiceBear avatar in the page header', async () => {
    renderWithProviders(<SkillDashboardView />);

    await waitFor(() => {
      // Should find an image with the skill name in alt text
      const images = screen.getAllByRole('img');
      const skillAvatar = images.find(
        (img) =>
          img.getAttribute('alt')?.includes('Test Skill') &&
          img.getAttribute('alt')?.includes('icon'),
      );

      expect(skillAvatar).toBeTruthy();

      // Avatar should have base64 SVG data
      const src = skillAvatar?.getAttribute('src');
      expect(src).toContain('data:image/svg+xml;base64');
    });
  });

  it('displays skill description', async () => {
    renderWithProviders(<SkillDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('Test skill description')).toBeInTheDocument();
    });
  });

  it('shows no skill selected message when skill is not available', async () => {
    vi.mocked(useSkills).mockReturnValue({
      selectedSkill: null,
      skills: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      queryParams: {},
      setQueryParams: vi.fn(),
      setSelectedSkill: vi.fn(),
      createSkill: vi.fn(),
      updateSkill: vi.fn(),
      deleteSkill: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      createError: null,
      updateError: null,
      deleteError: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      getSkillById: vi.fn(),
      refreshSkills: vi.fn(),
    } as unknown as never);

    renderWithProviders(<SkillDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('Skill Dashboard')).toBeInTheDocument();
      const messages = screen.getAllByText(/no skill selected/i);
      expect(messages.length).toBeGreaterThan(0);
    });
  });
});
