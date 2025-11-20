import {
  AIProvidersProvider,
  aiProvidersQueryKeys,
  useAIProviders,
} from '@client/providers/ai-providers';

import type { AIProviderConfig } from '@shared/types/data/ai-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@client/api/v1/reactive-agents/ai-providers', () => ({
  createAIProvider: vi.fn(),
  getAIProviderAPIKeys: vi.fn(),
  updateAIProvider: vi.fn(),
  deleteAIProvider: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Import mocked functions
import {
  createAIProvider,
  deleteAIProvider,
  getAIProviderAPIKeys,
  updateAIProvider,
} from '@client/api/v1/reactive-agents/ai-providers';

const mockAIProviders: AIProviderConfig[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ai_provider: 'openai',
    name: 'Production Key',
    api_key: 'sk-test-key-1',
    custom_fields: {},
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174000',
    ai_provider: 'anthropic',
    name: 'Development Key',
    api_key: 'sk-ant-test-key-2',
    custom_fields: {},
    created_at: '2023-01-02T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z',
  },
];

function TestComponent(): React.ReactElement {
  const {
    aiProviderConfigs: apiKeys,
    isLoading,
    error,
    queryParams,
    setQueryParams,
    createAPIKey,
    updateAPIKey,
    deleteAPIKey,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    updateError,
    deleteError,
    getAPIKeyById,
    getAPIKeysByProvider,
    refreshAPIKeys,
  } = useAIProviders();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error?.message ?? 'no error'}</div>
      <div data-testid="api-keys-count">{apiKeys?.length ?? 0}</div>
      <div data-testid="query-params">{JSON.stringify(queryParams)}</div>

      <div data-testid="create-loading">
        {isCreating ? 'creating' : 'not creating'}
      </div>
      <div data-testid="update-loading">
        {isUpdating ? 'updating' : 'not updating'}
      </div>
      <div data-testid="delete-loading">
        {isDeleting ? 'deleting' : 'not deleting'}
      </div>
      <div data-testid="create-error">
        {createError?.message ?? 'no create error'}
      </div>
      <div data-testid="update-error">
        {updateError?.message ?? 'no update error'}
      </div>
      <div data-testid="delete-error">
        {deleteError?.message ?? 'no delete error'}
      </div>

      <button
        type="button"
        data-testid="set-query-params"
        onClick={() => setQueryParams({ ai_provider: 'openai' })}
      >
        Set Query Params
      </button>

      <button
        type="button"
        data-testid="create-api-key"
        onClick={async () => {
          try {
            await createAPIKey({
              ai_provider: 'openai',
              name: 'New Key',
              api_key: 'sk-new-key',
              custom_fields: {},
            });
          } catch (error) {
            console.error('Create failed:', error);
          }
        }}
      >
        Create API Key
      </button>

      <button
        type="button"
        data-testid="update-api-key"
        onClick={async () => {
          try {
            await updateAPIKey('123e4567-e89b-12d3-a456-426614174000', {
              name: 'Updated Key',
            });
          } catch (error) {
            console.error('Update failed:', error);
          }
        }}
      >
        Update API Key
      </button>

      <button
        type="button"
        data-testid="delete-api-key"
        onClick={async () => {
          try {
            await deleteAPIKey('123e4567-e89b-12d3-a456-426614174000');
          } catch (error) {
            console.error('Delete failed:', error);
          }
        }}
      >
        Delete API Key
      </button>

      <button
        type="button"
        data-testid="refresh-api-keys"
        onClick={() => refreshAPIKeys()}
      >
        Refresh API Keys
      </button>

      <button
        type="button"
        data-testid="get-by-id"
        onClick={() => {
          const apiKey = getAPIKeyById('123e4567-e89b-12d3-a456-426614174000');
          console.log('Found API key:', apiKey);
        }}
      >
        Get By ID
      </button>

      <button
        type="button"
        data-testid="get-by-provider"
        onClick={() => {
          const providerKeys = getAPIKeysByProvider('openai');
          console.log('Found provider keys:', providerKeys);
        }}
      >
        Get By Provider
      </button>
    </div>
  );
}

describe('AIProviderAPIKeysProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AIProvidersProvider>
          <TestComponent />
        </AIProvidersProvider>
      </QueryClientProvider>,
    );
  };

  describe('Initial State', () => {
    it('should load API keys on mount', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);

      renderWithProviders();

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('api-keys-count')).toHaveTextContent('2');
      expect(screen.getByTestId('error')).toHaveTextContent('no error');
    });

    it('should handle empty API keys', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue([]);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('api-keys-count')).toHaveTextContent('0');
    });

    it('should handle loading errors', async () => {
      vi.mocked(getAIProviderAPIKeys).mockRejectedValue(
        new Error('Failed to fetch API keys'),
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'Failed to fetch API keys',
        );
      });
    });
  });

  describe('Query Parameters', () => {
    it('should update query parameters', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      fireEvent.click(screen.getByTestId('set-query-params'));

      await waitFor(() => {
        expect(screen.getByTestId('query-params')).toHaveTextContent('openai');
      });
    });
  });

  describe('Create API Key', () => {
    it('should create API key and invalidate cache', async () => {
      const newAPIKey: AIProviderConfig = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        ai_provider: 'openai',
        name: 'New Key',
        api_key: 'sk-new-key',
        custom_fields: {},
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
      };

      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(createAIProvider).mockResolvedValue(newAPIKey);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Mock the updated list after creation
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue([
        ...mockAIProviders,
        newAPIKey,
      ]);

      act(() => {
        fireEvent.click(screen.getByTestId('create-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toHaveTextContent(
          'not creating',
        );
      });

      // Verify cache was invalidated by checking the updated count
      await waitFor(() => {
        expect(screen.getByTestId('api-keys-count')).toHaveTextContent('3');
      });

      expect(createAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          ai_provider: 'openai',
          name: 'New Key',
          api_key: 'sk-new-key',
          custom_fields: {},
        }),
        expect.anything(),
      );
    });

    it('should wait for cache invalidation before resolving', async () => {
      const newAPIKey: AIProviderConfig = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        ai_provider: 'openai',
        name: 'New Key',
        api_key: 'sk-new-key',
        custom_fields: {},
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
      };

      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(createAIProvider).mockResolvedValue(newAPIKey);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      const initialQueryState = queryClient.getQueryState(
        aiProvidersQueryKeys.list({ limit: 50 }),
      );
      expect(initialQueryState?.dataUpdatedAt).toBeDefined();
      const initialUpdateTime = initialQueryState?.dataUpdatedAt ?? 0;

      // Mock the updated list after creation
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue([
        ...mockAIProviders,
        newAPIKey,
      ]);

      act(() => {
        fireEvent.click(screen.getByTestId('create-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toHaveTextContent(
          'not creating',
        );
      });

      // Verify that the cache was updated (dataUpdatedAt changed)
      await waitFor(() => {
        const updatedQueryState = queryClient.getQueryState(
          aiProvidersQueryKeys.list({ limit: 50 }),
        );
        expect(updatedQueryState?.dataUpdatedAt).toBeGreaterThan(
          initialUpdateTime,
        );
      });
    });

    it('should handle create errors', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(createAIProvider).mockRejectedValue(
        new Error('Failed to create'),
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      act(() => {
        fireEvent.click(screen.getByTestId('create-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-error')).toHaveTextContent(
          'Failed to create',
        );
      });
    });

    it('should show creating state during mutation', async () => {
      const newAPIKey: AIProviderConfig = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        ai_provider: 'openai',
        name: 'New Key',
        api_key: 'sk-new-key',
        custom_fields: {},
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
      };

      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(createAIProvider).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(newAPIKey), 100);
          }),
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      act(() => {
        fireEvent.click(screen.getByTestId('create-api-key'));
      });

      // Should show creating state
      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toHaveTextContent(
          'creating',
        );
      });

      // Should eventually finish
      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toHaveTextContent(
          'not creating',
        );
      });
    });
  });

  describe('Update API Key', () => {
    it('should update API key and invalidate cache', async () => {
      const updatedAPIKey: AIProviderConfig = {
        ...mockAIProviders[0],
        name: 'Updated Key',
        updated_at: '2023-01-04T00:00:00.000Z',
      };

      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(updateAIProvider).mockResolvedValue(updatedAPIKey);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Mock the updated list
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue([
        updatedAPIKey,
        mockAIProviders[1],
      ]);

      act(() => {
        fireEvent.click(screen.getByTestId('update-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('update-loading')).toHaveTextContent(
          'not updating',
        );
      });

      expect(updateAIProvider).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        { name: 'Updated Key' },
      );
    });

    it('should handle update errors', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(updateAIProvider).mockRejectedValue(
        new Error('Failed to update'),
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      act(() => {
        fireEvent.click(screen.getByTestId('update-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('update-error')).toHaveTextContent(
          'Failed to update',
        );
      });
    });
  });

  describe('Delete API Key', () => {
    it('should delete API key and invalidate cache', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(deleteAIProvider).mockResolvedValue();

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Mock the updated list after deletion
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue([mockAIProviders[1]]);

      act(() => {
        fireEvent.click(screen.getByTestId('delete-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('delete-loading')).toHaveTextContent(
          'not deleting',
        );
      });

      // Verify cache was invalidated
      await waitFor(() => {
        expect(screen.getByTestId('api-keys-count')).toHaveTextContent('1');
      });

      expect(deleteAIProvider).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.anything(),
      );
    });

    it('should handle delete errors', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(deleteAIProvider).mockRejectedValue(
        new Error('Failed to delete'),
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      act(() => {
        fireEvent.click(screen.getByTestId('delete-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveTextContent(
          'Failed to delete',
        );
      });
    });
  });

  describe('Helper Functions', () => {
    it('should get API key by ID', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      const consoleSpy = vi.spyOn(console, 'log');

      fireEvent.click(screen.getByTestId('get-by-id'));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Found API key:',
        mockAIProviders[0],
      );

      consoleSpy.mockRestore();
    });

    it('should get API keys by provider', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      const consoleSpy = vi.spyOn(console, 'log');

      fireEvent.click(screen.getByTestId('get-by-provider'));

      expect(consoleSpy).toHaveBeenCalledWith('Found provider keys:', [
        mockAIProviders[0],
      ]);

      consoleSpy.mockRestore();
    });

    it('should refresh API keys', async () => {
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      const initialFetchCount =
        vi.mocked(getAIProviderAPIKeys).mock.calls.length;

      fireEvent.click(screen.getByTestId('refresh-api-keys'));

      await waitFor(() => {
        expect(
          vi.mocked(getAIProviderAPIKeys).mock.calls.length,
        ).toBeGreaterThan(initialFetchCount);
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should ensure mutations wait for cache invalidation', async () => {
      const newAPIKey: AIProviderConfig = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        ai_provider: 'openai',
        name: 'New Key',
        api_key: 'sk-new-key',
        custom_fields: {},
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
      };

      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(createAIProvider).mockResolvedValue(newAPIKey);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Track invalidation
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Mock the updated list after creation
      vi.mocked(getAIProviderAPIKeys).mockResolvedValue([
        ...mockAIProviders,
        newAPIKey,
      ]);

      act(() => {
        fireEvent.click(screen.getByTestId('create-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toHaveTextContent(
          'not creating',
        );
      });

      // Verify invalidateQueries was called
      expect(invalidateSpy).toHaveBeenCalled();

      // Verify data was refetched
      await waitFor(() => {
        expect(screen.getByTestId('api-keys-count')).toHaveTextContent('3');
      });

      invalidateSpy.mockRestore();
    });

    it('should handle concurrent mutations with proper cache invalidation', async () => {
      const newAPIKey1: AIProviderConfig = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        ai_provider: 'openai',
        name: 'New Key 1',
        api_key: 'sk-new-key-1',
        custom_fields: {},
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
      };

      const newAPIKey2: AIProviderConfig = {
        id: '423e4567-e89b-12d3-a456-426614174000',
        ai_provider: 'anthropic',
        name: 'New Key 2',
        api_key: 'sk-ant-new-key-2',
        custom_fields: {},
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
      };

      vi.mocked(getAIProviderAPIKeys).mockResolvedValue(mockAIProviders);
      vi.mocked(createAIProvider)
        .mockResolvedValueOnce(newAPIKey1)
        .mockResolvedValueOnce(newAPIKey2);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Mock progressive updates
      vi.mocked(getAIProviderAPIKeys)
        .mockResolvedValueOnce([...mockAIProviders, newAPIKey1])
        .mockResolvedValueOnce([...mockAIProviders, newAPIKey1, newAPIKey2]);

      // Fire multiple creations
      act(() => {
        fireEvent.click(screen.getByTestId('create-api-key'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toHaveTextContent(
          'not creating',
        );
      });

      // Verify final count includes both new keys
      await waitFor(() => {
        expect(screen.getByTestId('api-keys-count')).toHaveTextContent('3');
      });
    });
  });
});
