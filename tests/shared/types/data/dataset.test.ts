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
  });

  describe('DatasetQueryParams', () => {
    it('should validate valid query parameters', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Dataset',
        limit: 10,
        offset: 0,
      };

      const result = DatasetQueryParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
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
        metadata: { key: 'value' },
      };

      const result = DatasetCreateParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
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
    "message": "Unrecognized key(s) in object: 'id'"
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
