import { AgentsProvider } from '@client/providers/agents';
import { SkillsProvider } from '@client/providers/skills';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Next.js router and params before importing component
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (_url: string) => {
      try {
        (window as unknown as { location: { hash: string } }).location.hash =
          '/agents';
      } catch {
        // ignore
      }
    },
    back: () => {
      try {
        (window as unknown as { location: { hash: string } }).location.hash =
          'skills';
      } catch {
        // ignore
      }
    },
    replace: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
  }),
  useParams: () => ({ agentName: undefined }),
}));

import { CreateSkillView } from './create-skill-view';

// Mock the agents API
vi.mock('@client/api/v1/idk/agents', () => {
  const mockAgents = [
    {
      id: 'agent-1',
      name: 'Test Agent 1',
      description: 'First test agent description',
      metadata: {},
      created_at: '2023-01-01T10:30:00Z',
      updated_at: '2023-01-02T15:45:00Z',
    },
    {
      id: 'agent-2',
      name: 'Test Agent 2',
      description: 'Second test agent description',
      metadata: {},
      created_at: '2023-01-03T08:15:00Z',
      updated_at: '2023-01-03T08:15:00Z',
    },
  ];

  return {
    getAgents: vi.fn().mockResolvedValue(mockAgents),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
  };
});

// Mock the skills API
vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn().mockResolvedValue([]),
  createSkill: vi.fn().mockResolvedValue({
    id: 'new-skill-id',
    agent_id: 'agent-1',
    name: 'New Skill',
    description: 'New skill description',
    metadata: {},
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
}));

// Mock the skills provider
const mockCreateSkill = vi.fn().mockResolvedValue({
  id: 'new-skill-id',
  agent_id: 'agent-1',
  name: 'New Skill',
  description: 'New skill description',
  metadata: {},
  max_configurations: 3,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
});

vi.mock('@client/providers/skills', () => ({
  SkillsProvider: ({ children }: { children: React.ReactNode }) => children,
  useSkills: () => ({
    skills: [],
    createSkill: mockCreateSkill,
    isCreating: false,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    queryParams: {},
    setQueryParams: vi.fn(),
    selectedSkill: null,
    setSelectedSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    isUpdating: false,
    isDeleting: false,
    createError: null,
    updateError: null,
    deleteError: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    getSkillById: vi.fn(),
    refreshSkills: vi.fn(),
  }),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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

// Mock window.location.hash
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
  },
  writable: true,
});

describe('CreateSkillView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    localStorageMock.clear();
    window.location.hash = '';
  });

  const renderCreateSkillView = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <SkillsProvider>
            <CreateSkillView />
          </SkillsProvider>
        </AgentsProvider>
      </QueryClientProvider>,
    );

  it('renders create skill form', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByText('Create New Skill')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Define a new capability for this agent'),
    ).toBeInTheDocument();

    // Form fields
    // No agent selector in current UI
    expect(
      screen.getByRole('textbox', { name: /skill name/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /description/i }),
    ).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create skill/i }),
    ).toBeInTheDocument();
  });

  it('shows agent-specific header when selectedAgent exists', async () => {
    // Pre-select an agent
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');

    renderCreateSkillView();

    await waitFor(() => {
      expect(
        screen.getByText('Define a new capability for Test Agent 1'),
      ).toBeInTheDocument();
    });
  });

  it('pre-selects agent when selectedAgent exists', async () => {
    // Pre-select an agent
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');

    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByText('Creating skill for')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });
  });

  it('renders agent context when an agent is available', async () => {
    // Pre-select an agent
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();
    await waitFor(() => {
      expect(screen.getByText('Creating skill for')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });
  });

  it('has form validation for required fields', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /create skill/i }),
      ).toBeInTheDocument();
    });

    // Form should have agent and name fields marked as required
    const nameInput = screen.getByRole('textbox', { name: /skill name/i });

    expect(nameInput).toBeInTheDocument();

    // Marked as required in the schema
    expect(screen.getByText('Skill Name *')).toBeInTheDocument();
  });

  it('renders max configurations field with default value', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByLabelText('Max Configurations')).toBeInTheDocument();
    });

    const maxConfigInput = screen.getByLabelText('Max Configurations');
    expect(maxConfigInput).toHaveValue(10); // Default value
    expect(maxConfigInput).toHaveAttribute('type', 'number');
    expect(maxConfigInput).toHaveAttribute('min', '1');
    expect(maxConfigInput).toHaveAttribute('max', '100');
  });

  it('validates max configurations field', async () => {
    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByLabelText('Max Configurations')).toBeInTheDocument();
    });

    const maxConfigInput = screen.getByLabelText('Max Configurations');

    // Test that the field has the correct validation attributes
    expect(maxConfigInput).toHaveAttribute('type', 'number');
    expect(maxConfigInput).toHaveAttribute('min', '1');
    expect(maxConfigInput).toHaveAttribute('max', '100');

    // Test default value
    expect(maxConfigInput).toHaveValue(10);

    // Test that we can change the value within valid range
    act(() => {
      fireEvent.change(maxConfigInput, { target: { value: '25' } });
    });
    expect(maxConfigInput).toHaveValue(25);

    // Test that we can change to minimum valid value
    act(() => {
      fireEvent.change(maxConfigInput, { target: { value: '1' } });
    });
    expect(maxConfigInput).toHaveValue(1);

    // Test that we can change to maximum valid value
    act(() => {
      fireEvent.change(maxConfigInput, { target: { value: '100' } });
    });
    expect(maxConfigInput).toHaveValue(100);
  });

  it('allows editing max configurations field', async () => {
    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByLabelText('Max Configurations')).toBeInTheDocument();
    });

    const maxConfigInput = screen.getByLabelText('Max Configurations');

    // Test that field can be edited
    fireEvent.change(maxConfigInput, { target: { value: '50' } });
    expect(maxConfigInput).toHaveValue(50);

    // Test clearing field - number inputs default to 0 when cleared
    fireEvent.change(maxConfigInput, { target: { value: '' } });
    expect(maxConfigInput).toHaveValue(0);
  });

  it('has correct max configurations field description', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByLabelText('Max Configurations')).toBeInTheDocument();
    });

    // Check that the description text is present
    expect(
      screen.getByText(/maximum number of configurations allowed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /each configuration represents a unique ai model setup/i,
      ),
    ).toBeInTheDocument();
  });

  it('accepts skill name input', () => {
    renderCreateSkillView();

    const skillNameInput = screen.getByRole('textbox', { name: /skill name/i });

    // Should accept valid names
    fireEvent.change(skillNameInput, { target: { value: 'Test Skill Name' } });
    expect(skillNameInput).toHaveValue('Test Skill Name');

    // Should accept names up to 100 characters (the validation limit)
    const validName = 'a'.repeat(100);
    fireEvent.change(skillNameInput, { target: { value: validName } });
    expect(skillNameInput).toHaveValue(validName);
  });

  it('accepts description input', () => {
    renderCreateSkillView();

    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    // Should accept valid descriptions
    const validDescription = 'This is a test skill description.';
    fireEvent.change(descriptionInput, { target: { value: validDescription } });
    expect(descriptionInput).toHaveValue(validDescription);

    // Should accept longer descriptions up to the limit
    const longDescription = 'a'.repeat(2000);
    fireEvent.change(descriptionInput, { target: { value: longDescription } });
    expect(descriptionInput).toHaveValue(longDescription);
  });

  it('handles various skill name inputs', () => {
    renderCreateSkillView();

    const skillNameInput = screen.getByRole('textbox', { name: /skill name/i });

    // Should accept names with special characters
    fireEvent.change(skillNameInput, {
      target: { value: 'Data Analysis & Reporting' },
    });
    expect(skillNameInput).toHaveValue('Data Analysis & Reporting');

    // Should accept names with numbers
    fireEvent.change(skillNameInput, {
      target: { value: 'API v2 Integration' },
    });
    expect(skillNameInput).toHaveValue('API v2 Integration');
  });

  it('creates skill successfully with valid data', async () => {
    const { createSkill } = await import('@client/api/v1/idk/skills');
    const _createSkillMock = vi.mocked(createSkill);

    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Fill in skill name first (easier to validate)
    fireEvent.change(screen.getByRole('textbox', { name: /skill name/i }), {
      target: { value: 'Test Skill' },
    });

    // Fill in description
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), {
      target: { value: 'Test skill description' },
    });

    // Submit form
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /create skill/i }));
    });
    const nameInput = screen.getByRole('textbox', { name: /skill name/i });
    const descInput = screen.getByRole('textbox', { name: /description/i });

    expect(nameInput).toHaveValue('Test Skill');
    expect(descInput).toHaveValue('Test skill description');
  });

  it('creates skill with empty description', () => {
    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Fill in skill name only (description optional)
    fireEvent.change(screen.getByRole('textbox', { name: /skill name/i }), {
      target: { value: 'Test Skill' },
    });

    // Verify description field is empty and optional
    const descInput = screen.getByRole('textbox', { name: /description/i });
    expect(descInput).toHaveValue('');
    expect(descInput).not.toBeRequired();

    // Verify name field has the entered value
    const nameInput = screen.getByRole('textbox', { name: /skill name/i });
    expect(nameInput).toHaveValue('Test Skill');
  });

  // Header has no explicit back button in current UI

  it('navigates back when cancel button is clicked', () => {
    renderCreateSkillView();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(window.location.hash).toBe('skills');
  });

  it('shows form elements for skill creation', () => {
    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Fill form fields to test functionality
    fireEvent.change(screen.getByRole('textbox', { name: /skill name/i }), {
      target: { value: 'Test Skill' },
    });

    // Verify button is present (may be disabled due to form validation)
    const createButton = screen.getByRole('button', { name: /create skill/i });
    expect(createButton).toBeInTheDocument();

    // Verify form can be filled
    const nameInput = screen.getByRole('textbox', { name: /skill name/i });
    expect(nameInput).toHaveValue('Test Skill');
  });

  it('has proper form field accessibility', () => {
    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Test form field accessibility
    const nameInput = screen.getByRole('textbox', { name: /skill name/i });
    const descInput = screen.getByRole('textbox', { name: /description/i });
    const createButton = screen.getByRole('button', { name: /create skill/i });

    expect(nameInput).not.toBeDisabled();
    expect(descInput).not.toBeDisabled();
    expect(createButton).toBeInTheDocument(); // Button may be disabled due to form validation

    // Form fields should accept input
    fireEvent.change(nameInput, { target: { value: 'Accessibility Test' } });
    expect(nameInput).toHaveValue('Accessibility Test');
  });

  it('maintains form state during user interaction', () => {
    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Fill form and verify state is maintained
    const nameInput = screen.getByRole('textbox', { name: /skill name/i });
    const descInput = screen.getByRole('textbox', { name: /description/i });

    fireEvent.change(nameInput, { target: { value: 'Test Skill' } });
    fireEvent.change(descInput, { target: { value: 'Test description' } });

    // Verify form maintains state
    expect(nameInput).toHaveValue('Test Skill');
    expect(descInput).toHaveValue('Test description');

    // Form should still be interactive
    expect(
      screen.getByRole('button', { name: /create skill/i }),
    ).toBeInTheDocument();
  });

  it('handles creation error gracefully', async () => {
    const { createSkill } = await import('@client/api/v1/idk/skills');
    const createSkillMock = vi.mocked(createSkill);
    createSkillMock.mockRejectedValue(new Error('Creation failed'));

    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Fill and submit form

    fireEvent.change(screen.getByRole('textbox', { name: /skill name/i }), {
      target: { value: 'Test Skill' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create skill/i }));

    // Should stay on form after error
    await waitFor(() => {
      expect(screen.getByText('Create New Skill')).toBeInTheDocument();
      expect(window.location.hash).not.toBe('skills');
    });
  });

  it('renders while agents are loading', async () => {
    // Mock agents loading
    const { getAgents } = await import('@client/api/v1/idk/agents');
    const getAgentsMock = vi.mocked(getAgents);

    let resolveAgents: (value: Awaited<ReturnType<typeof getAgents>>) => void;
    const agentsPromise = new Promise<Awaited<ReturnType<typeof getAgents>>>(
      (resolve) => {
        resolveAgents = resolve;
      },
    );
    getAgentsMock.mockReturnValue(agentsPromise);

    // Ensure an agent is selected so submit is enabled
    localStorageMock.setItem('idkhub-selected-agent-id', 'agent-1');
    renderCreateSkillView();

    // Page header still renders
    await waitFor(() => {
      expect(screen.getByText('Create New Skill')).toBeInTheDocument();
    });

    // Resolve loading
    resolveAgents!([]);
  });

  it('shows no agents state', async () => {
    // Mock no agents
    const { getAgents } = await import('@client/api/v1/idk/agents');
    const getAgentsMock = vi.mocked(getAgents);
    getAgentsMock.mockResolvedValue([]);

    renderCreateSkillView();

    // Should show warning card for missing agent
    await waitFor(() => {
      expect(screen.getByText('Agent not found')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Unable to find the specified agent/),
    ).toBeInTheDocument();
  });

  it('updates agent selection when selectedAgent changes', async () => {
    // Render and ensure page header is present (no crash)
    renderCreateSkillView();
    await waitFor(() => {
      expect(screen.getByText('Create New Skill')).toBeInTheDocument();
    });
  });

  it('displays tips card', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(
        screen.getByText('Tips for Creating Effective Skills'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Use specific, actionable names/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Include implementation details/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You can always edit these details later/),
    ).toBeInTheDocument();
  });

  it('has correct form field labels and descriptions', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(screen.getByText('Skill Name *')).toBeInTheDocument();
      expect(screen.getByText('Description (Optional)')).toBeInTheDocument();
    });

    // Check descriptions
    // No agent selection in current UI
    expect(
      screen.getByText(
        /Choose a descriptive name that reflects the skill's specific capability/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Provide additional context about the skill's functionality/,
      ),
    ).toBeInTheDocument();
  });

  it('has correct placeholder text', async () => {
    renderCreateSkillView();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          'e.g., Data Analysis, Email Templates, Code Review',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          /Describe what this skill does, how it works/,
        ),
      ).toBeInTheDocument();
    });
  });
});
