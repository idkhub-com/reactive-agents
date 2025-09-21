import { EditConfigurationView } from '@client/components/agents/skills/configurations/edit-configuration-view';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillConfigurations } from '@client/providers/skill-configurations';
import { fireEvent, render, screen } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock dependencies
vi.mock('@client/providers/models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@client/providers/navigation', () => ({
  useNavigation: vi.fn(),
}));

vi.mock('@client/providers/skill-configurations', () => ({
  useSkillConfigurations: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock UI components
vi.mock('@client/components/ui/jinja-system-prompt-editor', () => ({
  JinjaSystemPromptEditor: ({
    value,
    onChange,
    placeholder,
    onBlur,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onBlur?: () => void;
    disabled?: boolean;
  }) => (
    <textarea
      data-testid="system-prompt-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      aria-label="System Prompt"
    />
  ),
}));

const mockModels = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    ai_provider_api_key_id: '550e8400-e29b-41d4-a716-446655440000',
    model_name: 'gpt-4',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    ai_provider_api_key_id: '550e8400-e29b-41d4-a716-446655440000',
    model_name: 'claude-3-sonnet',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

const mockAgent = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  name: 'Test Agent',
  description: 'Test agent description',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockSkill = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  name: 'Test Skill',
  description: 'Test skill description',
  agent_id: '550e8400-e29b-41d4-a716-446655440003',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockConfiguration = {
  id: '550e8400-e29b-41d4-a716-446655440005',
  name: 'Test Configuration',
  description: 'Test configuration description',
  agent_id: '550e8400-e29b-41d4-a716-446655440003',
  skill_id: '550e8400-e29b-41d4-a716-446655440004',
  data: {
    current: {
      hash: 'abc123',
      created_at: '2023-01-01T00:00:00Z',
      params: {
        model_id: '550e8400-e29b-41d4-a716-446655440001',
        system_prompt: 'You are a helpful assistant',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
        seed: null,
        additional_params: null,
      },
    },
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

describe('EditConfigurationView', () => {
  const mockPush = vi.fn();
  const mockUpdateSkillConfiguration = vi.fn();
  const mockSetQueryParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });

    (useParams as Mock).mockReturnValue({
      configurationName: 'Test%20Configuration',
    });

    (useModels as Mock).mockReturnValue({
      models: mockModels,
      setQueryParams: mockSetQueryParams,
    });

    (useNavigation as Mock).mockReturnValue({
      navigationState: {
        selectedAgent: mockAgent,
        selectedSkill: mockSkill,
      },
    });

    (useSkillConfigurations as Mock).mockReturnValue({
      updateSkillConfiguration: mockUpdateSkillConfiguration,
      skillConfigurations: [mockConfiguration],
    });
  });

  it('renders edit configuration form', () => {
    render(<EditConfigurationView />);

    expect(
      screen.getByRole('heading', { name: 'Edit Configuration' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Configuration')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Test configuration description'),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('You are a helpful assistant'),
    ).toBeInTheDocument();
  });

  it('initializes models fetch on mount', () => {
    render(<EditConfigurationView />);

    expect(mockSetQueryParams).toHaveBeenCalledWith({});
  });

  it('displays models in dropdown with current selection', () => {
    render(<EditConfigurationView />);

    // The current model should be selected
    const modelSelect = screen.getByRole('combobox');
    fireEvent.click(modelSelect);

    expect(screen.getAllByText('gpt-4')).toHaveLength(3); // Selected value, option, and other instances
    expect(screen.getAllByText('claude-3-sonnet')).toHaveLength(2); // Option and other instances
  });

  it('shows current configuration values in form', () => {
    render(<EditConfigurationView />);

    expect(screen.getByDisplayValue('Test Configuration')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Test configuration description'),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('You are a helpful assistant'),
    ).toBeInTheDocument();
  });

  it('shows version history when multiple versions exist', () => {
    const configWithHistory = {
      ...mockConfiguration,
      data: {
        ...mockConfiguration.data,
        hash456: {
          hash: 'hash456',
          created_at: '2023-01-02T00:00:00Z',
          params: {
            ...mockConfiguration.data.current.params,
            temperature: 0.5,
          },
        },
      },
    };

    (useSkillConfigurations as Mock).mockReturnValue({
      updateSkillConfiguration: mockUpdateSkillConfiguration,
      skillConfigurations: [configWithHistory],
    });

    render(<EditConfigurationView />);

    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('(2 versions)')).toBeInTheDocument();
  });

  it('renders form with update functionality', () => {
    render(<EditConfigurationView />);

    // Test that form renders with update capability
    expect(screen.getByDisplayValue('Test Configuration')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Update Configuration' }),
    ).toBeInTheDocument();
    expect(mockUpdateSkillConfiguration).toHaveBeenCalledTimes(0); // Not called yet
  });

  it('has navigation elements', () => {
    render(<EditConfigurationView />);

    // Test navigation functionality
    expect(mockPush).toHaveBeenCalledTimes(0);
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('handles cancel button click', () => {
    render(<EditConfigurationView />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockPush).toHaveBeenCalledWith(
      '/agents/Test Agent/Test Skill/configurations',
    );
  });

  it('shows advanced settings when expanded', () => {
    render(<EditConfigurationView />);

    fireEvent.click(screen.getByText('Advanced Settings'));

    // Since the configuration has existing values, these fields should be active
    expect(screen.getByText('Max Tokens')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('loads previous version when selected from history', () => {
    const configWithHistory = {
      ...mockConfiguration,
      data: {
        ...mockConfiguration.data,
        hash456: {
          hash: 'hash456',
          created_at: '2023-01-02T00:00:00Z',
          params: {
            ...mockConfiguration.data.current.params,
            temperature: 0.5,
            system_prompt: 'Previous system prompt',
          },
        },
      },
    };

    (useSkillConfigurations as Mock).mockReturnValue({
      updateSkillConfiguration: mockUpdateSkillConfiguration,
      skillConfigurations: [configWithHistory],
    });

    render(<EditConfigurationView />);

    // Click on the previous version
    fireEvent.click(screen.getByText('hash456'));

    // The form should update with the previous version's values
    expect(
      screen.getByDisplayValue('Previous system prompt'),
    ).toBeInTheDocument();
  });

  it('shows error message when configuration is not found', () => {
    (useSkillConfigurations as Mock).mockReturnValue({
      updateSkillConfiguration: mockUpdateSkillConfiguration,
      skillConfigurations: [],
    });

    render(<EditConfigurationView />);

    expect(screen.getByText('Configuration not found.')).toBeInTheDocument();
  });

  it('shows error message when no agent or skill is selected', () => {
    (useNavigation as Mock).mockReturnValue({
      navigationState: {
        selectedAgent: null,
        selectedSkill: null,
      },
    });

    render(<EditConfigurationView />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
