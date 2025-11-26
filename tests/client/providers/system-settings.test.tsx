import {
  SystemSettingsProvider,
  useSystemSettings,
} from '@client/providers/system-settings';
import type { SystemSettings } from '@shared/types/data/system-settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
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
vi.mock('@client/api/v1/reactive-agents/system-settings', () => ({
  getSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

import {
  getSystemSettings,
  updateSystemSettings,
} from '@client/api/v1/reactive-agents/system-settings';

const mockGetSystemSettings = getSystemSettings as Mock;
const mockUpdateSystemSettings = updateSystemSettings as Mock;

describe('SystemSettingsProvider', () => {
  let queryClient: QueryClient;

  const mockSettings: SystemSettings = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    system_prompt_reflection_model_id: 'model-1111-2222-3333-444455556666',
    evaluation_generation_model_id: 'model-2222-3333-4444-555566667777',
    embedding_model_id: 'model-3333-4444-5555-666677778888',
    judge_model_id: 'model-4444-5555-6666-777788889999',
    developer_mode: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SystemSettingsProvider>{children}</SystemSettingsProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppressing console errors in tests
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  describe('Provider Setup', () => {
    it('should throw error when useSystemSettings is used outside provider', () => {
      // Create a simple wrapper without the provider
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      expect(() => {
        renderHook(() => useSystemSettings(), { wrapper });
      }).toThrow(
        'useSystemSettings must be used within a SystemSettingsProvider',
      );
    });

    it('should provide context values when wrapped in provider', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Fetching Settings', () => {
    it('should start in loading state', () => {
      mockGetSystemSettings.mockImplementation(
        () =>
          new Promise(() => {
            /* Never resolves - intentional for testing loading state */
          }),
      );

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.settings).toBeNull();
    });

    it('should fetch and return settings', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(mockGetSystemSettings).toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch settings';
      mockGetSystemSettings.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.settings).toBeNull();
    });

    it('should return settings with null model IDs', async () => {
      const unconfiguredSettings: SystemSettings = {
        ...mockSettings,
        system_prompt_reflection_model_id: null,
        evaluation_generation_model_id: null,
        embedding_model_id: null,
        judge_model_id: null,
      };
      mockGetSystemSettings.mockResolvedValue(unconfiguredSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(
        result.current.settings?.system_prompt_reflection_model_id,
      ).toBeNull();
      expect(
        result.current.settings?.evaluation_generation_model_id,
      ).toBeNull();
      expect(result.current.settings?.embedding_model_id).toBeNull();
      expect(result.current.settings?.judge_model_id).toBeNull();
    });
  });

  describe('Updating Settings', () => {
    it('should update settings successfully', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);
      const newJudgeId = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const updatedSettings: SystemSettings = {
        ...mockSettings,
        judge_model_id: newJudgeId,
      };
      mockUpdateSystemSettings.mockResolvedValue(updatedSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.update({
          judge_model_id: newJudgeId,
        });
      });

      // Check that the update was called (the second arg is mutation context from React Query)
      expect(mockUpdateSystemSettings).toHaveBeenCalled();
      const callArgs = mockUpdateSystemSettings.mock.calls[0];
      expect(callArgs[0]).toEqual({ judge_model_id: newJudgeId });

      await waitFor(() => {
        expect(result.current.settings?.judge_model_id).toBe(newJudgeId);
      });
    });

    it('should set isUpdating during update', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);
      let resolveUpdate: (value: SystemSettings) => void;
      mockUpdateSystemSettings.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isUpdating).toBe(false);

      // Start the update
      act(() => {
        result.current.update({ developer_mode: true });
      });

      // Wait for isUpdating to become true
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      // Resolve the update
      act(() => {
        resolveUpdate!(mockSettings);
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });

    it('should handle update error', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);
      mockUpdateSystemSettings.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.update({ developer_mode: true });
        }),
      ).rejects.toThrow('Update failed');
    });

    it('should update multiple fields at once', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);
      const newJudgeId = 'c1c2c3d4-e5f6-7890-abcd-ef1234567890';
      const newEmbedId = 'd1d2c3d4-e5f6-7890-abcd-ef1234567890';
      const updatedSettings: SystemSettings = {
        ...mockSettings,
        judge_model_id: newJudgeId,
        embedding_model_id: newEmbedId,
        developer_mode: true,
      };
      mockUpdateSystemSettings.mockResolvedValue(updatedSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.update({
          judge_model_id: newJudgeId,
          embedding_model_id: newEmbedId,
          developer_mode: true,
        });
      });

      // Check that the update was called (the second arg is mutation context from React Query)
      expect(mockUpdateSystemSettings).toHaveBeenCalled();
      const callArgs = mockUpdateSystemSettings.mock.calls[0];
      expect(callArgs[0]).toEqual({
        judge_model_id: newJudgeId,
        embedding_model_id: newEmbedId,
        developer_mode: true,
      });
    });

    it('should allow setting model ID to null', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);
      const updatedSettings: SystemSettings = {
        ...mockSettings,
        judge_model_id: null,
      };
      mockUpdateSystemSettings.mockResolvedValue(updatedSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.update({ judge_model_id: null });
      });

      await waitFor(() => {
        expect(result.current.settings?.judge_model_id).toBeNull();
      });
    });
  });

  describe('Refetching Settings', () => {
    it('should refetch settings when refetch is called', async () => {
      mockGetSystemSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSystemSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetSystemSettings).toHaveBeenCalledTimes(1);

      // Update the mock to return different data
      const newSettings: SystemSettings = {
        ...mockSettings,
        developer_mode: true,
      };
      mockGetSystemSettings.mockResolvedValue(newSettings);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetSystemSettings).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.settings?.developer_mode).toBe(true);
      });
    });
  });
});
