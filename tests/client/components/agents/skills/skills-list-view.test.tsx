import { AgentView } from '@client/components/agents/agent-view';
import { AgentsProvider } from '@client/providers/agents';
import { NavigationProvider } from '@client/providers/navigation';
import { SkillsProvider } from '@client/providers/skills';
import type { Agent, Skill } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js navigation
const mockPush = vi.fn();
let mockParams: { agentName?: string } = { agentName: 'Test%20Agent' };
let mockPathname = '/agents/Test%20Agent';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathname),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock API functions and providers
vi.mock('@client/api/v1/reactive-agents/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/reactive-agents/skills', () => ({
  getSkills: vi.fn(),
}));

vi.mock('@client/providers/skills', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/skills')>();
  return {
    ...actual,
    useSkills: vi.fn(),
  };
});

vi.mock('@client/providers/logs', () => ({
  useLogs: vi.fn(),
}));

import { getAgents } from '@client/api/v1/reactive-agents/agents';
import { getSkills } from '@client/api/v1/reactive-agents/skills';
import { useLogs } from '@client/providers/logs';
import { useSkills } from '@client/providers/skills';

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
    optimize: false,
    configuration_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    clustering_interval: 0,
    reflection_min_requests_per_arm: 0,
    exploration_temperature: 1.0,
    last_clustering_at: null,
    last_clustering_log_start_time: null,
    evaluations_regenerated_at: null,
    evaluation_lock_acquired_at: null,
    total_requests: 0,
    allowed_template_variables: ['datetime'],
  },
  {
    id: 'skill-2',
    name: 'Chat Support',
    description: 'Provides live chat support',
    agent_id: 'agent-1',
    metadata: {},
    optimize: false,
    configuration_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    clustering_interval: 0,
    reflection_min_requests_per_arm: 0,
    exploration_temperature: 1.0,
    last_clustering_at: null,
    last_clustering_log_start_time: null,
    evaluations_regenerated_at: null,
    evaluation_lock_acquired_at: null,
    total_requests: 0,
    allowed_template_variables: ['datetime'],
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

const createLogsCtx = (
  overrides: Partial<ReturnType<typeof useLogs>> = {},
): ReturnType<typeof useLogs> =>
  ({
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
    ...overrides,
  }) as unknown as ReturnType<typeof useLogs>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          <AgentsProvider>
            <SkillsProvider>{component}</SkillsProvider>
          </AgentsProvider>
        </NavigationProvider>
      </QueryClientProvider>,
    ),
  };
};

describe('SkillsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgents).mockResolvedValue([mockAgent]);
    vi.mocked(getSkills).mockResolvedValue(mockSkills);
    vi.mocked(useSkills).mockReturnValue(createSkillsCtx());
    vi.mocked(useLogs).mockReturnValue(createLogsCtx());
    mockLocalStorage.getItem.mockReturnValue(null);
    mockParams = { agentName: 'Test%20Agent' };
    mockPathname = '/agents/Test%20Agent';
  });

  it('renders skills list when agent is selected', async () => {
    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(screen.getByText('Email Response')).toBeInTheDocument();
      expect(screen.getByText('Chat Support')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    vi.mocked(useSkills).mockReturnValue(
      createSkillsCtx({ skills: [], isLoading: true }),
    );

    renderWithProviders(<AgentView />);

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

    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(screen.getByText(/no skills found/i)).toBeInTheDocument();
    });
  });

  it('shows message when no agent is selected', async () => {
    mockParams = { agentName: undefined };

    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(screen.getAllByText(/select an agent/i).length).toBeGreaterThan(0);
    });
  });

  it('displays skill descriptions', async () => {
    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(screen.getByText('Handles email responses')).toBeInTheDocument();
      expect(
        screen.getByText('Provides live chat support'),
      ).toBeInTheDocument();
    });
  });

  it('shows create skill button', async () => {
    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(screen.getByText(/create skill/i)).toBeInTheDocument();
    });
  });

  it('shows more options button', async () => {
    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /more options/i }),
      ).toBeInTheDocument();
    });
  });

  it('navigates to edit agent page when edit agent menu item is clicked', async () => {
    const { user } = renderWithProviders(<AgentView />);

    await waitFor(() => {
      const moreOptionsButton = screen.getByRole('button', {
        name: /more options/i,
      });
      expect(moreOptionsButton).toBeInTheDocument();
    });

    // Open the dropdown menu
    const moreOptionsButton = screen.getByRole('button', {
      name: /more options/i,
    });
    await user.click(moreOptionsButton);

    // Click the edit menu item
    await waitFor(() => {
      const editMenuItem = screen.getByRole('menuitem', {
        name: /edit agent/i,
      });
      expect(editMenuItem).toBeInTheDocument();
    });

    const editMenuItem = screen.getByRole('menuitem', { name: /edit agent/i });
    await user.click(editMenuItem);

    // Check that push was called with correct path
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/agents/Test%20Agent/edit');
    });
  });

  it('does not show more options button when no agent is selected', async () => {
    mockParams = { agentName: undefined };

    renderWithProviders(<AgentView />);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /more options/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('displays DiceBear avatar for each skill', async () => {
    renderWithProviders(<AgentView />);

    await waitFor(() => {
      // Should find images for each skill
      const images = screen.getAllByRole('img');

      // Find skill avatars (excluding agent avatar in header)
      const emailSkillAvatar = images.find((img) =>
        img.getAttribute('alt')?.includes('Email Response'),
      );
      const chatSkillAvatar = images.find((img) =>
        img.getAttribute('alt')?.includes('Chat Support'),
      );

      expect(emailSkillAvatar).toBeTruthy();
      expect(chatSkillAvatar).toBeTruthy();

      // Avatars should have base64 SVG data
      expect(emailSkillAvatar?.getAttribute('src')).toContain(
        'data:image/svg+xml;base64',
      );
      expect(chatSkillAvatar?.getAttribute('src')).toContain(
        'data:image/svg+xml;base64',
      );
    });
  });
});
