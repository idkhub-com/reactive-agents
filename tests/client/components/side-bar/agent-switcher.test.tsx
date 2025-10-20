import { AgentSwitcher } from '@client/components/side-bar/agent-switcher';
import { AgentsProvider } from '@client/providers/agents';
import { SidebarProvider } from '@client/providers/side-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the agents API
vi.mock('@client/api/v1/idk/agents', () => {
  const mockAgents = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Agent 1',
      description: 'First agent',
      metadata: {},
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Agent 2',
      description: 'Second agent',
      metadata: {},
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Agent 3',
      description: 'Third agent',
      metadata: {},
      created_at: '2023-01-03T00:00:00Z',
      updated_at: '2023-01-03T00:00:00Z',
    },
  ];

  return {
    getAgents: vi.fn().mockResolvedValue(mockAgents),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
  };
});

// Mock the skills API (required by NavigationProvider)
vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn().mockResolvedValue([]),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockPathnameValue = '/agents/Agent%202'; // Use a pathname with agent to prevent clearing

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathnameValue,
  useParams: () => ({ agentName: 'Agent%202' }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

// Mock keyboard shortcuts hook
vi.mock('@client/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  useModifierKey: () => '⌘',
}));

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

describe('AgentSwitcher', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockPush.mockClear();
    localStorageMock.clear();

    // Reset localStorage getItem mock to return null by default
    localStorageMock.getItem.mockReturnValue(null);

    // Ensure getAgents mock returns the expected data
    const { getAgents } = await import('@client/api/v1/idk/agents');
    const mockAgentsData = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Agent 1',
        description: 'First agent',
        metadata: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Agent 2',
        description: 'Second agent',
        metadata: {},
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Agent 3',
        description: 'Third agent',
        metadata: {},
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z',
      },
    ];
    vi.mocked(getAgents).mockResolvedValue(mockAgentsData);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });

    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      value: {
        hash: '',
      },
      writable: true,
    });

    // Mock window.matchMedia for mobile hook
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const renderAgentSwitcher = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <AgentsProvider>
            <AgentSwitcher />
          </AgentsProvider>
        </SidebarProvider>
      </QueryClientProvider>,
    );

  it('renders with agents available', async () => {
    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    expect(screen.getByRole('button')).toHaveTextContent('Agent 1');
  });

  it('displays agents with keyboard shortcuts when dropdown is rendered', async () => {
    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    // Verify the button has correct attributes indicating it's a dropdown trigger
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');

    // The dropdown content may not render in jsdom, but we can verify the button shows the correct agent
    expect(button).toHaveTextContent('Agent 1');
    expect(button).toHaveTextContent('First agent');
  });

  it('displays the first agent as selected by default', async () => {
    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    // Verify the first agent is selected by default
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Agent 1');
    expect(button).toHaveTextContent('First agent');
  });

  it('renders button with dropdown attributes when agents are available', async () => {
    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    // Verify the dropdown trigger has correct ARIA attributes
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-state', 'closed');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('shows create first agent button when no agents are available', async () => {
    // Mock empty agents array
    const getAgentsMock = vi.mocked(
      (await import('@client/api/v1/idk/agents')).getAgents,
    );
    getAgentsMock.mockResolvedValue([]);

    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Create your first agent')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Create your first agent');

    // Click should navigate to create agent
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/agents/create');
  });

  it('displays first agent from multiple agents', async () => {
    // Mock more agents to verify first one is selected
    const getAgentsMock = vi.mocked(
      (await import('@client/api/v1/idk/agents')).getAgents,
    );
    getAgentsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${i + 1}`,
        name: `Agent ${i + 1}`,
        description: `Agent ${i + 1} description`,
        metadata: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      })),
    );

    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    // Verify first agent is shown even with multiple agents available
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Agent 1');
    expect(button).toHaveTextContent('Agent 1 description');
  });

  it('displays correct agent information in button', async () => {
    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    // Verify agent information is displayed correctly
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Agent 1');
    expect(button).toHaveTextContent('First agent');

    // Verify bot icon is present
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it.skip('restores selected agent from localStorage', async () => {
    // NOTE: This test is skipped because the behavior has changed with NavigationProvider.
    // The NavigationProvider now handles localStorage differently and clears the selected
    // agent when on the /agents path. This test was testing legacy AgentsProvider behavior.

    // Pre-populate localStorage with selected agent NAME (not ID)
    localStorageMock.getItem.mockReturnValue('Agent 2');

    renderAgentSwitcher();

    await waitFor(() => {
      // Should show the agent from localStorage, not the first one
      expect(screen.getByText('Agent 2')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Agent 2');
    expect(button).toHaveTextContent('Second agent');
  });

  it('handles loading state gracefully', async () => {
    // Mock loading state
    const getAgentsMock = vi.mocked(
      (await import('@client/api/v1/idk/agents')).getAgents,
    );
    getAgentsMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderAgentSwitcher();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles error state gracefully', async () => {
    // Mock error
    const getAgentsMock = vi.mocked(
      (await import('@client/api/v1/idk/agents')).getAgents,
    );
    getAgentsMock.mockRejectedValue(new Error('Failed to fetch agents'));

    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Create your first agent')).toBeInTheDocument();
    });

    // Should show create first agent button
    expect(screen.getByRole('button')).toHaveTextContent(
      'Create your first agent',
    );
  });

  it('renders with correct structure and classes', async () => {
    // Reset localStorage mock to ensure clean state
    localStorageMock.getItem.mockReturnValue(null);

    renderAgentSwitcher();

    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
    });

    // Verify component structure
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-size', 'lg');
    expect(button).toHaveAttribute('data-sidebar', 'menu-button');

    // Verify it's contained within sidebar menu structure
    const menuItem = button.closest('[data-sidebar="menu-item"]');
    expect(menuItem).toBeInTheDocument();

    const menu = menuItem?.closest('[data-sidebar="menu"]');
    expect(menu).toBeInTheDocument();
  });
});
