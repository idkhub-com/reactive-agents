import { ModelsProvider, useModels } from '@client/providers/models';
import type { Model } from '@shared/types/data/model';
import { render, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';

// Mock the API functions
vi.mock('@client/api/v1/idk/models', () => ({
  getModels: vi.fn(),
}));

vi.mock('@client/api/v1/idk/skills', () => ({
  getSkillModels: vi.fn(),
}));

import { getModels } from '@client/api/v1/idk/models';
import { getSkillModels } from '@client/api/v1/idk/skills';

const mockGetModels = getModels as Mock;
const mockGetSkillModels = getSkillModels as Mock;

describe('ModelsProvider', () => {
  const mockModels: Model[] = [
    {
      id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
      ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
      model_name: 'gpt-4',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef02',
      ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef04',
      model_name: 'claude-3-opus',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
  ];

  const mockSkillModels: Model[] = [
    {
      id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
      ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
      model_name: 'gpt-4',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppressing console errors in tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Setup', () => {
    it('should render children without crashing', () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue([]);

      render(
        <ModelsProvider>
          <div data-testid="child">Test Child</div>
        </ModelsProvider>,
      );

      expect(
        document.querySelector('[data-testid="child"]'),
      ).toBeInTheDocument();
    });

    it('should provide context to children', () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      expect(result.current).toBeDefined();
      expect(result.current.models).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useModels());
      }).toThrow('useModels must be used within a ModelsProvider');
    });
  });

  describe('All Models Functionality', () => {
    it('should fetch models when query params are set', async () => {
      mockGetModels.mockResolvedValue(mockModels);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set query params to trigger fetch
      result.current.setQueryParams({ model_name: 'gpt-4' });

      await waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ model_name: 'gpt-4' });
      });

      await waitFor(() => {
        expect(result.current.models).toEqual(mockModels);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });
    });

    it('should not fetch models when query params are null', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue([]);

      renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Wait a bit to ensure no API call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGetModels).not.toHaveBeenCalled();
    });

    it('should handle loading state correctly', async () => {
      let resolvePromise: (value: Model[]) => void;
      const promise = new Promise<Model[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetModels.mockReturnValue(promise);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set query params to trigger fetch
      result.current.setQueryParams({ model_name: 'gpt-4' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!(mockModels);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.models).toEqual(mockModels);
      });
    });

    it('should handle errors when fetching models', async () => {
      const errorMessage = 'Failed to fetch models';
      mockGetModels.mockRejectedValue(new Error(errorMessage));
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set query params to trigger fetch
      result.current.setQueryParams({ model_name: 'gpt-4' });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.models).toEqual([]);
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockGetModels.mockRejectedValue('String error');
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set query params to trigger fetch
      result.current.setQueryParams({ model_name: 'gpt-4' });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch models');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should allow manual refetch', async () => {
      mockGetModels.mockResolvedValue(mockModels);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set query params and wait for initial fetch
      result.current.setQueryParams({ model_name: 'gpt-4' });

      await waitFor(() => {
        expect(result.current.models).toEqual(mockModels);
      });

      // Clear mock calls
      mockGetModels.mockClear();

      // Trigger refetch
      await result.current.refetch();

      expect(mockGetModels).toHaveBeenCalledWith({ model_name: 'gpt-4' });
    });

    it('should update query params correctly', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      const newParams = {
        ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
        limit: 10,
      };

      result.current.setQueryParams(newParams);

      await waitFor(() => {
        expect(result.current.queryParams).toEqual(newParams);
      });
    });
  });

  describe('Skill Models Functionality', () => {
    it('should fetch skill models when skill ID is set', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue(mockSkillModels);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set skill ID to trigger fetch
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(mockGetSkillModels).toHaveBeenCalledWith('skill-123');
      });

      await waitFor(() => {
        expect(result.current.skillModels).toEqual(mockSkillModels);
        expect(result.current.isLoadingSkillModels).toBe(false);
        expect(result.current.skillModelsError).toBe(null);
      });
    });

    it('should clear skill models when skill ID is null', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue(mockSkillModels);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // First set a skill ID
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(result.current.skillModels).toEqual(mockSkillModels);
      });

      // Clear skill ID
      result.current.setSkillId(null);

      await waitFor(() => {
        expect(result.current.skillModels).toEqual([]);
      });
    });

    it('should handle loading state for skill models', async () => {
      let resolvePromise: (value: Model[]) => void;
      const promise = new Promise<Model[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockReturnValue(promise);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set skill ID to trigger fetch
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(result.current.isLoadingSkillModels).toBe(true);
      });

      // Resolve the promise
      resolvePromise!(mockSkillModels);

      await waitFor(() => {
        expect(result.current.isLoadingSkillModels).toBe(false);
        expect(result.current.skillModels).toEqual(mockSkillModels);
      });
    });

    it('should handle errors when fetching skill models', async () => {
      const errorMessage = 'Failed to fetch skill models';
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set skill ID to trigger fetch
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(result.current.skillModelsError).toBe(errorMessage);
        expect(result.current.isLoadingSkillModels).toBe(false);
        expect(result.current.skillModels).toEqual([]);
      });
    });

    it('should handle non-Error exceptions for skill models', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockRejectedValue('String error');

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set skill ID to trigger fetch
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(result.current.skillModelsError).toBe(
          'Failed to fetch skill models',
        );
        expect(result.current.isLoadingSkillModels).toBe(false);
      });
    });

    it('should allow manual refetch of skill models', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue(mockSkillModels);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set skill ID and wait for initial fetch
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(result.current.skillModels).toEqual(mockSkillModels);
      });

      // Clear mock calls
      mockGetSkillModels.mockClear();

      // Trigger refetch
      await result.current.refetchSkillModels();

      expect(mockGetSkillModels).toHaveBeenCalledWith('skill-123');
    });

    it('should not fetch skill models on initial render without skill ID', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue([]);

      renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Wait a bit to ensure API call is made for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // getModelsBySkillId should not be called since skillId is null initially
      expect(mockGetSkillModels).not.toHaveBeenCalled();
    });
  });

  describe('Context Integration', () => {
    it('should provide all expected context values', () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      expect(result.current).toHaveProperty('models');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('queryParams');
      expect(result.current).toHaveProperty('setQueryParams');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('skillModels');
      expect(result.current).toHaveProperty('isLoadingSkillModels');
      expect(result.current).toHaveProperty('skillModelsError');
      expect(result.current).toHaveProperty('setSkillId');
      expect(result.current).toHaveProperty('refetchSkillModels');
    });

    it('should maintain separate loading states', async () => {
      let resolveModels: (value: Model[]) => void;
      let resolveSkillModels: (value: Model[]) => void;

      const modelsPromise = new Promise<Model[]>((resolve) => {
        resolveModels = resolve;
      });
      const skillModelsPromise = new Promise<Model[]>((resolve) => {
        resolveSkillModels = resolve;
      });

      mockGetModels.mockReturnValue(modelsPromise);
      mockGetSkillModels.mockReturnValue(skillModelsPromise);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Trigger both fetches
      result.current.setQueryParams({ model_name: 'gpt-4' });
      result.current.setSkillId('skill-123');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
        expect(result.current.isLoadingSkillModels).toBe(true);
      });

      // Resolve only models
      resolveModels!(mockModels);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoadingSkillModels).toBe(true);
      });

      // Resolve skill models
      resolveSkillModels!(mockSkillModels);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoadingSkillModels).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid query param changes', async () => {
      mockGetModels.mockResolvedValue(mockModels);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Rapidly change query params
      result.current.setQueryParams({ model_name: 'gpt-4' });
      result.current.setQueryParams({ model_name: 'claude-3' });
      result.current.setQueryParams({ model_name: 'gemini' });

      await waitFor(() => {
        expect(result.current.queryParams).toEqual({ model_name: 'gemini' });
      });
    });

    it('should handle rapid skill ID changes', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSkillModels.mockResolvedValue(mockSkillModels);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Rapidly change skill ID
      result.current.setSkillId('skill-1');
      result.current.setSkillId('skill-2');
      result.current.setSkillId('skill-3');

      await waitFor(() => {
        expect(mockGetSkillModels).toHaveBeenLastCalledWith('skill-3');
      });
    });

    it('should reset error state on successful fetch after error', async () => {
      mockGetModels
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockModels);
      mockGetSkillModels.mockResolvedValue([]);

      const { result } = renderHook(() => useModels(), {
        wrapper: ModelsProvider,
      });

      // Set query params to trigger fetch (should fail)
      result.current.setQueryParams({ model_name: 'gpt-4' });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // Trigger refetch (should succeed)
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.models).toEqual(mockModels);
      });
    });
  });
});
