import { ProvidersAndModelsView } from '@client/components/ai-providers/providers-and-models-view';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock dependencies
vi.mock('@client/api/v1/reactive-agents/models', () => ({
  deleteModel: vi.fn(),
}));

vi.mock('@client/providers/ai-provider-api-keys', () => ({
  useAIProviderAPIKeys: vi.fn(),
}));

vi.mock('@client/providers/models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}));

vi.mock('@client/components/ai-providers/ai-providers-list', () => ({
  AIProvidersListView: ({
    onProviderSelect,
    selectedProviderId,
  }: {
    onProviderSelect: (id: string) => void;
    selectedProviderId: string | null;
  }) => (
    <div data-testid="ai-providers-list">
      <div>Selected: {selectedProviderId || 'none'}</div>
      <button
        type="button"
        data-testid="select-provider-1"
        onClick={() => onProviderSelect('provider-1')}
      >
        Select Provider 1
      </button>
      <button
        type="button"
        data-testid="select-provider-2"
        onClick={() => onProviderSelect('provider-2')}
      >
        Select Provider 2
      </button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@client/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  CpuIcon: () => <div data-testid="cpu-icon" />,
  MoreHorizontalIcon: () => <div data-testid="more-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  RefreshCwIcon: () => <div data-testid="refresh-icon" />,
  SearchIcon: () => <div data-testid="search-icon" />,
  TrashIcon: () => <div data-testid="trash-icon" />,
}));

const mockAPIKeys = [
  {
    id: 'provider-1',
    ai_provider: 'openai',
    name: 'OpenAI Key',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 'provider-2',
    ai_provider: 'anthropic',
    name: 'Anthropic Key',
    created_at: '2023-01-02T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z',
  },
];

const mockModels = [
  {
    id: 'model-1',
    ai_provider_id: 'provider-1',
    model_name: 'gpt-4',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 'model-2',
    ai_provider_id: 'provider-1',
    model_name: 'gpt-3.5-turbo',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 'model-3',
    ai_provider_id: 'provider-2',
    model_name: 'claude-3-sonnet',
    created_at: '2023-01-02T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z',
  },
];

describe('ProvidersAndModelsView', () => {
  const mockSetQueryParams = vi.fn();
  const mockRefetch = vi.fn();
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    (useAIProviderAPIKeys as Mock).mockReturnValue({
      apiKeys: mockAPIKeys,
      isLoading: false,
      error: null,
      refreshAPIKeys: vi.fn(),
    });

    (useModels as Mock).mockReturnValue({
      models: mockModels,
      isLoading: false,
      error: null,
      setQueryParams: mockSetQueryParams,
      refetch: mockRefetch,
    });
  });

  describe('Auto-selection of first provider', () => {
    it('should automatically select the first provider when no provider is selected', async () => {
      render(<ProvidersAndModelsView />, { wrapper });

      // Wait for the auto-selection to happen
      await waitFor(() => {
        expect(screen.getByText('Selected: provider-1')).toBeInTheDocument();
      });
    });

    it('should not auto-select if a provider is already selected via prop', () => {
      render(<ProvidersAndModelsView selectedProviderId="provider-2" />, {
        wrapper,
      });

      // Should use the provided selectedProviderId
      expect(screen.getByText('Selected: provider-2')).toBeInTheDocument();
    });

    it('should not auto-select when no API keys are available', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: null,
        refreshAPIKeys: vi.fn(),
      });

      render(<ProvidersAndModelsView />, { wrapper });

      expect(screen.getByText('Selected: none')).toBeInTheDocument();
    });

    it('should show models for the auto-selected provider', async () => {
      render(<ProvidersAndModelsView />, { wrapper });

      // Wait for auto-selection
      await waitFor(() => {
        expect(screen.getByText('Selected: provider-1')).toBeInTheDocument();
      });

      // Should show models for provider-1
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
      // Should not show models for provider-2
      expect(screen.queryByText('claude-3-sonnet')).not.toBeInTheDocument();
    });
  });

  describe('Provider selection', () => {
    it('should filter models by selected provider', async () => {
      render(<ProvidersAndModelsView />, { wrapper });

      // Wait for auto-selection of provider-1
      await waitFor(() => {
        expect(screen.getByText('gpt-4')).toBeInTheDocument();
      });

      // Switch to provider-2
      const selectProvider2Button = screen.getByTestId('select-provider-2');
      fireEvent.click(selectProvider2Button);

      // Should now show provider-2 models
      await waitFor(() => {
        expect(screen.getByText('claude-3-sonnet')).toBeInTheDocument();
      });

      // Should not show provider-1 models
      expect(screen.queryByText('gpt-4')).not.toBeInTheDocument();
      expect(screen.queryByText('gpt-3.5-turbo')).not.toBeInTheDocument();
    });

    it('should show message when no provider is selected', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: null,
        refreshAPIKeys: vi.fn(),
      });

      render(<ProvidersAndModelsView />, { wrapper });

      expect(
        screen.getByText(
          'Select an AI provider above to view and manage its models',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Models display', () => {
    it('should show loading state while models are loading', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: true,
        error: null,
        setQueryParams: mockSetQueryParams,
        refetch: mockRefetch,
      });

      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      // Skeleton loaders should be present (multiple instances)
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show empty state when provider has no models', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: false,
        error: null,
        setQueryParams: mockSetQueryParams,
        refetch: mockRefetch,
      });

      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      expect(screen.getByText('No models found')).toBeInTheDocument();
      expect(
        screen.getByText('This provider has no models configured yet.'),
      ).toBeInTheDocument();
    });

    it('should display model information correctly', () => {
      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      // Should show model names
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();

      // Should show model IDs (truncated)
      expect(screen.getByText(/ID: model-1/)).toBeInTheDocument();
      expect(screen.getByText(/ID: model-2/)).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter models by search query', () => {
      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      const searchInput = screen.getByPlaceholderText('Search models...');
      fireEvent.change(searchInput, { target: { value: 'gpt-4' } });

      // Should show gpt-4
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      // Should not show gpt-3.5-turbo
      expect(screen.queryByText('gpt-3.5-turbo')).not.toBeInTheDocument();
    });

    it('should show message when search returns no results', () => {
      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      const searchInput = screen.getByPlaceholderText('Search models...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No models found')).toBeInTheDocument();
      expect(
        screen.getByText('No models match your search criteria.'),
      ).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should allow refreshing models', () => {
      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      const refreshButton = screen
        .getByTestId('refresh-icon')
        .closest('button');
      fireEvent.click(refreshButton!);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should navigate to add models page when Add Models button is clicked', () => {
      render(<ProvidersAndModelsView selectedProviderId="provider-1" />, {
        wrapper,
      });

      const addButton = screen.getByRole('button', { name: /Add Models/i });
      fireEvent.click(addButton);

      expect(mockPush).toHaveBeenCalledWith(
        '/ai-providers/provider-1/add-models',
      );
    });

    it('should not show Add Models button when no provider is selected', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: null,
        refreshAPIKeys: vi.fn(),
      });

      render(<ProvidersAndModelsView />, { wrapper });

      expect(
        screen.queryByRole('button', { name: /Add Models/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Initialization', () => {
    it('should initialize models query params on mount', () => {
      render(<ProvidersAndModelsView />, { wrapper });

      expect(mockSetQueryParams).toHaveBeenCalledWith({});
    });
  });
});
