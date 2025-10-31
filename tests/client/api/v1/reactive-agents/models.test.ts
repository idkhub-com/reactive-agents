import {
  createModel,
  deleteModel,
  getModelById,
  getModels,
  updateModel,
} from '@client/api/v1/reactive-agents/models';
import type { Model, ModelCreateParams } from '@shared/types/data/model';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the entire module
vi.mock('@client/api/v1/reactive-agents/models', () => ({
  getModels: vi.fn(),
  getModelById: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
}));

// Get the mocked functions
const mockedGetModels = vi.mocked(getModels);
const mockedGetModelById = vi.mocked(getModelById);
const mockedCreateModel = vi.mocked(createModel);
const mockedUpdateModel = vi.mocked(updateModel);
const mockedDeleteModel = vi.mocked(deleteModel);

describe('Models Client API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockModel: Model = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
    model_name: 'gpt-4',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  describe('getModels', () => {
    it('should fetch models successfully', async () => {
      const mockModels = [mockModel];
      mockedGetModels.mockResolvedValue(mockModels);

      const result = await getModels();

      expect(result).toEqual(mockModels);
      expect(mockedGetModels).toHaveBeenCalledWith();
    });

    it('should fetch models with query parameters', async () => {
      const mockModels = [mockModel];
      mockedGetModels.mockResolvedValue(mockModels);

      const queryParams = {
        ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
        model_name: 'gpt-4',
        limit: 10,
        offset: 0,
      };

      const result = await getModels(queryParams);

      expect(result).toEqual(mockModels);
      expect(mockedGetModels).toHaveBeenCalledWith(queryParams);
    });

    it('should throw error when request fails', async () => {
      mockedGetModels.mockRejectedValue(new Error('Failed to fetch models'));

      await expect(getModels()).rejects.toThrow('Failed to fetch models');
    });

    it('should handle empty response', async () => {
      mockedGetModels.mockResolvedValue([]);

      const result = await getModels();

      expect(result).toEqual([]);
    });
  });

  describe('getModelById', () => {
    it('should fetch model by ID successfully', async () => {
      mockedGetModelById.mockResolvedValue(mockModel);

      const result = await getModelById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockModel);
      expect(mockedGetModelById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should throw error when model not found', async () => {
      mockedGetModelById.mockRejectedValue(new Error('Failed to fetch model'));

      await expect(
        getModelById('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Failed to fetch model');
    });
  });

  describe('createModel', () => {
    it('should create model successfully', async () => {
      const createParams: ModelCreateParams = {
        ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
        model_name: 'gpt-4',
      };

      mockedCreateModel.mockResolvedValue(mockModel);

      const result = await createModel(createParams);

      expect(result).toEqual(mockModel);
      expect(mockedCreateModel).toHaveBeenCalledWith(createParams);
    });

    it('should throw error when creation fails', async () => {
      const createParams: ModelCreateParams = {
        ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
        model_name: 'gpt-4',
      };

      mockedCreateModel.mockRejectedValue(new Error('Failed to create model'));

      await expect(createModel(createParams)).rejects.toThrow(
        'Failed to create model',
      );
    });
  });

  describe('updateModel', () => {
    it('should update model successfully', async () => {
      const updateParams = {
        model_name: 'gpt-4-turbo',
      };

      const updatedModel: Model = {
        ...mockModel,
        model_name: 'gpt-4-turbo',
        updated_at: '2023-01-01T01:00:00.000Z',
      };

      mockedUpdateModel.mockResolvedValue(updatedModel);

      const result = await updateModel(
        '123e4567-e89b-12d3-a456-426614174000',
        updateParams,
      );

      expect(result).toEqual(updatedModel);
      expect(mockedUpdateModel).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        updateParams,
      );
    });

    it('should throw error when update fails', async () => {
      const updateParams = {
        model_name: 'gpt-4-turbo',
      };

      mockedUpdateModel.mockRejectedValue(new Error('Failed to update model'));

      await expect(
        updateModel('123e4567-e89b-12d3-a456-426614174000', updateParams),
      ).rejects.toThrow('Failed to update model');
    });
  });

  describe('deleteModel', () => {
    it('should delete model successfully', async () => {
      mockedDeleteModel.mockResolvedValue();

      await deleteModel('123e4567-e89b-12d3-a456-426614174000');

      expect(mockedDeleteModel).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should throw error when deletion fails', async () => {
      mockedDeleteModel.mockRejectedValue(new Error('Failed to delete model'));

      await expect(
        deleteModel('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Failed to delete model');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in getModels', async () => {
      mockedGetModels.mockRejectedValue(new Error('Network error'));

      await expect(getModels()).rejects.toThrow('Network error');
    });

    it('should handle network errors in getModelById', async () => {
      mockedGetModelById.mockRejectedValue(new Error('Network error'));

      await expect(
        getModelById('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Network error');
    });

    it('should handle network errors in createModel', async () => {
      const createParams: ModelCreateParams = {
        ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
        model_name: 'gpt-4',
      };

      mockedCreateModel.mockRejectedValue(new Error('Network error'));

      await expect(createModel(createParams)).rejects.toThrow('Network error');
    });

    it('should handle network errors in updateModel', async () => {
      const updateParams = { model_name: 'gpt-4-turbo' };

      mockedUpdateModel.mockRejectedValue(new Error('Network error'));

      await expect(
        updateModel('123e4567-e89b-12d3-a456-426614174000', updateParams),
      ).rejects.toThrow('Network error');
    });

    it('should handle network errors in deleteModel', async () => {
      mockedDeleteModel.mockRejectedValue(new Error('Network error'));

      await expect(
        deleteModel('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Network error');
    });
  });
});
