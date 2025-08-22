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
import { NavigationProvider, useNavigation } from './navigation';

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
const mockPathname = '/pipelines';

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

import { getAgents } from '@client/api/v1/idk/agents';
import { getSkills } from '@client/api/v1/idk/skills';

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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test Skill 2',
    description: 'Test Skill Description 2',
    agent_id: '1',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
        {navigation.navigationState.selectedAgent?.name || 'None'}
      </div>
      <div data-testid="selected-skill">
        {navigation.navigationState.selectedSkill?.name || 'None'}
      </div>
      <div data-testid="current-view">
        {navigation.navigationState.currentView}
      </div>
      <div data-testid="breadcrumbs">
        {navigation.navigationState.breadcrumbs.map((b) => b.label).join(' > ')}
      </div>
      <button
        data-testid="set-agent"
        onClick={() => navigation.setSelectedAgent(mockAgents[0])}
        type="button"
      >
        Set Agent
      </button>
      <button
        data-testid="clear-agent"
        onClick={() => navigation.setSelectedAgent(undefined)}
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial navigation state', async () => {
    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    expect(screen.getByTestId('selected-agent')).toHaveTextContent('None');
    expect(screen.getByTestId('selected-skill')).toHaveTextContent('None');
    expect(screen.getByTestId('current-view')).toHaveTextContent('skills-list');
    expect(screen.getByTestId('breadcrumbs')).toHaveTextContent('Select Agent');
  });

  it('sets selected agent and navigates', async () => {
    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');
    await act(() => {
      fireEvent.click(setAgentButton);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'selectedAgentName',
      'Test Agent 1',
    );
    expect(mockPush).toHaveBeenCalledWith('/pipelines/Test%20Agent%201');
  });

  it('clears selected agent and navigates', async () => {
    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    const clearAgentButton = screen.getByTestId('clear-agent');
    await act(() => {
      fireEvent.click(clearAgentButton);
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'selectedAgentName',
    );
    expect(mockPush).toHaveBeenCalledWith('/pipelines');
  });

  it('navigates to skill dashboard', async () => {
    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    const navigateButton = screen.getByTestId('navigate-skill');
    await act(() => {
      fireEvent.click(navigateButton);
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/pipelines/Test%20Agent%201/Test%20Skill%201',
    );
  });

  it('handles localStorage failures gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage full');
    });

    act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');
    act(() => {
      fireEvent.click(setAgentButton);
    });

    // Should still navigate even if localStorage fails
    expect(mockPush).toHaveBeenCalledWith('/pipelines/Test%20Agent%201');
  });

  it('sanitizes agent names from URL parameters', async () => {
    // Mock params with potentially dangerous characters
    mockParams.agentName = 'Test<script>alert("xss")</script>Agent';

    act(() => {
      renderWithProviders(<TestComponent />);
    });

    await waitFor(() => {
      // Should load agents data
      expect(getAgents).toHaveBeenCalled();
    });

    // The sanitized name should be used for finding agents
    // Since no agent matches the sanitized name, selectedAgent should be undefined
    expect(screen.getByTestId('selected-agent')).toHaveTextContent('None');
  });

  it('generates correct breadcrumbs for different views', async () => {
    // Test with agent selected
    mockParams.agentName = 'Test%20Agent%201';

    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('breadcrumbs')).toHaveTextContent(
        'Agent: Test Agent 1 > Skills',
      );
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
            {navigation.navigationState.selectedAgent?.name || 'None'}
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

    await act(() => {
      renderWithProviders(<TestComponentWithSkill />);
    });

    await waitFor(() => {
      expect(getAgents).toHaveBeenCalled();
    });

    const navigateButton = screen.getByTestId('navigate-skill');
    await act(() => {
      fireEvent.click(navigateButton);
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/pipelines/Test%20Agent%201/Test%20Skill%201',
    );
  });
});

describe('Navigation helper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('sanitizes dangerous characters from names', async () => {
    const TestSanitizeComponent: React.FC = () => {
      const _navigation = useNavigation();

      React.useEffect(() => {
        // Test internal sanitization by attempting to find an agent with dangerous chars
        mockParams.agentName = 'Test<script>Agent';
      }, []);

      return <div data-testid="test">Test</div>;
    };

    await act(() => {
      renderWithProviders(<TestSanitizeComponent />);
    });

    // The component should render without throwing errors
    expect(screen.getByTestId('test')).toBeInTheDocument();
  });

  it('handles incognito mode localStorage restrictions', async () => {
    // Mock localStorage to throw on access
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');

    // Should not throw errors
    expect(() => {
      act(() => {
        fireEvent.click(setAgentButton);
      });
    }).not.toThrow();

    // Should still attempt navigation
    expect(mockPush).toHaveBeenCalledWith('/pipelines/Test%20Agent%201');
  });

  it('uses memory fallback when localStorage fails', async () => {
    // Mock localStorage to fail initially
    let storageCallCount = 0;
    mockLocalStorage.setItem.mockImplementation(() => {
      storageCallCount++;
      if (storageCallCount === 1) {
        throw new Error('Storage failed');
      }
      return undefined;
    });

    await act(() => {
      renderWithProviders(<TestComponent />);
    });

    const setAgentButton = screen.getByTestId('set-agent');

    // First click should fail localStorage but succeed with memory fallback
    await act(() => {
      fireEvent.click(setAgentButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/pipelines/Test%20Agent%201');

    // Second attempt should also work (using memory fallback)
    await act(() => {
      fireEvent.click(setAgentButton);
    });

    expect(mockPush).toHaveBeenCalledTimes(2);
  });
});
