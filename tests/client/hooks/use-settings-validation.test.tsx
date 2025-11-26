import { useSettingsValidation } from '@client/hooks/use-settings-validation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the providers
const mockUseSystemSettings = vi.fn();
const mockUseModels = vi.fn();

vi.mock('@client/providers/system-settings', () => ({
  useSystemSettings: () => mockUseSystemSettings(),
}));

vi.mock('@client/providers/models', () => ({
  useModels: () => mockUseModels(),
}));

describe('useSettingsValidation', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockCompleteSettings = {
    id: 'settings-1234-5678-9012-345678901234',
    system_prompt_reflection_model_id: 'model-1111-2222-3333-444455556666',
    evaluation_generation_model_id: 'model-2222-3333-4444-555566667777',
    embedding_model_id: 'model-3333-4444-5555-666677778888',
    judge_model_id: 'model-4444-5555-6666-777788889999',
    developer_mode: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockTextModel = {
    id: 'model-text-0001-2222-3333-444455556666',
    ai_provider_id: 'provider-0001-2222-3333-444455556666',
    model_name: 'gpt-4',
    model_type: 'text' as const,
    embedding_dimensions: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockEmbedModel = {
    id: 'model-embed-0001-2222-3333-444455556666',
    ai_provider_id: 'provider-0001-2222-3333-444455556666',
    model_name: 'text-embedding-3-small',
    model_type: 'embed' as const,
    embedding_dimensions: 1536,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should return loading state when settings are loading', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: null,
        isLoading: true,
      });
      mockUseModels.mockReturnValue({
        models: [],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return loading state when models are loading', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [],
        isLoading: true,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return loading when both are loading', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: null,
        isLoading: true,
      });
      mockUseModels.mockReturnValue({
        models: [],
        isLoading: true,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.missingSettings).toEqual([]);
    });
  });

  describe('Model Type Validation', () => {
    it('should return hasModels=false when no models exist', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.hasModels).toBe(false);
      expect(result.current.hasTextModels).toBe(false);
      expect(result.current.hasEmbedModels).toBe(false);
      expect(result.current.hasRequiredModelTypes).toBe(false);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return hasTextModels=true when only text models exist', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.hasModels).toBe(true);
      expect(result.current.hasTextModels).toBe(true);
      expect(result.current.hasEmbedModels).toBe(false);
      expect(result.current.hasRequiredModelTypes).toBe(false);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return hasEmbedModels=true when only embed models exist', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.hasModels).toBe(true);
      expect(result.current.hasTextModels).toBe(false);
      expect(result.current.hasEmbedModels).toBe(true);
      expect(result.current.hasRequiredModelTypes).toBe(false);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return hasRequiredModelTypes=true when both text and embed models exist', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.hasModels).toBe(true);
      expect(result.current.hasTextModels).toBe(true);
      expect(result.current.hasEmbedModels).toBe(true);
      expect(result.current.hasRequiredModelTypes).toBe(true);
    });
  });

  describe('Settings Validation', () => {
    it('should return all missing settings when none are configured', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: {
          ...mockCompleteSettings,
          system_prompt_reflection_model_id: null,
          evaluation_generation_model_id: null,
          embedding_model_id: null,
          judge_model_id: null,
        },
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toContain(
        'System Prompt Reflection model',
      );
      expect(result.current.missingSettings).toContain(
        'Evaluation Generation model',
      );
      expect(result.current.missingSettings).toContain('Judge model');
      expect(result.current.missingSettings).toContain('Embedding model');
      expect(result.current.missingSettings.length).toBe(4);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return missing System Prompt Reflection model', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: {
          ...mockCompleteSettings,
          system_prompt_reflection_model_id: null,
        },
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toContain(
        'System Prompt Reflection model',
      );
      expect(result.current.missingSettings.length).toBe(1);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return missing Evaluation Generation model', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: {
          ...mockCompleteSettings,
          evaluation_generation_model_id: null,
        },
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toContain(
        'Evaluation Generation model',
      );
      expect(result.current.missingSettings.length).toBe(1);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return missing Judge model', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: {
          ...mockCompleteSettings,
          judge_model_id: null,
        },
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toContain('Judge model');
      expect(result.current.missingSettings.length).toBe(1);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return missing Embedding model', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: {
          ...mockCompleteSettings,
          embedding_model_id: null,
        },
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toContain('Embedding model');
      expect(result.current.missingSettings.length).toBe(1);
      expect(result.current.isComplete).toBe(false);
    });

    it('should return empty missingSettings when all are configured', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toEqual([]);
    });
  });

  describe('Complete State', () => {
    it('should return isComplete=true when all settings and model types are configured', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.missingSettings).toEqual([]);
      expect(result.current.hasRequiredModelTypes).toBe(true);
    });

    it('should return isComplete=false when settings are complete but missing model types', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel], // Missing embed model
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isComplete).toBe(false);
      expect(result.current.hasRequiredModelTypes).toBe(false);
    });

    it('should return isComplete=false when model types are complete but settings are missing', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: {
          ...mockCompleteSettings,
          judge_model_id: null,
        },
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isComplete).toBe(false);
      expect(result.current.hasRequiredModelTypes).toBe(true);
    });

    it('should return isComplete=false during loading', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: true,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.isComplete).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Query Params', () => {
    it('should call setQueryParams on mount to load all models', async () => {
      const setQueryParamsMock = vi.fn();
      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [],
        isLoading: false,
        setQueryParams: setQueryParamsMock,
      });

      renderHook(() => useSettingsValidation(), { wrapper });

      await waitFor(() => {
        expect(setQueryParamsMock).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null settings gracefully', () => {
      mockUseSystemSettings.mockReturnValue({
        settings: null,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.missingSettings).toContain(
        'System Prompt Reflection model',
      );
      expect(result.current.missingSettings).toContain(
        'Evaluation Generation model',
      );
      expect(result.current.missingSettings).toContain('Judge model');
      expect(result.current.missingSettings).toContain('Embedding model');
      expect(result.current.isComplete).toBe(false);
    });

    it('should handle multiple text models correctly', () => {
      const anotherTextModel = {
        ...mockTextModel,
        id: 'model-text-0002-2222-3333-444455556666',
        model_name: 'claude-3-opus',
      };

      mockUseSystemSettings.mockReturnValue({
        settings: mockCompleteSettings,
        isLoading: false,
      });
      mockUseModels.mockReturnValue({
        models: [mockTextModel, anotherTextModel, mockEmbedModel],
        isLoading: false,
        setQueryParams: vi.fn(),
      });

      const { result } = renderHook(() => useSettingsValidation(), { wrapper });

      expect(result.current.hasModels).toBe(true);
      expect(result.current.hasTextModels).toBe(true);
      expect(result.current.hasEmbedModels).toBe(true);
      expect(result.current.isComplete).toBe(true);
    });
  });
});
