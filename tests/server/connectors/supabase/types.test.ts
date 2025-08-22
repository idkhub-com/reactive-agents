import {
  DatasetDataPointBridge,
  DatasetDataPointBridgeCreateParams,
} from '@server/connectors/supabase/types';
import { describe, expect, it } from 'vitest';

describe('Supabase Dataset Connector Types', () => {
  describe('DatasetDataPointBridge', () => {
    it('should validate a valid bridge record', () => {
      const validBridge = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DatasetDataPointBridge.safeParse(validBridge);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validBridge);
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidBridge = {
        dataset_id: 'invalid-uuid',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DatasetDataPointBridge.safeParse(invalidBridge);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('dataset_id');
      }
    });

    it('should reject invalid datetime format', () => {
      const invalidBridge = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        created_at: 'invalid-date',
      };

      const result = DatasetDataPointBridge.safeParse(invalidBridge);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('created_at');
      }
    });

    it('should reject missing required fields', () => {
      const incompleteBridge = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        // missing data_point_id and created_at
      };

      const result = DatasetDataPointBridge.safeParse(incompleteBridge);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('DatasetDataPointBridgeCreateParams', () => {
    it('should validate valid create parameters', () => {
      const validParams = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
      };

      const result = DatasetDataPointBridgeCreateParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidParams = {
        dataset_id: 'invalid-uuid',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
      };

      const result =
        DatasetDataPointBridgeCreateParams.safeParse(invalidParams);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('dataset_id');
      }
    });

    it('should reject missing required fields', () => {
      const incompleteParams = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        // missing data_point_id
      };

      const result =
        DatasetDataPointBridgeCreateParams.safeParse(incompleteParams);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject extra fields', () => {
      const paramsWithExtraFields = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        extra_field: 'should not be here',
      };

      const result = DatasetDataPointBridgeCreateParams.safeParse(
        paramsWithExtraFields,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('unrecognized_keys');
      }
    });

    it('should reject empty strings', () => {
      const paramsWithEmptyStrings = {
        dataset_id: '',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
      };

      const result = DatasetDataPointBridgeCreateParams.safeParse(
        paramsWithEmptyStrings,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('dataset_id');
      }
    });
  });

  describe('Type exports', () => {
    it('should export correct types', () => {
      // Test that the types are properly exported and can be used
      const bridgeRecord: typeof DatasetDataPointBridge._type = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const createParams: typeof DatasetDataPointBridgeCreateParams._type = {
        dataset_id: '123e4567-e89b-12d3-a456-426614174000',
        data_point_id: '987fcdeb-51a2-43d1-9f12-345678901234',
      };

      expect(bridgeRecord).toBeDefined();
      expect(createParams).toBeDefined();
    });
  });
});
