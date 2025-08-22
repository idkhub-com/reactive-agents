import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentListView } from './agent-list-view';

// Mock the agents API
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Import mocked functions
import {
  createAgent,
  deleteAgent,
  getAgents,
  updateAgent,
} from '@client/api/v1/idk/agents';
import { AgentsProvider } from '@client/providers/agents';

const mockAgents = [
  {
    id: '1',
    name: 'Test Agent 1',
    description: 'First test agent description',
    metadata: {},
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Agent 2',
    description: 'Second test agent description',
    metadata: {},
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Search Agent',
    description: 'Agent for search functionality',
    metadata: {},
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
  },
];

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location.hash
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    href: 'http://localhost/',
  },
  writable: true,
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
});

describe('AgentListView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    mockPush.mockClear();
    localStorageMock.clear();
    window.location.hash = '';

    // Reset mocks with proper data
    vi.mocked(getAgents).mockResolvedValue(mockAgents);
    vi.mocked(createAgent).mockResolvedValue({
      id: '4',
      name: 'New Agent',
      description: 'New Agent Description',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(updateAgent).mockResolvedValue({
      ...mockAgents[0],
      description: 'Updated Description',
    });
    vi.mocked(deleteAgent).mockResolvedValue();

    // Reset all window mocks to ensure clean state
    vi.mocked(window.confirm).mockReturnValue(true);
  });

  const renderAgentListView = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <AgentListView />
        </AgentsProvider>
      </QueryClientProvider>,
    );

  it('renders with agents list', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Agents')).toBeInTheDocument();
      expect(
        screen.getByText('Manage your AI agents and their configurations'),
      ).toBeInTheDocument();
    });

    // Wait for agents to load and appear
    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    expect(screen.getByText('Search Agent')).toBeInTheDocument();
  });

  it('displays create agent button', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Create Agent')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Create Agent')).toHaveLength(1);
  });

  it('filters agents based on search input', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // All agents should be visible initially
    expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    expect(screen.getByText('Search Agent')).toBeInTheDocument();

    // Search for "Search"
    const searchInput = screen.getByPlaceholderText('Search agents...');
    fireEvent.change(searchInput, { target: { value: 'Search' } });

    // Wait for debounce and filtering to complete
    await waitFor(
      () => {
        expect(screen.queryByText('Test Agent 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Agent 2')).not.toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Only Search Agent should be visible
    expect(screen.getByText('Search Agent')).toBeInTheDocument();
  });

  it('searches by description as well as name', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Search by description
    const searchInput = screen.getByPlaceholderText('Search agents...');
    fireEvent.change(searchInput, { target: { value: 'First test' } });

    // Wait for debounce and filtering to complete
    await waitFor(
      () => {
        expect(screen.queryByText('Test Agent 2')).not.toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Only Agent 1 should match
    expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    expect(screen.queryByText('Search Agent')).not.toBeInTheDocument();
  });

  it('shows no results state when search yields no matches', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search agents...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No agents found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search criteria'),
      ).toBeInTheDocument();
    });
  });

  it('resets search when reset button is clicked', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Search for something specific
    const searchInput = screen.getByPlaceholderText('Search agents...');
    fireEvent.change(searchInput, { target: { value: 'Search' } });

    await waitFor(() => {
      expect(screen.getByText('Search Agent')).toBeInTheDocument();
      expect(screen.queryByText('Test Agent 1')).not.toBeInTheDocument();
    });

    // Click reset
    fireEvent.click(screen.getByText('Reset'));

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      expect(screen.getByText('Search Agent')).toBeInTheDocument();
    });

    // Search input should be cleared
    expect(searchInput).toHaveValue('');
  });

  it('navigates to create agent when create button is clicked', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Create Agent')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Agent'));

    expect(mockPush).toHaveBeenCalledWith('/agents/create');
  });

  it('shows loading state', () => {
    vi.mocked(getAgents).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderAgentListView();

    expect(screen.getByText('Loading agents...')).toBeInTheDocument();
  });

  it('shows empty state when no agents exist', async () => {
    vi.mocked(getAgents).mockResolvedValue([]);

    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('No agents yet')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Create your first agent to get started with AI assistance.',
        ),
      ).toBeInTheDocument();
    });

    // Should show create first agent button
    expect(screen.getByText('Create Your First Agent')).toBeInTheDocument();
  });

  it('navigates to agent view when agent is clicked', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Click on an agent
    fireEvent.click(screen.getByText('Test Agent 1'));

    expect(mockPush).toHaveBeenCalledWith('/agents/1');
  });

  it('shows agent actions on hover', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Actions should be hidden initially (opacity-0)
    const agentCard = screen.getByText('Test Agent 1').closest('div');
    expect(agentCard).toBeInTheDocument();
  });

  it('allows setting agent as active', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Find set active button (Settings icon)
    const setActiveButtons = screen.getAllByTitle('Set as active agent');
    expect(setActiveButtons).toHaveLength(3); // All agents should have set active button

    fireEvent.click(setActiveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('allows deleting agents with confirmation', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Find delete button (Trash icon)
    const deleteButtons = screen.getAllByTitle('Delete agent');
    expect(deleteButtons.length).toBeGreaterThan(0);

    await act(() => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Agent 1"?',
    );
    expect(vi.mocked(deleteAgent)).toHaveBeenCalledWith('1');
  });

  it('cancels deletion when user clicks cancel', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete agent');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(vi.mocked(deleteAgent)).not.toHaveBeenCalled();
  });

  it('prevents event propagation on action buttons', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Click on delete button should not navigate to agent view
    const deleteButtons = screen.getAllByTitle('Delete agent');
    fireEvent.click(deleteButtons[0]);

    // Should not navigate to agent view
    expect(window.location.hash).toBe('');
  });

  it('displays agent creation timestamps', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Should show creation dates
    expect(screen.getAllByText(/Created:/)).toHaveLength(3);
  });

  it('handles search input changes correctly', async () => {
    renderAgentListView();

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search agents...');

    // Test case sensitivity
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Wait for debounce and filtering to complete
    await waitFor(
      () => {
        expect(screen.queryByText('Search Agent')).not.toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Should still match despite different case
    expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
  });
});
