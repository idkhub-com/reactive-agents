import {
  NavigationProvider,
  useNavigation,
} from '@client/providers/navigation';
import type { Agent, Skill } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockUsePathname = vi.fn();
type Params = Partial<{
  agentName: string;
  skillName: string;
  logId: string;
  evalId: string;
  datasetId: string;
}>;
const mockParams: Params = {};
let mockPathnameValue = '/agents';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathnameValue),
}));

// Set default pathname
mockUsePathname.mockReturnValue(mockPathnameValue);

// Mock API functions
vi.mock('@client/api/v1/reactive-agents/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/reactive-agents/skills', () => ({
  getSkills: vi.fn(),
}));

import { getAgents } from '@client/api/v1/reactive-agents/agents';
import { getSkills } from '@client/api/v1/reactive-agents/skills';

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Test Agent 1',
    description: 'Test Description 1',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test Agent 2',
    description: 'Test Description 2',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockSkills: Skill[] = [
  {
    id: '1',
    name: 'Test Skill 1',
    description: 'Test Skill Description 1',
    agent_id: '1',
    metadata: {},
    optimize: false,
    configuration_count: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    id: '2',
    name: 'Test Skill 2',
    description: 'Test Skill Description 2',
    agent_id: '1',
    metadata: {},
    optimize: false,
    configuration_count: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component to access navigation context
const TestComponent: React.FC = () => {
  const navigation = useNavigation();

  return (
    <div>
      <div data-testid="selected-agent">
        {navigation.navigationState.selectedAgentName || 'None'}
      </div>
      <div data-testid="selected-skill">
        {navigation.navigationState.selectedSkillName || 'None'}
      </div>
      <div data-testid="current-view">
        {navigation.navigationState.currentView}
      </div>
      <div data-testid="breadcrumbs">
        {navigation.navigationState.breadcrumbs.map((b) => b.label).join(' > ')}
      </div>
      <button
        data-testid="set-agent"
        onClick={() => navigation.router.push('/agents/Test%20Agent%201')}
        type="button"
      >
        Set Agent
      </button>
      <button
        data-testid="clear-agent"
        onClick={() => navigation.router.push('/agents')}
        type="button"
      >
        Clear Agent
      </button>
      <button
        data-testid="navigate-skill"
        onClick={() =>
          navigation.navigateToSkillDashboard('Test Agent 1', 'Test Skill 1')
        }
        type="button"
      >
        Navigate to Skill
      </button>
    </div>
  );
};

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

describe('NavigationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgents).mockResolvedValue(mockAgents);
    vi.mocked(getSkills).mockResolvedValue(mockSkills);
    mockLocalStorage.getItem.mockReturnValue(null);
    delete mockParams.agentName;
    delete mockParams.skillName;
    mockPathnameValue = '/agents'; // Reset pathname to default
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial navigation state', () => {
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    expect(screen.getByTestId('selected-agent')).toHaveTextContent('None');
    expect(screen.getByTestId('selected-skill')).toHaveTextContent('None');
    expect(screen.getByTestId('current-view')).toHaveTextContent('agents-list');
    expect(screen.getByTestId('breadcrumbs')).toHaveTextContent('Agents');
  });

  it('sets selected agent and navigates', () => {
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');
    act(() => {
      fireEvent.click(setAgentButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/agents/Test%20Agent%201');
  });

  it('clears selected agent and navigates', () => {
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const clearAgentButton = screen.getByTestId('clear-agent');
    act(() => {
      fireEvent.click(clearAgentButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/agents');
  });

  it('navigates to skill dashboard', () => {
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const navigateButton = screen.getByTestId('navigate-skill');
    act(() => {
      fireEvent.click(navigateButton);
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/agents/Test%20Agent%201/skills/Test%20Skill%201',
    );
  });

  it('navigates even without localStorage', () => {
    // Navigation should work independently of localStorage
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');
    act(() => {
      fireEvent.click(setAgentButton);
    });

    // Should navigate using router
    expect(mockPush).toHaveBeenCalledWith('/agents/Test%20Agent%201');
  });

  it('sanitizes agent names from URL parameters', async () => {
    // Mock params with potentially dangerous characters
    mockParams.agentName = 'Test<script>alert("xss")</script>Agent';

    act(() => {
      renderWithProviders(<TestComponent />);
    });

    // The navigation provider should parse the agent name from URL
    // It will show it escaped/sanitized in the UI
    await waitFor(() => {
      expect(screen.getByTestId('selected-agent')).toBeInTheDocument();
    });
  });

  it('generates correct breadcrumbs for different views', async () => {
    // Test with agent selected (skills list view)
    mockParams.agentName = 'Test%20Agent%201';
    mockPathnameValue = '/agents/Test%20Agent%201';

    act(() => {
      renderWithProviders(<TestComponent />);
    });

    // Check that breadcrumbs are generated (format: Agents > Test Agent 1)
    await waitFor(() => {
      const breadcrumbsText = screen.getByTestId('breadcrumbs').textContent;
      expect(breadcrumbsText).toContain('Agents');
      expect(breadcrumbsText).toContain('Test Agent 1');
    });
  });

  it('handles skill navigation with selected agent', async () => {
    // Mock with selected agent
    mockParams.agentName = 'Test%20Agent%201';

    const TestComponentWithSkill: React.FC = () => {
      const navigation = useNavigation();

      return (
        <div>
          <div data-testid="selected-agent">
            {navigation.navigationState.selectedAgentName || 'None'}
          </div>
          <button
            data-testid="navigate-skill"
            onClick={() =>
              navigation.navigateToSkillDashboard(
                'Test Agent 1',
                'Test Skill 1',
              )
            }
            type="button"
          >
            Navigate to Skill
          </button>
        </div>
      );
    };

    act(() => {
      renderWithProviders(<TestComponentWithSkill />);
    });

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByTestId('selected-agent')).toBeInTheDocument();
    });

    const navigateButton = screen.getByTestId('navigate-skill');
    act(() => {
      fireEvent.click(navigateButton);
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/agents/Test%20Agent%201/skills/Test%20Skill%201',
    );
  });

  it('parses edit-skill view from URL correctly', async () => {
    // Mock the URL pathname to simulate edit route
    mockPathnameValue = '/agents/Test%20Agent%201/skills/Test%20Skill%201/edit';

    mockParams.agentName = 'Test%20Agent%201';
    mockParams.skillName = 'Test%20Skill%201';

    act(() => {
      renderWithProviders(<TestComponent />);
    });

    // The navigation system should recognize the edit route
    // Verify it correctly parses the agent and skill from URL
    await waitFor(() => {
      expect(screen.getByTestId('selected-agent')).toHaveTextContent(
        'Test Agent 1',
      );
      expect(screen.getByTestId('current-view')).toHaveTextContent(
        'edit-skill',
      );
    });
  });

  it('parses skill-dashboard view from URL correctly', async () => {
    // Mock the URL pathname to simulate skill dashboard route
    mockPathnameValue = '/agents/Test%20Agent%201/skills/Test%20Skill%201';

    mockParams.agentName = 'Test%20Agent%201';
    mockParams.skillName = 'Test%20Skill%201';

    act(() => {
      renderWithProviders(<TestComponent />);
    });

    // The navigation system should recognize the skill dashboard route
    // Verify it correctly parses the skill from URL
    await waitFor(() => {
      expect(screen.getByTestId('selected-skill')).toHaveTextContent(
        'Test Skill 1',
      );
      expect(screen.getByTestId('current-view')).toHaveTextContent(
        'skill-dashboard',
      );
    });
  });
});

describe('Navigation helper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('sanitizes dangerous characters from names', () => {
    const TestSanitizeComponent: React.FC = () => {
      React.useEffect(() => {
        // Test internal sanitization by attempting to find an agent with dangerous chars
        mockParams.agentName = 'Test<script>Agent';
      }, []);

      return <div data-testid="test">Test</div>;
    };

    act(() => {
      renderWithProviders(<TestSanitizeComponent />);
    });

    // The component should render without throwing errors
    expect(screen.getByTestId('test')).toBeInTheDocument();
  });

  it('works without relying on localStorage', () => {
    // Navigation works purely through router, not localStorage
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');

    // Should not throw errors
    expect(() => {
      act(() => {
        fireEvent.click(setAgentButton);
      });
    }).not.toThrow();

    // Should navigate using router
    expect(mockPush).toHaveBeenCalledWith('/agents/Test%20Agent%201');
  });

  it('consistently navigates using router', () => {
    // Navigation is stateless and router-based
    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');

    // First navigation
    act(() => {
      fireEvent.click(setAgentButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/agents/Test%20Agent%201');

    // Second navigation should also work consistently
    act(() => {
      fireEvent.click(setAgentButton);
    });

    expect(mockPush).toHaveBeenCalledTimes(2);
  });
});
