import type { UserDataStorageConnector } from '@server/types/connector';
import {
  resolveEmbeddingModelConfig,
  resolveEvaluationModelConfig,
  resolveSystemSettingsModel,
} from '@server/utils/evaluation-model-resolver';
import type { Model, SkillOptimizationEvaluation } from '@shared/types/data';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock console.warn to suppress warning messages in tests
vi.spyOn(console, 'warn').mockImplementation(() => {
  // Intentionally empty - suppressing console warnings in tests
});

describe('Evaluation Model Resolver', () => {
  const mockConnector = {
    getSystemSettings: vi.fn(),
    getModels: vi.fn(),
    getAIProviderAPIKeys: vi.fn(),
  } as unknown as UserDataStorageConnector;

  const mockModel: Model = {
    id: 'model-1111-2222-3333-444455556666',
    ai_provider_id: 'provider-1111-2222-3333-444455556666',
    model_name: 'gpt-4',
    model_type: 'text',
    embedding_dimensions: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockEmbedModel: Model = {
    id: 'embed-1111-2222-3333-444455556666',
    ai_provider_id: 'provider-1111-2222-3333-444455556666',
    model_name: 'text-embedding-3-small',
    model_type: 'embed',
    embedding_dimensions: 1536,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockProvider = {
    id: 'provider-1111-2222-3333-444455556666',
    ai_provider: 'openai',
    name: 'OpenAI',
    api_key: 'sk-test-api-key',
    custom_fields: {},
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockSystemSettings = {
    id: 'settings-1111-2222-3333-444455556666',
    judge_model_id: 'model-1111-2222-3333-444455556666',
    embedding_model_id: 'embed-1111-2222-3333-444455556666',
    system_prompt_reflection_model_id: 'model-1111-2222-3333-444455556666',
    evaluation_generation_model_id: 'model-1111-2222-3333-444455556666',
    developer_mode: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveSystemSettingsModel', () => {
    it('should resolve judge model from system settings', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        mockProvider,
      ]);

      const result = await resolveSystemSettingsModel('judge', mockConnector);

      expect(result).toEqual({
        model: 'gpt-4',
        provider: 'openai',
        apiKey: 'sk-test-api-key',
      });
      expect(mockConnector.getSystemSettings).toHaveBeenCalled();
      expect(mockConnector.getModels).toHaveBeenCalledWith({
        id: mockSystemSettings.judge_model_id,
      });
    });

    it('should resolve embedding model from system settings', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockEmbedModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        mockProvider,
      ]);

      const result = await resolveSystemSettingsModel(
        'embedding',
        mockConnector,
      );

      expect(result).toEqual({
        model: 'text-embedding-3-small',
        provider: 'openai',
        apiKey: 'sk-test-api-key',
      });
      expect(mockConnector.getModels).toHaveBeenCalledWith({
        id: mockSystemSettings.embedding_model_id,
      });
    });

    it('should resolve system_prompt_reflection model from system settings', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        mockProvider,
      ]);

      const result = await resolveSystemSettingsModel(
        'system_prompt_reflection',
        mockConnector,
      );

      expect(result).toEqual({
        model: 'gpt-4',
        provider: 'openai',
        apiKey: 'sk-test-api-key',
      });
      expect(mockConnector.getModels).toHaveBeenCalledWith({
        id: mockSystemSettings.system_prompt_reflection_model_id,
      });
    });

    it('should resolve evaluation_generation model from system settings', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        mockProvider,
      ]);

      const result = await resolveSystemSettingsModel(
        'evaluation_generation',
        mockConnector,
      );

      expect(result).toEqual({
        model: 'gpt-4',
        provider: 'openai',
        apiKey: 'sk-test-api-key',
      });
      expect(mockConnector.getModels).toHaveBeenCalledWith({
        id: mockSystemSettings.evaluation_generation_model_id,
      });
    });

    it('should return null when model_id is not configured in system settings', async () => {
      const settingsWithNoJudge = {
        ...mockSystemSettings,
        judge_model_id: null,
      };
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        settingsWithNoJudge,
      );

      const result = await resolveSystemSettingsModel('judge', mockConnector);

      expect(result).toBeNull();
      expect(mockConnector.getModels).not.toHaveBeenCalled();
    });

    it('should return null when model is not found', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([]);

      const result = await resolveSystemSettingsModel('judge', mockConnector);

      expect(result).toBeNull();
    });

    it('should return null when provider is not found', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([]);

      const result = await resolveSystemSettingsModel('judge', mockConnector);

      expect(result).toBeNull();
    });

    it('should return null when provider has no API key', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        { ...mockProvider, api_key: null },
      ]);

      const result = await resolveSystemSettingsModel('judge', mockConnector);

      expect(result).toBeNull();
    });
  });

  describe('resolveEvaluationModelConfig', () => {
    const mockEvaluation: SkillOptimizationEvaluation = {
      id: 'eval-1111-2222-3333-444455556666',
      agent_id: 'agent-1111-2222-3333-444455556666',
      skill_id: 'skill-1111-2222-3333-444455556666',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      weight: 1.0,
      params: {},
      model_id: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should use evaluation-specific model_id when set', async () => {
      const evalWithModel: SkillOptimizationEvaluation = {
        ...mockEvaluation,
        model_id: 'custom-model-1111-2222-333344445555',
      };
      const customModel = {
        ...mockModel,
        id: 'custom-model-1111-2222-333344445555',
        model_name: 'custom-model',
      };

      vi.mocked(mockConnector.getModels).mockResolvedValue([customModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        mockProvider,
      ]);

      const result = await resolveEvaluationModelConfig(
        evalWithModel,
        mockConnector,
      );

      expect(result).toEqual({
        model: 'custom-model',
        provider: 'openai',
        apiKey: 'sk-test-api-key',
      });
      expect(mockConnector.getModels).toHaveBeenCalledWith({
        id: 'custom-model-1111-2222-333344445555',
      });
      expect(mockConnector.getSystemSettings).not.toHaveBeenCalled();
    });

    it('should fall back to system settings judge_model_id when evaluation has no model_id', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockResolvedValue([
        mockProvider,
      ]);

      const result = await resolveEvaluationModelConfig(
        mockEvaluation,
        mockConnector,
      );

      expect(result).toEqual({
        model: 'gpt-4',
        provider: 'openai',
        apiKey: 'sk-test-api-key',
      });
      expect(mockConnector.getSystemSettings).toHaveBeenCalled();
    });

    it('should return null when evaluation model is not found', async () => {
      const evalWithModel: SkillOptimizationEvaluation = {
        ...mockEvaluation,
        model_id: 'nonexistent-model-1111-222233334444',
      };

      vi.mocked(mockConnector.getModels).mockResolvedValue([]);

      const result = await resolveEvaluationModelConfig(
        evalWithModel,
        mockConnector,
      );

      expect(result).toBeNull();
    });

    it('should return null when system settings fallback has no judge model', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue({
        ...mockSystemSettings,
        judge_model_id: null,
      });

      const result = await resolveEvaluationModelConfig(
        mockEvaluation,
        mockConnector,
      );

      expect(result).toBeNull();
    });
  });

  describe('resolveEmbeddingModelConfig', () => {
    it('should resolve embedding model with dimensions', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockEmbedModel]);

      const result = await resolveEmbeddingModelConfig(mockConnector);

      expect(result).toEqual({
        modelId: 'embed-1111-2222-3333-444455556666',
        model: mockEmbedModel,
        dimensions: 1536,
      });
    });

    it('should return null when embedding_model_id is not configured', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue({
        ...mockSystemSettings,
        embedding_model_id: null,
      });

      const result = await resolveEmbeddingModelConfig(mockConnector);

      expect(result).toBeNull();
      expect(mockConnector.getModels).not.toHaveBeenCalled();
    });

    it('should return null when embedding model is not found', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([]);

      const result = await resolveEmbeddingModelConfig(mockConnector);

      expect(result).toBeNull();
    });

    it('should return null when embedding model has no dimensions', async () => {
      const modelWithoutDimensions = {
        ...mockEmbedModel,
        embedding_dimensions: null,
      };
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([
        modelWithoutDimensions,
      ]);

      const result = await resolveEmbeddingModelConfig(mockConnector);

      expect(result).toBeNull();
    });

    it('should handle different embedding dimensions correctly', async () => {
      const model3072 = {
        ...mockEmbedModel,
        id: 'embed-3072-1111-2222-333344445555',
        model_name: 'text-embedding-3-large',
        embedding_dimensions: 3072,
      };
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue({
        ...mockSystemSettings,
        embedding_model_id: 'embed-3072-1111-2222-333344445555',
      });
      vi.mocked(mockConnector.getModels).mockResolvedValue([model3072]);

      const result = await resolveEmbeddingModelConfig(mockConnector);

      expect(result?.dimensions).toBe(3072);
      expect(result?.model.model_name).toBe('text-embedding-3-large');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully for system settings', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        resolveSystemSettingsModel('judge', mockConnector),
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors gracefully for model lookup', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockRejectedValue(
        new Error('Model lookup failed'),
      );

      await expect(
        resolveSystemSettingsModel('judge', mockConnector),
      ).rejects.toThrow('Model lookup failed');
    });

    it('should handle database errors gracefully for provider lookup', async () => {
      vi.mocked(mockConnector.getSystemSettings).mockResolvedValue(
        mockSystemSettings,
      );
      vi.mocked(mockConnector.getModels).mockResolvedValue([mockModel]);
      vi.mocked(mockConnector.getAIProviderAPIKeys).mockRejectedValue(
        new Error('Provider lookup failed'),
      );

      await expect(
        resolveSystemSettingsModel('judge', mockConnector),
      ).rejects.toThrow('Provider lookup failed');
    });
  });
});
