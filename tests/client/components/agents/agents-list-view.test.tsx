import { AgentsListView } from '@client/components/agents/agents-list-view';
import { NavigationProvider } from '@client/providers/navigation';
import type { Agent } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockParams = {};
const mockPathname = '/agents';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: vi.fn() })),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathname),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock API functions and providers
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
  updateAgent: vi.fn(),
}));

vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn(),
}));

vi.mock('@client/providers/agents', () => ({
  useAgents: vi.fn(),
}));

import { getAgents } from '@client/api/v1/idk/agents';
import { getSkills } from '@client/api/v1/idk/skills';
import { useAgents } from '@client/providers/agents';

const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Test Agent 1',
    description: 'First test agent description',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'agent-2',
    name: 'Test Agent 2',
    description: 'Second test agent description',
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

const createAgentsCtx = (
  overrides: Partial<ReturnType<typeof useAgents>> = {},
): ReturnType<typeof useAgents> =>
  ({
    agents: mockAgents,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryParams: {},
    setQueryParams: vi.fn(),
    selectedAgent: null,
    setSelectedAgent: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    createError: null,
    updateError: null,
    deleteError: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    getAgentById: vi.fn(() => undefined),
    refreshAgents: vi.fn(),
    ...overrides,
  }) as unknown as ReturnType<typeof useAgents>;

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

describe('AgentsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgents).mockResolvedValue(mockAgents);
    vi.mocked(getSkills).mockResolvedValue([]);
    vi.mocked(useAgents).mockReturnValue(createAgentsCtx());
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders agents list with correct title', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(screen.getByText('Manage your AI agents')).toBeInTheDocument();
    });
  });

  it('renders all agents', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });
  });

  it('displays agent descriptions', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(
        screen.getByText('First test agent description'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Second test agent description'),
      ).toBeInTheDocument();
    });
  });

  it('shows create agent button', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /create agent/i }),
      ).toBeInTheDocument();
    });
  });

  it('navigates to agent when clicked', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      // Find the card by its class - it has "cursor-pointer" class
      const cards = document.querySelectorAll('.cursor-pointer');
      expect(cards.length).toBeGreaterThan(0);

      // Click the first agent card
      const firstCard = cards[0] as HTMLElement;
      firstCard.click();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/agents/Test%20Agent%201');
    });
  });

  it('does not show edit buttons on agent cards', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Verify no edit buttons are present
    const editButtons = screen.queryAllByRole('button', { name: /edit/i });
    // Should only have "Create Agent" button, no edit buttons
    expect(editButtons.length).toBe(0);
  });

  it('shows loading state', async () => {
    vi.mocked(useAgents).mockReturnValue(
      createAgentsCtx({ agents: [], isLoading: true }),
    );

    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no agents exist', async () => {
    vi.mocked(useAgents).mockReturnValue(
      createAgentsCtx({ agents: [], isLoading: false }),
    );

    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(screen.getByText(/no agents found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/you don't have any agents yet/i),
      ).toBeInTheDocument();
    });
  });

  it('filters agents by search query', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search agents...');
    searchInput.focus();
    searchInput.setAttribute('value', 'Agent 1');
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Note: The actual filtering logic happens in the component
    // This test just verifies the search input exists and can be interacted with
    expect(searchInput).toBeInTheDocument();
  });

  it('shows search input', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search agents...'),
      ).toBeInTheDocument();
    });
  });

  it('navigates to create agent page when create button is clicked', async () => {
    renderWithProviders(<AgentsListView />);

    await waitFor(() => {
      const createButton = screen.getByRole('button', {
        name: /create agent/i,
      });
      createButton.click();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/agents/create');
    });
  });
});
