import {
  Dataset,
  DatasetCreateParams,
  DatasetQueryParams,
  DatasetUpdateParams,
} from '@shared/types/data/dataset';
import { describe, expect, it } from 'vitest';

describe('Dataset Shared Types', () => {
  describe('Dataset', () => {
    it('should validate a valid dataset', () => {
      const validDataset = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Dataset',
        description: 'A test dataset',
        is_realtime: false,
        realtime_size: 0,
        metadata: { key: 'value' },
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(validDataset);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDataset);
      }
    });

    it('should validate dataset without description', () => {
      const datasetWithoutDescription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Dataset',
        is_realtime: false,
        realtime_size: 0,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(datasetWithoutDescription);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidDataset = {
        id: 'invalid-uuid',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Dataset',
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(invalidDataset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });

    it('should reject empty name', () => {
      const datasetWithEmptyName = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: '',
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(datasetWithEmptyName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should reject invalid datetime format', () => {
      const datasetWithInvalidDate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Dataset',
        is_realtime: false,
        realtime_size: 0,
        metadata: {},
        created_at: 'invalid-date',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(datasetWithInvalidDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('created_at');
      }
    });

    it('should validate realtime dataset with positive size', () => {
      const realtimeDataset = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Realtime Dataset',
        description: 'A realtime dataset',
        is_realtime: true,
        realtime_size: 100,
        metadata: { realtime: true },
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(realtimeDataset);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_realtime).toBe(true);
        expect(result.data.realtime_size).toBe(100);
      }
    });

    it('should default is_realtime to false', () => {
      const datasetWithoutRealtime = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Non-realtime Dataset',
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(datasetWithoutRealtime);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_realtime).toBe(false);
        expect(result.data.realtime_size).toBe(0);
      }
    });

    it('should reject negative realtime_size', () => {
      const datasetWithNegativeSize = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Invalid Dataset',
        is_realtime: true,
        realtime_size: -1,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T11:00:00.000Z',
      };

      const result = Dataset.safeParse(datasetWithNegativeSize);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('realtime_size');
      }
    });
  });

  describe('DatasetQueryParams', () => {
    it('should validate valid query parameters', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Dataset',
        is_realtime: true,
        limit: 10,
        offset: 0,
      };

      const result = DatasetQueryParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should validate query parameters for realtime datasets only', () => {
      const realtimeOnlyParams = {
        is_realtime: true,
      };

      const result = DatasetQueryParams.safeParse(realtimeOnlyParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_realtime).toBe(true);
      }
    });

    it('should validate query parameters for non-realtime datasets only', () => {
      const nonRealtimeParams = {
        is_realtime: false,
      };

      const result = DatasetQueryParams.safeParse(nonRealtimeParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_realtime).toBe(false);
      }
    });

    it('should validate empty query parameters', () => {
      const emptyParams = {};

      const result = DatasetQueryParams.safeParse(emptyParams);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidParams = {
        id: 'invalid-uuid',
        name: 'Test Dataset',
      };

      const result = DatasetQueryParams.safeParse(invalidParams);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });

    it('should reject empty name', () => {
      const paramsWithEmptyName = {
        name: '',
      };

      const result = DatasetQueryParams.safeParse(paramsWithEmptyName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should reject negative limit', () => {
      const paramsWithNegativeLimit = {
        limit: -1,
      };

      const result = DatasetQueryParams.safeParse(paramsWithNegativeLimit);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('limit');
      }
    });

    it('should reject negative offset', () => {
      const paramsWithNegativeOffset = {
        offset: -1,
      };

      const result = DatasetQueryParams.safeParse(paramsWithNegativeOffset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('offset');
      }
    });
  });

  describe('DatasetCreateParams', () => {
    it('should validate valid create parameters', () => {
      const validParams = {
        name: 'New Dataset',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        description: 'A new dataset',
        is_realtime: false,
        realtime_size: 0,
        metadata: { key: 'value' },
      };

      const result = DatasetCreateParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should validate create parameters for realtime dataset', () => {
      const realtimeParams = {
        name: 'New Realtime Dataset',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        description: 'A new realtime dataset',
        is_realtime: true,
        realtime_size: 50,
        metadata: { realtime: true },
      };

      const result = DatasetCreateParams.safeParse(realtimeParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_realtime).toBe(true);
        expect(result.data.realtime_size).toBe(50);
      }
    });

    it('should default is_realtime to false and realtime_size to 0', () => {
      const paramsWithoutRealtime = {
        name: 'New Dataset',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        description: 'A new dataset',
        metadata: { key: 'value' },
      };

      const result = DatasetCreateParams.safeParse(paramsWithoutRealtime);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_realtime).toBe(false);
        expect(result.data.realtime_size).toBe(0);
      }
    });

    it('should reject negative realtime_size in create parameters', () => {
      const invalidParams = {
        name: 'Invalid Dataset',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        is_realtime: true,
        realtime_size: -1,
        metadata: {},
      };

      const result = DatasetCreateParams.safeParse(invalidParams);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('realtime_size');
      }
    });

    it('should validate create parameters without description', () => {
      const paramsWithoutDescription = {
        name: 'New Dataset',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        metadata: {},
      };

      const result = DatasetCreateParams.safeParse(paramsWithoutDescription);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const paramsWithEmptyName = {
        name: '',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        metadata: {},
      };

      const result = DatasetCreateParams.safeParse(paramsWithEmptyName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should reject missing name', () => {
      const paramsWithoutName = {
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        metadata: {},
      };

      const result = DatasetCreateParams.safeParse(paramsWithoutName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should provide default empty metadata', () => {
      const paramsWithoutMetadata = {
        name: 'New Dataset',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
      };

      const result = DatasetCreateParams.safeParse(paramsWithoutMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({});
      }
    });
  });

  describe('DatasetUpdateParams', () => {
    it('should validate valid update parameters', () => {
      const validParams = {
        name: 'Updated Dataset',
        description: 'Updated description',
        metadata: { updated: true },
      };

      const result = DatasetUpdateParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validParams.name);
        expect(result.data.description).toBe(validParams.description);
        expect(result.data.metadata).toEqual(validParams.metadata);
      }
    });

    it('should not allow extra parameters', () => {
      const inputData = {
        name: 'Updated Dataset',
        description: 'Updated description',
        metadata: { updated: true },
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => DatasetUpdateParams.parse(inputData)).toThrow(
        `\
[
  {
    "code": "unrecognized_keys",
    "keys": [
      "id"
    ],
    "path": [],
    "message": "Unrecognized key: \\"id\\""
  }
]`,
      );
    });

    it('should validate update with only name', () => {
      const paramsWithOnlyName = {
        name: 'Updated Dataset',
      };

      const result = DatasetUpdateParams.safeParse(paramsWithOnlyName);
      expect(result.success).toBe(true);
    });

    it('should validate update with only description', () => {
      const paramsWithOnlyDescription = {
        description: 'Updated description',
      };

      const result = DatasetUpdateParams.safeParse(paramsWithOnlyDescription);
      expect(result.success).toBe(true);
    });

    it('should validate update with only metadata', () => {
      const paramsWithOnlyMetadata = {
        metadata: { updated: true },
      };

      const result = DatasetUpdateParams.safeParse(paramsWithOnlyMetadata);
      expect(result.success).toBe(true);
    });

    it('should validate update with only realtime_size', () => {
      const paramsWithOnlyRealtimeSize = {
        realtime_size: 150,
      };

      const result = DatasetUpdateParams.safeParse(paramsWithOnlyRealtimeSize);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.realtime_size).toBe(150);
      }
    });

    it('should validate update with realtime_size set to 0', () => {
      const paramsWithZeroRealtimeSize = {
        realtime_size: 0,
      };

      const result = DatasetUpdateParams.safeParse(paramsWithZeroRealtimeSize);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.realtime_size).toBe(0);
      }
    });

    it('should reject negative realtime_size in update parameters', () => {
      const paramsWithNegativeRealtimeSize = {
        realtime_size: -5,
      };

      const result = DatasetUpdateParams.safeParse(
        paramsWithNegativeRealtimeSize,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('realtime_size');
      }
    });

    it('should reject empty name', () => {
      const paramsWithEmptyName = {
        name: '',
      };

      const result = DatasetUpdateParams.safeParse(paramsWithEmptyName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should reject update with no fields', () => {
      const paramsWithNoFields = {};

      const result = DatasetUpdateParams.safeParse(paramsWithNoFields);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('custom');
      }
    });
  });
});
