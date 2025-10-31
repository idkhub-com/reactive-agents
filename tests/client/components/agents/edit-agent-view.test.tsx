import { AgentsProvider } from '@client/providers/agents';
import { NavigationProvider } from '@client/providers/navigation';
import { SkillsProvider } from '@client/providers/skills';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
    agentName: 'Test%20Agent%201',
  }),
  usePathname: () => '/agents/Test%20Agent%201/edit',
}));

import { EditAgentView } from '@client/components/agents/edit-agent-view';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';

// Mock the navigation provider with proper state
const mockNavigationState = {
  section: 'agents' as const,
  currentView: 'edit-agent' as const,
  selectedAgentName: 'Test Agent 1',
  breadcrumbs: [],
};

// Mock agent object
const mockAgent = {
  id: 'agent-1',
  name: 'Test Agent 1',
  description: 'First test agent description with enough characters',
  metadata: {},
  created_at: '2023-01-01T10:30:00Z',
  updated_at: '2023-01-01T10:30:00Z',
};

// Mock the agents API
vi.mock('@client/api/v1/reactive-agents/agents', () => {
  const mockUpdateAgent = vi.fn();

  return {
    updateAgent: mockUpdateAgent,
    getAgents: vi.fn().mockResolvedValue([]),
    createAgent: vi.fn(),
    deleteAgent: vi.fn(),
  };
});

// Mock sanitization utilities
vi.mock('@shared/utils/security', () => ({
  sanitizeDescription: (desc: string) => desc,
  sanitizeUserInput: (input: string) => input,
}));

// Mock the navigation provider
vi.mock('@client/providers/navigation', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/navigation')>();
  return {
    ...actual,
    useNavigation: vi.fn(),
  };
});

// Mock the agents provider
vi.mock('@client/providers/agents', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/agents')>();
  return {
    ...actual,
    useAgents: vi.fn(),
  };
});

describe('EditAgentView', () => {
  let queryClient: QueryClient;
  const mockUpdateAgent = vi.fn();

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
    mockUpdateAgent.mockClear();

    // Set default mock implementation for useNavigation
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
      navigateToClusters: vi.fn(),
      navigateToClusterArms: vi.fn(),
      navigateToArmDetail: vi.fn(),
      navigateBack: vi.fn(),
      updateBreadcrumbs: vi.fn(),
    });

    // Set default mock implementation for useAgents
    vi.mocked(useAgents).mockReturnValue({
      agents: [],
      selectedAgent: mockAgent,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      queryParams: {},
      setQueryParams: vi.fn(),
      createAgent: vi.fn(),
      updateAgent: mockUpdateAgent,
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
      getAgentById: vi.fn(),
      refreshAgents: vi.fn(),
      isCreateAgentDialogOpen: false,
      setIsCreateAgentDialogOpen: vi.fn(),
    });

    // Mock the agents provider context
    vi.mocked(mockUpdateAgent).mockResolvedValue(undefined);
  });

  const renderEditAgentView = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          <AgentsProvider>
            <SkillsProvider>
              <EditAgentView />
            </SkillsProvider>
          </AgentsProvider>
        </NavigationProvider>
      </QueryClientProvider>,
    );
  };

  describe('Rendering', () => {
    it('renders the edit agent form with correct title', () => {
      renderEditAgentView();
      expect(screen.getByText('Edit Agent')).toBeInTheDocument();
      expect(
        screen.getByText('Update Test Agent 1 configuration'),
      ).toBeInTheDocument();
    });

    it('displays agent name as read-only', () => {
      renderEditAgentView();
      expect(screen.getByText('Agent Name')).toBeInTheDocument();
      const agentNameInput = screen.getByDisplayValue('Test Agent 1');
      expect(agentNameInput).toBeInTheDocument();
      expect(agentNameInput).toBeDisabled();
      expect(
        screen.getByText('Agent name cannot be changed after creation'),
      ).toBeInTheDocument();
    });

    it('displays description field with current value', () => {
      renderEditAgentView();
      const descriptionField = screen.getByLabelText('Description (required)');
      expect(descriptionField).toBeInTheDocument();
      expect(descriptionField).toHaveValue(
        'First test agent description with enough characters',
      );
    });

    it('displays form action buttons', () => {
      renderEditAgentView();
      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /save changes/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('has description field with correct constraints', () => {
      renderEditAgentView();
      const descriptionField = screen.getByLabelText('Description (required)');

      // Check that field can accept text input
      expect(descriptionField).toHaveValue(
        'First test agent description with enough characters',
      );

      fireEvent.change(descriptionField, {
        target: {
          value:
            'This is a new description with enough characters to meet minimum requirement',
        },
      });
      expect(descriptionField).toHaveValue(
        'This is a new description with enough characters to meet minimum requirement',
      );
    });
  });

  describe('Form Interaction', () => {
    it('allows editing description', () => {
      renderEditAgentView();
      const descriptionField = screen.getByLabelText('Description (required)');

      fireEvent.change(descriptionField, {
        target: {
          value:
            'Updated description with enough characters to meet the minimum requirement',
        },
      });

      expect(descriptionField).toHaveValue(
        'Updated description with enough characters to meet the minimum requirement',
      );
    });

    it('navigates back when cancel button is clicked', () => {
      renderEditAgentView();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      fireEvent.click(cancelButton);

      // agentName from params is already encoded, so encodeURIComponent encodes it again
      expect(mockPush).toHaveBeenCalledWith('/agents/Test%2520Agent%25201');
    });
  });

  describe('Form Submission', () => {
    it('has save changes button', () => {
      renderEditAgentView();

      const saveButton = screen.getByRole('button', {
        name: /save changes/i,
      });
      expect(saveButton).toBeInTheDocument();
      // Button is disabled by default when form is not dirty
      expect(saveButton).toBeDisabled();
    });

    it('has cancel button that works', () => {
      renderEditAgentView();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      // agentName from params is already encoded, so encodeURIComponent encodes it again
      expect(mockPush).toHaveBeenCalledWith('/agents/Test%2520Agent%25201');
    });

    it('displays form with current agent data', () => {
      renderEditAgentView();

      const descriptionField = screen.getByLabelText('Description (required)');

      // Check that form is populated with current data
      expect(descriptionField).toHaveValue(
        'First test agent description with enough characters',
      );
    });
  });

  describe('Error States', () => {
    it('shows error state when agent is not found', () => {
      // Mock navigation state without agent
      vi.mocked(useNavigation).mockReturnValue({
        navigationState: {
          ...mockNavigationState,
          selectedAgentName: undefined,
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
        navigateToClusters: vi.fn(),
        navigateToClusterArms: vi.fn(),
        navigateToArmDetail: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
      });

      // Mock useAgents to return undefined selectedAgent
      vi.mocked(useAgents).mockReturnValue({
        agents: [],
        selectedAgent: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        queryParams: {},
        setQueryParams: vi.fn(),
        createAgent: vi.fn(),
        updateAgent: mockUpdateAgent,
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
        getAgentById: vi.fn(),
        refreshAgents: vi.fn(),
        isCreateAgentDialogOpen: false,
        setIsCreateAgentDialogOpen: vi.fn(),
      });

      renderEditAgentView();

      expect(screen.getAllByText('Agent not found')).toHaveLength(2);
      expect(
        screen.getByText(
          'Unable to find the specified agent. Please ensure the agent exists and try again.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('renders form with enabled fields by default', () => {
      renderEditAgentView();

      const descriptionField = screen.getByLabelText('Description (required)');
      const saveButton = screen.getByRole('button', {
        name: /save changes/i,
      });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Check that fields are enabled by default (not updating)
      expect(descriptionField).not.toBeDisabled();
      // Button is disabled when form is not dirty
      expect(saveButton).toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });

    it('disables form when updating', () => {
      vi.mocked(useAgents).mockReturnValue({
        agents: [],
        selectedAgent: mockAgent,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        queryParams: {},
        setQueryParams: vi.fn(),
        createAgent: vi.fn(),
        updateAgent: mockUpdateAgent,
        deleteAgent: vi.fn(),
        isCreating: false,
        isUpdating: true, // Set to updating
        isDeleting: false,
        createError: null,
        updateError: null,
        deleteError: null,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        getAgentById: vi.fn(),
        refreshAgents: vi.fn(),
        isCreateAgentDialogOpen: false,
        setIsCreateAgentDialogOpen: vi.fn(),
      });

      renderEditAgentView();

      const descriptionField = screen.getByLabelText('Description (required)');
      const saveButton = screen.getByRole('button', {
        name: /saving/i,
      });

      // Check that fields are disabled when updating
      expect(descriptionField).toBeDisabled();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderEditAgentView();

      expect(
        screen.getByLabelText('Description (required)'),
      ).toBeInTheDocument();
    });

    it('has proper form descriptions', () => {
      renderEditAgentView();

      expect(
        screen.getByText(/provide a detailed description of what this agent/i),
      ).toBeInTheDocument();
    });

    it('has proper button roles and accessibility', () => {
      renderEditAgentView();

      const saveButton = screen.getByRole('button', {
        name: /save changes/i,
      });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it('has unique ID for agent name input', () => {
      renderEditAgentView();

      const agentNameInput = screen.getByDisplayValue('Test Agent 1');
      const inputId = agentNameInput.getAttribute('id');

      // Verify it has an ID (from useId)
      expect(inputId).toBeTruthy();
      expect(inputId).not.toBe('agent-name'); // Should not be static

      // Verify label has matching htmlFor
      const label = screen.getByText('Agent Name');
      expect(label.getAttribute('for')).toBe(inputId);
    });
  });
});
