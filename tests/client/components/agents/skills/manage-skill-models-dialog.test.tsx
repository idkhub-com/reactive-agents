import { ManageSkillModelsDialog } from '@client/components/agents/skills/manage-skill-models-dialog';
import { useAIProviders } from '@client/providers/ai-providers';
import { useModels } from '@client/providers/models';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock API calls
vi.mock('@client/api/v1/reactive-agents/skills', () => ({
  addModelsToSkill: vi.fn(),
  removeModelsFromSkill: vi.fn(),
}));

vi.mock('@client/providers/ai-providers', () => ({
  useAIProviderAPIKeys: vi.fn(),
  useAIProviders: vi.fn(),
}));

vi.mock('@client/providers/models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock UI components
vi.mock('@client/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('@client/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@client/components/ui/card', () => ({
  Card: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@client/components/ui/checkbox', () => ({
  Checkbox: (props: Record<string, unknown>) => (
    <input type="checkbox" {...props} />
  ),
}));

vi.mock('@client/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  CpuIcon: () => <span>CpuIcon</span>,
  Clock: () => <span>Clock</span>,
  Loader2: () => <span>Loader2</span>,
}));

describe('ManageSkillModelsDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockSetQueryParams = vi.fn();
  const mockSetSkillId = vi.fn();
  const mockRefetchSkillModels = vi.fn();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useAIProviders as ReturnType<typeof vi.fn>).mockReturnValue({
      aiProviderConfigs: [
        {
          id: 'provider-1',
          ai_provider: 'openai',
          name: 'My OpenAI Key',
          api_key: 'sk-test',
          custom_fields: {},
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      isLoading: false,
    });

    (useModels as ReturnType<typeof vi.fn>).mockReturnValue({
      models: [
        {
          id: 'model-1',
          ai_provider_id: 'provider-1',
          model_name: 'gpt-4',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'model-2',
          ai_provider_id: 'provider-1',
          model_name: 'gpt-3.5-turbo',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      skillModels: [],
      isLoadingAllModels: false,
      isLoadingSkillModels: false,
      setQueryParams: mockSetQueryParams,
      setSkillId: mockSetSkillId,
      refetchSkillModels: mockRefetchSkillModels,
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ManageSkillModelsDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          skillId="skill-1"
          {...props}
        />
      </QueryClientProvider>,
    );
  };

  it('renders the dialog when open', () => {
    renderComponent();
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Manage Models')).toBeInTheDocument();
  });

  it('displays models grouped by provider', () => {
    renderComponent();
    expect(screen.getByText('My OpenAI Key')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useModels as ReturnType<typeof vi.fn>).mockReturnValue({
      models: [],
      skillModels: [],
      isLoadingAllModels: true,
      isLoadingSkillModels: true,
      setQueryParams: mockSetQueryParams,
      setSkillId: mockSetSkillId,
      refetchSkillModels: mockRefetchSkillModels,
    });

    renderComponent();
    expect(screen.getByText('Loader2')).toBeInTheDocument();
  });

  it('shows empty state when no models available', () => {
    (useModels as ReturnType<typeof vi.fn>).mockReturnValue({
      models: [],
      skillModels: [],
      isLoadingAllModels: false,
      isLoadingSkillModels: false,
      setQueryParams: mockSetQueryParams,
      setSkillId: mockSetSkillId,
      refetchSkillModels: mockRefetchSkillModels,
    });

    renderComponent();
    expect(screen.getByText('No models available')).toBeInTheDocument();
  });

  it('sets query params when dialog opens', () => {
    renderComponent();
    expect(mockSetQueryParams).toHaveBeenCalledWith({});
    expect(mockSetSkillId).toHaveBeenCalledWith('skill-1');
  });

  it('displays the time warning notice', () => {
    renderComponent();
    expect(
      screen.getByText('This process may take 1-2 minutes to complete.'),
    ).toBeInTheDocument();
  });

  it('shows Save Changes and Cancel buttons', () => {
    renderComponent();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
