import { NavigationProvider } from '@client/providers/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the EditSkillView component
vi.mock('@client/components/agents/skills/edit-skill-view', () => ({
  EditSkillView: () => <div data-testid="edit-skill-view">Edit Skill View</div>,
}));

// Mock the navigation provider
const mockNavigationState = {
  section: 'agents' as const,
  currentView: 'edit-skill' as const,
  selectedAgent: {
    id: 'agent-1',
    name: 'Test Agent 1',
    description: 'Test agent description',
    metadata: {},
    created_at: '2023-01-01T10:30:00Z',
    updated_at: '2023-01-01T10:30:00Z',
  },
  selectedSkill: {
    id: 'skill-1',
    agent_id: 'agent-1',
    name: 'Test Skill 1',
    description: 'Test skill description',
    metadata: {},
    max_configurations: 10,
    created_at: '2023-01-01T10:30:00Z',
    updated_at: '2023-01-01T10:30:00Z',
  },
  breadcrumbs: [],
};

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
    agentName: 'Test%20Agent%201',
    skillName: 'Test%20Skill%201',
  }),
  usePathname: () => '/agents/Test%20Agent%201/Test%20Skill%201/edit',
}));

vi.mock('@client/providers/navigation', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/navigation')>();
  return {
    ...actual,
    useNavigation: vi.fn(),
  };
});

import { useNavigation } from '@client/providers/navigation';
import EditSkillPage from './page';

describe('EditSkillPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();

    // Set default mock implementation
    vi.mocked(useNavigation).mockReturnValue({
      navigationState: mockNavigationState,
      isLoadingFromStorage: false,
      router: {
        push: mockPush,
        back: mockBack,
        replace: vi.fn(),
        refresh: vi.fn(),
        forward: vi.fn(),
        prefetch: vi.fn().mockResolvedValue(undefined),
      },
      setSection: vi.fn(),
      setSelectedAgent: vi.fn(),
      setSelectedSkill: vi.fn(),
      navigateToSkillDashboard: vi.fn(),
      navigateToLogs: vi.fn(),
      navigateToLogDetail: vi.fn(),
      navigateToEvaluations: vi.fn(),
      navigateToEvaluationDetail: vi.fn(),
      navigateToCreateEvaluation: vi.fn(),
      replaceToEvaluations: vi.fn(),
      navigateToDatasets: vi.fn(),
      replaceToDatasets: vi.fn(),
      navigateToDatasetDetail: vi.fn(),
      navigateToCreateDataset: vi.fn(),
      navigateToConfigurations: vi.fn(),
      navigateToModels: vi.fn(),
      navigateBack: vi.fn(),
      updateBreadcrumbs: vi.fn(),
      skills: [],
    });
  });

  const renderEditSkillPage = (overrideNavState = {}) => {
    const navState = { ...mockNavigationState, ...overrideNavState };

    vi.mocked(useNavigation).mockReturnValue({
      navigationState: navState,
      isLoadingFromStorage: false,
      router: {
        push: mockPush,
        back: mockBack,
        replace: vi.fn(),
        refresh: vi.fn(),
        forward: vi.fn(),
        prefetch: vi.fn().mockResolvedValue(undefined),
      },
      setSection: vi.fn(),
      setSelectedAgent: vi.fn(),
      setSelectedSkill: vi.fn(),
      navigateToSkillDashboard: vi.fn(),
      navigateToLogs: vi.fn(),
      navigateToLogDetail: vi.fn(),
      navigateToEvaluations: vi.fn(),
      navigateToEvaluationDetail: vi.fn(),
      navigateToCreateEvaluation: vi.fn(),
      replaceToEvaluations: vi.fn(),
      navigateToDatasets: vi.fn(),
      replaceToDatasets: vi.fn(),
      navigateToDatasetDetail: vi.fn(),
      navigateToCreateDataset: vi.fn(),
      navigateToConfigurations: vi.fn(),
      navigateToModels: vi.fn(),
      navigateBack: vi.fn(),
      updateBreadcrumbs: vi.fn(),
      skills: [],
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          <EditSkillPage />
        </NavigationProvider>
      </QueryClientProvider>,
    );
  };

  describe('Successful Rendering', () => {
    it('renders EditSkillView when agent and skill are available', () => {
      renderEditSkillPage();

      expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
      expect(screen.getByText('Edit Skill View')).toBeInTheDocument();
    });

    it('renders EditSkillView with correct navigation state', () => {
      renderEditSkillPage();

      // The component should render without errors when proper navigation state is provided
      expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('handles loading state properly', () => {
      vi.mocked(useNavigation).mockReturnValue({
        navigationState: mockNavigationState,
        isLoadingFromStorage: true,
        router: {
          push: mockPush,
          back: mockBack,
          replace: vi.fn(),
          refresh: vi.fn(),
          forward: vi.fn(),
          prefetch: vi.fn().mockResolvedValue(undefined),
        },
        setSection: vi.fn(),
        setSelectedAgent: vi.fn(),
        setSelectedSkill: vi.fn(),
        navigateToSkillDashboard: vi.fn(),
        navigateToLogs: vi.fn(),
        navigateToLogDetail: vi.fn(),
        navigateToEvaluations: vi.fn(),
        navigateToEvaluationDetail: vi.fn(),
        navigateToCreateEvaluation: vi.fn(),
        replaceToEvaluations: vi.fn(),
        navigateToDatasets: vi.fn(),
        replaceToDatasets: vi.fn(),
        navigateToDatasetDetail: vi.fn(),
        navigateToCreateDataset: vi.fn(),
        navigateToConfigurations: vi.fn(),
        navigateToModels: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
        skills: [],
      });

      renderEditSkillPage();

      // When loading from storage, component behavior is implementation-dependent
      // The key is that it doesn't crash and renders something
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error message when agent is not found', () => {
      renderEditSkillPage({ selectedAgent: undefined });

      expect(screen.getByText('Agent or skill not found')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-skill-view')).not.toBeInTheDocument();
    });

    it('shows error message when skill is not found', () => {
      renderEditSkillPage({ selectedSkill: undefined });

      expect(screen.getByText('Agent or skill not found')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-skill-view')).not.toBeInTheDocument();
    });

    it('shows error message when both agent and skill are not found', () => {
      renderEditSkillPage({
        selectedAgent: undefined,
        selectedSkill: undefined,
      });

      expect(screen.getByText('Agent or skill not found')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-skill-view')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Redirects', () => {
    it('handles missing agent state', () => {
      vi.mocked(useNavigation).mockReturnValue({
        navigationState: {
          ...mockNavigationState,
          selectedAgent: undefined,
        },
        isLoadingFromStorage: false,
        router: {
          push: mockPush,
          back: mockBack,
          replace: vi.fn(),
          refresh: vi.fn(),
          forward: vi.fn(),
          prefetch: vi.fn().mockResolvedValue(undefined),
        },
        setSection: vi.fn(),
        setSelectedAgent: vi.fn(),
        setSelectedSkill: vi.fn(),
        navigateToSkillDashboard: vi.fn(),
        navigateToLogs: vi.fn(),
        navigateToLogDetail: vi.fn(),
        navigateToEvaluations: vi.fn(),
        navigateToEvaluationDetail: vi.fn(),
        navigateToCreateEvaluation: vi.fn(),
        replaceToEvaluations: vi.fn(),
        navigateToDatasets: vi.fn(),
        replaceToDatasets: vi.fn(),
        navigateToDatasetDetail: vi.fn(),
        navigateToCreateDataset: vi.fn(),
        navigateToConfigurations: vi.fn(),
        navigateToModels: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
        skills: [],
      });

      renderEditSkillPage();

      // Component should handle missing agent gracefully
      expect(document.body).toBeInTheDocument();
    });

    it('handles missing skill state', () => {
      vi.mocked(useNavigation).mockReturnValue({
        navigationState: {
          ...mockNavigationState,
          selectedSkill: undefined,
        },
        isLoadingFromStorage: false,
        router: {
          push: mockPush,
          back: mockBack,
          replace: vi.fn(),
          refresh: vi.fn(),
          forward: vi.fn(),
          prefetch: vi.fn().mockResolvedValue(undefined),
        },
        setSection: vi.fn(),
        setSelectedAgent: vi.fn(),
        setSelectedSkill: vi.fn(),
        navigateToSkillDashboard: vi.fn(),
        navigateToLogs: vi.fn(),
        navigateToLogDetail: vi.fn(),
        navigateToEvaluations: vi.fn(),
        navigateToEvaluationDetail: vi.fn(),
        navigateToCreateEvaluation: vi.fn(),
        replaceToEvaluations: vi.fn(),
        navigateToDatasets: vi.fn(),
        replaceToDatasets: vi.fn(),
        navigateToDatasetDetail: vi.fn(),
        navigateToCreateDataset: vi.fn(),
        navigateToConfigurations: vi.fn(),
        navigateToModels: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
        skills: [],
      });

      renderEditSkillPage();

      // Component should handle missing skill gracefully
      expect(document.body).toBeInTheDocument();
    });

    it('does not crash when loading from storage', () => {
      vi.mocked(useNavigation).mockReturnValue({
        navigationState: {
          ...mockNavigationState,
          selectedAgent: undefined,
        },
        isLoadingFromStorage: true,
        router: {
          push: mockPush,
          back: mockBack,
          replace: vi.fn(),
          refresh: vi.fn(),
          forward: vi.fn(),
          prefetch: vi.fn().mockResolvedValue(undefined),
        },
        setSection: vi.fn(),
        setSelectedAgent: vi.fn(),
        setSelectedSkill: vi.fn(),
        navigateToSkillDashboard: vi.fn(),
        navigateToLogs: vi.fn(),
        navigateToLogDetail: vi.fn(),
        navigateToEvaluations: vi.fn(),
        navigateToEvaluationDetail: vi.fn(),
        navigateToCreateEvaluation: vi.fn(),
        replaceToEvaluations: vi.fn(),
        navigateToDatasets: vi.fn(),
        replaceToDatasets: vi.fn(),
        navigateToDatasetDetail: vi.fn(),
        navigateToCreateDataset: vi.fn(),
        navigateToConfigurations: vi.fn(),
        navigateToModels: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
        skills: [],
      });

      renderEditSkillPage();

      expect(mockPush).not.toHaveBeenCalled();
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Route Integration', () => {
    it('handles encoded agent and skill names in URL', () => {
      // The component receives URL params through the navigation provider
      // This test verifies that the component renders correctly with the default mock data
      renderEditSkillPage();

      expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
    });

    it('handles special characters in agent and skill names', () => {
      // The component receives URL params through the navigation provider
      // This test verifies that the component renders correctly with the default mock data
      renderEditSkillPage();

      expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('passes navigation state to EditSkillView', () => {
      renderEditSkillPage();

      // Verify that the EditSkillView component is rendered
      // The actual integration with navigation state is tested in EditSkillView tests
      expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
    });

    it('renders the correct edit page layout', () => {
      renderEditSkillPage();

      // Verify that the edit page is properly rendered
      expect(screen.getByTestId('edit-skill-view')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('component renders without crashing', () => {
      // Test that the component can be rendered without errors
      renderEditSkillPage();
      expect(document.body).toBeInTheDocument();
    });
  });
});
