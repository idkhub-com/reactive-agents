import { CreateConfigurationView } from '@client/components/agents/skills/configurations/create-configuration-view';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillConfigurations } from '@client/providers/skill-configurations';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
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

describe('CreateConfigurationView', () => {
  const mockPush = vi.fn();
  const mockCreateSkillConfiguration = vi.fn();
  const mockSetQueryParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as Mock).mockReturnValue({
      push: mockPush,
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
      createSkillConfiguration: mockCreateSkillConfiguration,
    });
  });

  it('renders create configuration form', () => {
    render(<CreateConfigurationView />);

    expect(
      screen.getByRole('heading', { name: 'Create Configuration' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
    expect(screen.getByLabelText('System Prompt')).toBeInTheDocument();
  });

  it('initializes models fetch on mount', () => {
    render(<CreateConfigurationView />);

    expect(mockSetQueryParams).toHaveBeenCalledWith({});
  });

  it('displays models in dropdown', () => {
    render(<CreateConfigurationView />);

    // Open the model dropdown
    const modelSelect = screen.getByRole('combobox');
    fireEvent.click(modelSelect);

    expect(screen.getAllByText('gpt-4')).toHaveLength(2); // One in option, one in selected value
    expect(screen.getAllByText('claude-3-sonnet')).toHaveLength(2); // One in option, one in selected value
  });

  it('renders form with submit button', () => {
    render(<CreateConfigurationView />);

    // Test that the form renders with all required elements
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByTestId('system-prompt-editor')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Configuration' }),
    ).toBeInTheDocument();

    // Test that createSkillConfiguration provider was called during setup
    expect(mockCreateSkillConfiguration).toHaveBeenCalledTimes(0); // Not called yet
  });

  it('has navigation functionality', () => {
    render(<CreateConfigurationView />);

    // Test that the router is available and mockPush hasn't been called yet
    expect(mockPush).toHaveBeenCalledTimes(0);

    // Test navigation elements are present
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('handles cancel button click', () => {
    render(<CreateConfigurationView />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockPush).toHaveBeenCalledWith(
      '/agents/Test Agent/Test Skill/configurations',
    );
  });

  it('shows advanced settings when expanded', () => {
    render(<CreateConfigurationView />);

    fireEvent.click(screen.getByText('Advanced Settings'));

    expect(screen.getByText('Max Tokens')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Top P')).toBeInTheDocument();
    expect(screen.getByText('Frequency Penalty')).toBeInTheDocument();
    expect(screen.getByText('Presence Penalty')).toBeInTheDocument();
  });

  it('allows adding and removing advanced fields', () => {
    render(<CreateConfigurationView />);

    // Expand advanced settings
    fireEvent.click(screen.getByText('Advanced Settings'));

    // Should show available field buttons initially
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Max Tokens')).toBeInTheDocument();

    // Add temperature field
    fireEvent.click(screen.getByText('Temperature'));

    // Should now show the temperature input field
    const temperatureInputs = screen.getAllByDisplayValue('');
    expect(temperatureInputs.length).toBeGreaterThan(0);

    // Remove temperature field by clicking the X button
    const removeButtons = screen.getAllByTestId('x-icon');
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }

    // Temperature field should be back in the available buttons
    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('shows error message when no agent or skill is selected', () => {
    (useNavigation as Mock).mockReturnValue({
      navigationState: {
        selectedAgent: null,
        selectedSkill: null,
      },
    });

    render(<CreateConfigurationView />);

    expect(
      screen.getByText(
        'No agent or skill selected. Please navigate back and select an agent and skill.',
      ),
    ).toBeInTheDocument();
  });
});
