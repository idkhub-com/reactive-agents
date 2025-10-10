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
    skillName: 'Test%20Skill%201',
  }),
  usePathname: () => '/agents/Test%20Agent%201/Test%20Skill%201/edit',
}));

import { EditSkillView } from '@client/components/agents/skills/edit-skill-view';
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';

// Mock the navigation provider with proper state
const mockNavigationState = {
  section: 'agents' as const,
  currentView: 'edit-skill' as const,
  selectedAgent: {
    id: 'agent-1',
    name: 'Test Agent 1',
    description: 'First test agent description',
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
    max_configurations: 15,
    num_system_prompts: 0,
    created_at: '2023-01-01T10:30:00Z',
    updated_at: '2023-01-01T10:30:00Z',
  },
  breadcrumbs: [],
};

// Mock the skills API
vi.mock('@client/api/v1/idk/skills', () => {
  const mockUpdateSkill = vi.fn();

  return {
    updateSkill: mockUpdateSkill,
    getSkills: vi.fn().mockResolvedValue([]),
    createSkill: vi.fn(),
    deleteSkill: vi.fn(),
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

// Mock the skills provider
vi.mock('@client/providers/skills', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@client/providers/skills')>();
  return {
    ...actual,
    useSkills: vi.fn(),
  };
});

describe('EditSkillView', () => {
  let queryClient: QueryClient;
  const mockUpdateSkill = vi.fn();

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
    mockUpdateSkill.mockClear();

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
      navigateToClusters: vi.fn(),
      navigateToClusterArms: vi.fn(),
      navigateToArmDetail: vi.fn(),
      navigateBack: vi.fn(),
      updateBreadcrumbs: vi.fn(),
      skills: [],
    });

    // Set default mock implementation for useSkills
    vi.mocked(useSkills).mockReturnValue({
      // Query state
      skills: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),

      // Query parameters
      queryParams: {},
      setQueryParams: vi.fn(),

      // Selected skill state
      selectedSkill: null,
      setSelectedSkill: vi.fn(),

      // Skill mutation functions
      createSkill: vi.fn(),
      updateSkill: mockUpdateSkill,
      deleteSkill: vi.fn(),

      // Skill mutation states
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      createError: null,
      updateError: null,
      deleteError: null,

      // Pagination
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),

      // Helper functions
      getSkillById: vi.fn(),
      refreshSkills: vi.fn(),
    });

    // Mock the skills provider context
    vi.mocked(mockUpdateSkill).mockResolvedValue(undefined);
  });

  const renderEditSkillView = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EditSkillView />
      </QueryClientProvider>,
    );
  };

  describe('Rendering', () => {
    it('renders the edit skill form with correct title', () => {
      renderEditSkillView();
      expect(screen.getByText('Edit Skill')).toBeInTheDocument();
      expect(
        screen.getByText('Update settings for Test Skill 1'),
      ).toBeInTheDocument();
    });

    it('displays agent context information', () => {
      renderEditSkillView();
      expect(screen.getByText('Editing skill for')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(
        screen.getByText('First test agent description'),
      ).toBeInTheDocument();
    });

    it('displays skill name as read-only', () => {
      renderEditSkillView();
      expect(screen.getByText('Skill Name')).toBeInTheDocument();
      expect(screen.getByText('Test Skill 1')).toBeInTheDocument();
      expect(
        screen.getByText('The skill name cannot be changed after creation'),
      ).toBeInTheDocument();
    });

    it('displays description field with current value', () => {
      renderEditSkillView();
      const descriptionField = screen.getByLabelText('Description');
      expect(descriptionField).toBeInTheDocument();
      expect(descriptionField).toHaveValue('Test skill description');
    });

    it('displays max configurations field with current value', () => {
      renderEditSkillView();
      const maxConfigField = screen.getByLabelText('Max Configurations');
      expect(maxConfigField).toBeInTheDocument();
      expect(maxConfigField).toHaveValue(15);
    });

    it('displays form action buttons', () => {
      renderEditSkillView();
      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /update skill/i }),
      ).toBeInTheDocument();
    });

    it('displays tips section', () => {
      renderEditSkillView();
      expect(
        screen.getByText('Tips for Configuring Skills'),
      ).toBeInTheDocument();
      expect(screen.getByText(/skill name is permanent/i)).toBeInTheDocument();
      expect(
        screen.getByText(/set max configurations based on/i),
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('has max configurations field with correct constraints', () => {
      renderEditSkillView();
      const maxConfigField = screen.getByLabelText('Max Configurations');

      // Check field attributes for validation
      expect(maxConfigField).toHaveAttribute('type', 'number');
      expect(maxConfigField).toHaveValue(15); // Default from mock
    });

    it('allows valid input in max configurations field', () => {
      renderEditSkillView();
      const maxConfigField = screen.getByLabelText('Max Configurations');

      // Test valid values (range is 1-25)
      fireEvent.change(maxConfigField, { target: { value: '10' } });
      expect(maxConfigField).toHaveValue(10);

      fireEvent.change(maxConfigField, { target: { value: '1' } });
      expect(maxConfigField).toHaveValue(1);

      fireEvent.change(maxConfigField, { target: { value: '25' } });
      expect(maxConfigField).toHaveValue(25);
    });

    it('has description field with correct constraints', () => {
      renderEditSkillView();
      const descriptionField = screen.getByLabelText('Description');

      // Check that field can accept text input
      expect(descriptionField).toHaveValue('Test skill description');

      fireEvent.change(descriptionField, {
        target: {
          value:
            'This is a new description with enough characters to meet minimum',
        },
      });
      expect(descriptionField).toHaveValue(
        'This is a new description with enough characters to meet minimum',
      );
    });
  });

  describe('Form Interaction', () => {
    it('allows editing description', () => {
      renderEditSkillView();
      const descriptionField = screen.getByLabelText('Description');

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

    it('allows editing max configurations', () => {
      renderEditSkillView();
      const maxConfigField = screen.getByLabelText('Max Configurations');

      fireEvent.change(maxConfigField, { target: { value: '25' } });

      expect(maxConfigField).toHaveValue(25);
    });

    it('navigates back when cancel button is clicked', () => {
      renderEditSkillView();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      fireEvent.click(cancelButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    it('has update skill button', () => {
      renderEditSkillView();

      const updateButton = screen.getByRole('button', {
        name: /update skill/i,
      });
      expect(updateButton).toBeInTheDocument();
      expect(updateButton).not.toBeDisabled();
    });

    it('has cancel button that works', () => {
      renderEditSkillView();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('displays form with current skill data', () => {
      renderEditSkillView();

      const descriptionField = screen.getByLabelText('Description');
      const maxConfigField = screen.getByLabelText('Max Configurations');

      // Check that form is populated with current data
      expect(descriptionField).toHaveValue('Test skill description');
      expect(maxConfigField).toHaveValue(15);
    });
  });

  describe('Error States', () => {
    it('shows error state when agent is not found', () => {
      // Mock navigation state without agent
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
        navigateToClusters: vi.fn(),
        navigateToClusterArms: vi.fn(),
        navigateToArmDetail: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
        skills: [],
      });

      renderEditSkillView();

      expect(screen.getAllByText('Skill not found')).toHaveLength(2);
      expect(
        screen.getByText(
          'Unable to find the specified skill. Please ensure the skill exists and try again.',
        ),
      ).toBeInTheDocument();
    });

    it('shows error state when skill is not found', () => {
      // Mock navigation state without skill
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
        navigateToClusters: vi.fn(),
        navigateToClusterArms: vi.fn(),
        navigateToArmDetail: vi.fn(),
        navigateBack: vi.fn(),
        updateBreadcrumbs: vi.fn(),
        skills: [],
      });

      renderEditSkillView();

      expect(screen.getAllByText('Skill not found')).toHaveLength(2);
      expect(
        screen.getByText(
          'Unable to find the specified skill. Please ensure the skill exists and try again.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('renders form with enabled fields by default', () => {
      renderEditSkillView();

      const descriptionField = screen.getByLabelText('Description');
      const maxConfigField = screen.getByLabelText('Max Configurations');
      const updateButton = screen.getByRole('button', {
        name: /update skill/i,
      });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Check that fields are enabled by default (not updating)
      expect(descriptionField).not.toBeDisabled();
      expect(maxConfigField).not.toBeDisabled();
      expect(updateButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderEditSkillView();

      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Configurations')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Number of System Prompts'),
      ).toBeInTheDocument();
    });

    it('has proper form descriptions', () => {
      renderEditSkillView();

      expect(
        screen.getByText(
          /provide additional context about the skill's functionality/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /maximum number of configurations allowed for this skill/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /the number of system prompts that will be generated/i,
        ),
      ).toBeInTheDocument();
    });

    it('has proper button roles and accessibility', () => {
      renderEditSkillView();

      const updateButton = screen.getByRole('button', {
        name: /update skill/i,
      });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(updateButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });
});
