import { NavigationProvider } from '@client/providers/navigation';
import type { Agent, Skill } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillsListView } from './skills-list-view';

// Mock Next.js navigation
const mockPush = vi.fn();
let mockParams: { agentName?: string } = { agentName: 'Test%20Agent' };
let mockPathname = '/agents/Test%20Agent';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathname),
}));

// Mock API functions and providers
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn(),
}));

vi.mock('@client/providers/skills', () => ({
  useSkills: vi.fn(),
}));

vi.mock('@client/providers/datasets', () => ({
  useDatasets: vi.fn(),
}));

vi.mock('@client/providers/evaluation-runs', () => ({
  useEvaluationRuns: vi.fn(),
}));

vi.mock('@client/providers/logs', () => ({
  useLogs: vi.fn(),
}));

import { getAgents } from '@client/api/v1/idk/agents';
import { getSkills } from '@client/api/v1/idk/skills';
import { useDatasets } from '@client/providers/datasets';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useLogs } from '@client/providers/logs';
import { useSkills } from '@client/providers/skills';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'Test Description',
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Email Response',
    description: 'Handles email responses',
    agent_id: 'agent-1',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'skill-2',
    name: 'Chat Support',
    description: 'Provides live chat support',
    agent_id: 'agent-1',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Helper factories to satisfy provider hook return types
const createSkillsCtx = (
  overrides: Partial<ReturnType<typeof useSkills>> = {},
): ReturnType<typeof useSkills> =>
  ({
    skills: mockSkills,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryParams: {},
    setQueryParams: vi.fn(),
    selectedSkill: null,
    setSelectedSkill: vi.fn(),
    createSkill: vi.fn(async () => mockSkills[0]!),
    updateSkill: vi.fn(async () => {
      /* noop */
    }),
    deleteSkill: vi.fn(async () => {
      /* noop */
    }),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    createError: null,
    updateError: null,
    deleteError: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    getSkillById: vi.fn(() => undefined),
    refreshSkills: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useSkills>;

const createDatasetsCtx = (
  overrides: Partial<ReturnType<typeof useDatasets>> = {},
): ReturnType<typeof useDatasets> =>
  ({
    datasets: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryParams: {},
    setQueryParams: vi.fn(),
    selectedDataset: null,
    setSelectedDataset: vi.fn(),
    createDataset: vi.fn(() => {
      // Return a minimal valid dataset
      const ds: import('@shared/types/data').Dataset = {
        id: '00000000-0000-0000-0000-000000000001',
        agent_id: '00000000-0000-0000-0000-000000000002',
        name: 'Dataset',
        description: null,
        is_realtime: false,
        realtime_size: 0,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      return Promise.resolve(ds);
    }),
    updateDataset: vi.fn(async () => {
      /* noop */
    }),
    deleteDataset: vi.fn(async () => {
      /* noop */
    }),
    logs: [],
    logsLoading: false,
    logsError: null,
    logQueryParams: {},
    setLogQueryParams: vi.fn(),
    refetchLogs: vi.fn(),
    addLogs: vi.fn(async () => []),
    deleteLogs: vi.fn(async () => {
      /* noop */
    }),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    createError: null,
    updateError: null,
    deleteError: null,
    isAddingLogs: false,
    isDeletingLogs: false,
    addLogsError: null,
    deleteLogsError: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    getDatasetById: vi.fn(() => undefined),
    refreshDatasets: vi.fn(),
    loadLogs: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useDatasets>;

const createEvaluationRunsCtx = (
  overrides: Partial<ReturnType<typeof useEvaluationRuns>> = {},
): ReturnType<typeof useEvaluationRuns> =>
  ({
    evaluationRuns: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryParams: {},
    setQueryParams: vi.fn(),
    selectedEvaluationRun: null,
    setSelectedEvaluationRun: vi.fn(),
    createEvaluationRun: vi.fn(() => {
      // Return a minimal valid evaluation run
      const run: import('@shared/types/data/evaluation-run').EvaluationRun = {
        id: '00000000-0000-0000-0000-000000000010',
        dataset_id: '00000000-0000-0000-0000-000000000011',
        agent_id: '00000000-0000-0000-0000-000000000012',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        name: 'Run',
        description: null,
        status: EvaluationRunStatus.COMPLETED,
        results: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        started_at: null,
        completed_at: null,
      };
      return Promise.resolve(run);
    }),
    updateEvaluationRun: vi.fn(async () => {
      /* noop */
    }),
    deleteEvaluationRun: vi.fn(async () => {
      /* noop */
    }),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    createError: null,
    updateError: null,
    deleteError: null,
    logOutputs: [],
    logOutputsLoading: false,
    logOutputsError: null,
    logOutputQueryParams: {},
    setLogOutputQueryParams: vi.fn(),
    refetchLogOutputs: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    getEvaluationRunById: vi.fn(() => undefined),
    refreshEvaluationRuns: vi.fn(),
    loadLogOutputs: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useEvaluationRuns>;

const createLogsCtx = (
  overrides: Partial<ReturnType<typeof useLogs>> = {},
): ReturnType<typeof useLogs> =>
  ({
    logs: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryParams: {},
    setQueryParams: vi.fn(),
    refreshLogs: vi.fn(),
    selectedLog: null,
    setSelectedLog: vi.fn(),
    logsViewOpen: false,
    setLogsViewOpen: vi.fn(),
    modifiedValue: '',
    setModifiedValue: vi.fn(),
    saveModifiedValue: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    getLogById: vi.fn(),
    queryLogs: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useLogs>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationProvider>{component}</NavigationProvider>
    </QueryClientProvider>,
  );
};

describe('SkillsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgents).mockResolvedValue([mockAgent]);
    vi.mocked(getSkills).mockResolvedValue(mockSkills);
    vi.mocked(useSkills).mockReturnValue(createSkillsCtx());
    vi.mocked(useDatasets).mockReturnValue(createDatasetsCtx());
    vi.mocked(useEvaluationRuns).mockReturnValue(createEvaluationRunsCtx());
    vi.mocked(useLogs).mockReturnValue(createLogsCtx());
    mockLocalStorage.getItem.mockReturnValue(null);
    mockParams = { agentName: 'Test%20Agent' };
    mockPathname = '/agents/Test%20Agent';
  });

  it('renders skills list when agent is selected', async () => {
    renderWithProviders(<SkillsListView />);

    await waitFor(() => {
      expect(screen.getByText('Email Response')).toBeInTheDocument();
      expect(screen.getByText('Chat Support')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    vi.mocked(useSkills).mockReturnValue(
      createSkillsCtx({ skills: [], isLoading: true }),
    );

    renderWithProviders(<SkillsListView />);

    // Loading state shows skeleton cards
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no skills exist', async () => {
    vi.mocked(useSkills).mockReturnValue(
      createSkillsCtx({ skills: [], isLoading: false }),
    );

    renderWithProviders(<SkillsListView />);

    await waitFor(() => {
      expect(screen.getByText(/no skills found/i)).toBeInTheDocument();
    });
  });

  it('shows message when no agent is selected', async () => {
    mockParams = { agentName: undefined };

    renderWithProviders(<SkillsListView />);

    await waitFor(() => {
      expect(screen.getAllByText(/select an agent/i).length).toBeGreaterThan(0);
    });
  });

  it('displays skill descriptions', async () => {
    renderWithProviders(<SkillsListView />);

    await waitFor(() => {
      expect(screen.getByText('Handles email responses')).toBeInTheDocument();
      expect(
        screen.getByText('Provides live chat support'),
      ).toBeInTheDocument();
    });
  });

  it('shows create skill button', async () => {
    renderWithProviders(<SkillsListView />);

    await waitFor(() => {
      expect(screen.getByText(/create skill/i)).toBeInTheDocument();
    });
  });
});
