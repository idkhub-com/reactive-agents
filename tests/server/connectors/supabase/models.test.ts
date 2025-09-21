import { supabaseUserDataStorageConnector } from '@server/connectors/supabase';
import type {
  Model,
  ModelCreateParams,
  ModelQueryParams,
  ModelUpdateParams,
} from '@shared/types/data/model';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
vi.mock('@server/constants', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  AI_PROVIDER_API_KEY_ENCRYPTION_KEY: 'test-encryption-key',
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Supabase Connector - Models', () => {
  const connector = supabaseUserDataStorageConnector;

  const testModel: Model = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ai_provider_api_key_id: '550e8400-e29b-41d4-a716-446655440000',
    model_name: 'gpt-4',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getModels', () => {
    it('should fetch models with query params', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [testModel],
      });

      const queryParams: ModelQueryParams = {
        ai_provider_api_key_id: testModel.ai_provider_api_key_id,
      };

      const result = await connector.getModels(queryParams);

      expect(result).toEqual([testModel]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch models with empty query params', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [testModel],
      });

      const result = await connector.getModels({});

      expect(result).toEqual([testModel]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should filter models by model_name with exact match', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [testModel],
      });

      const queryParams: ModelQueryParams = {
        model_name: 'gpt-4',
      };

      const result = await connector.getModels(queryParams);

      expect(result).toEqual([testModel]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should apply limit and offset', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [testModel],
      });

      const queryParams: ModelQueryParams = {
        limit: 10,
        offset: 5,
      };

      const result = await connector.getModels(queryParams);

      expect(result).toEqual([testModel]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when fetch fails', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(connector.getModels({})).rejects.toThrow();
    });

    it('should return empty array when no models found', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await connector.getModels({});

      expect(result).toEqual([]);
    });
  });

  describe('getModelById', () => {
    it('should fetch model by id successfully', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [testModel],
      });

      const result = await connector.getModelById(testModel.id);

      expect(result).toEqual(testModel);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null when model not found', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await connector.getModelById(testModel.id);

      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(connector.getModelById(testModel.id)).rejects.toThrow();
    });
  });

  describe('createModel', () => {
    it('should create model successfully', async () => {
      const createParams: ModelCreateParams = {
        ai_provider_api_key_id: testModel.ai_provider_api_key_id,
        model_name: testModel.model_name,
      };

      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [testModel],
      });

      const result = await connector.createModel(createParams);

      expect(result).toEqual(testModel);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when creation fails', async () => {
      const createParams: ModelCreateParams = {
        ai_provider_api_key_id: testModel.ai_provider_api_key_id,
        model_name: testModel.model_name,
      };

      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(connector.createModel(createParams)).rejects.toThrow();
    });
  });

  describe('updateModel', () => {
    it('should update model successfully', async () => {
      const updateParams: ModelUpdateParams = {
        model_name: 'gpt-4-turbo',
      };

      const updatedModel: Model = {
        ...testModel,
        model_name: 'gpt-4-turbo',
        updated_at: '2023-01-01T01:00:00.000Z',
      };

      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [updatedModel],
      });

      const result = await connector.updateModel(testModel.id, updateParams);

      expect(result).toEqual(updatedModel);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when model to update not found', async () => {
      const updateParams: ModelUpdateParams = {
        model_name: 'gpt-4-turbo',
      };

      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await connector.updateModel(
        'non-existent-id',
        updateParams,
      );
      expect(result).toBeUndefined();
    });

    it('should throw error when update fails', async () => {
      const updateParams: ModelUpdateParams = {
        model_name: 'gpt-4-turbo',
      };

      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(
        connector.updateModel(testModel.id, updateParams),
      ).rejects.toThrow();
    });
  });

  describe('deleteModel', () => {
    it('should delete model successfully', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await connector.deleteModel(testModel.id);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when deletion fails', async () => {
      (
        global.fetch as unknown as {
          mockResolvedValueOnce: (value: unknown) => void;
        }
      ).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(connector.deleteModel(testModel.id)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      (
        global.fetch as unknown as {
          mockRejectedValueOnce: (error: unknown) => void;
        }
      ).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(connector.getModels({})).rejects.toThrow('Network timeout');
    });

    it('should handle fetch rejections', async () => {
      (
        global.fetch as unknown as {
          mockRejectedValueOnce: (error: unknown) => void;
        }
      ).mockRejectedValueOnce(new Error('Connection refused'));

      await expect(connector.getModelById(testModel.id)).rejects.toThrow(
        'Connection refused',
      );
    });
  });
});
