import { HttpMethod } from '@server/types/http';
import {
  DataPoint,
  DataPointCreateParams,
  DataPointQueryParams,
  DataPointUpdateParams,
} from '@shared/types/data/data-point';
import { describe, expect, it } from 'vitest';

describe('DataPoint Shared Types', () => {
  describe('DataPoint', () => {
    it('should validate a valid data point', () => {
      const validDataPoint = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        ground_truth: { expected: 'result' },
        is_golden: true,
        metadata: { source: 'test' },
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DataPoint.safeParse(validDataPoint);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDataPoint);
      }
    });

    it('should validate data point without ground_truth', () => {
      const dataPointWithoutGroundTruth = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        method: HttpMethod.GET,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: false,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DataPoint.safeParse(dataPointWithoutGroundTruth);
      expect(result.success).toBe(true);
    });

    it('should validate data point with null ground_truth', () => {
      const dataPointWithNullGroundTruth = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        method: HttpMethod.PUT,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        ground_truth: null,
        is_golden: true,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DataPoint.safeParse(dataPointWithNullGroundTruth);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidDataPoint = {
        id: 'invalid-uuid',
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: true,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DataPoint.safeParse(invalidDataPoint);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });

    it('should reject empty endpoint', () => {
      const dataPointWithEmptyEndpoint = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        method: HttpMethod.POST,
        endpoint: '',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: true,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DataPoint.safeParse(dataPointWithEmptyEndpoint);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('endpoint');
      }
    });

    it('should reject empty function_name', () => {
      const dataPointWithEmptyFunctionName = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: '',
        request_body: { key: 'value' },
        is_golden: true,
        metadata: {},
        created_at: '2023-12-01T10:00:00.000Z',
      };

      const result = DataPoint.safeParse(dataPointWithEmptyFunctionName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('function_name');
      }
    });

    it('should reject invalid datetime format', () => {
      const dataPointWithInvalidDate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: true,
        metadata: {},
        created_at: 'invalid-date',
      };

      const result = DataPoint.safeParse(dataPointWithInvalidDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('created_at');
      }
    });
  });

  describe('DataPointQueryParams', () => {
    it('should validate valid query parameters', () => {
      const validParams = {
        ids: ['123e4567-e89b-12d3-a456-426614174000'],
        hashes: ['abc123def456'],
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: 'test_function',
        is_golden: true,
        limit: 10,
        offset: 0,
      };

      const result = DataPointQueryParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should validate empty query parameters', () => {
      const emptyParams = {};

      const result = DataPointQueryParams.safeParse(emptyParams);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format for id', () => {
      const invalidParams = {
        ids: ['invalid-uuid'],
        hashes: ['abc123def456'],
      };

      expect(() => {
        DataPointQueryParams.parse(invalidParams);
      }).toThrow('Invalid uuid');
    });

    it('should reject empty hash', () => {
      const paramsWithEmptyHash = {
        hashes: [''],
      };

      expect(() => {
        DataPointQueryParams.parse(paramsWithEmptyHash);
      }).toThrow('String must contain at least 1 character(s)');
    });

    it('should reject empty endpoint', () => {
      const paramsWithEmptyEndpoint = {
        endpoint: '',
      };

      expect(() => {
        DataPointQueryParams.parse(paramsWithEmptyEndpoint);
      }).toThrow('String must contain at least 1 character(s)');
    });

    it('should reject empty function_name', () => {
      const paramsWithEmptyFunctionName = {
        function_name: '',
      };

      expect(() => {
        DataPointQueryParams.parse(paramsWithEmptyFunctionName);
      }).toThrow('String must contain at least 1 character(s)');
    });

    it('should reject negative limit', () => {
      const paramsWithNegativeLimit = {
        limit: -1,
      };

      expect(() => {
        DataPointQueryParams.parse(paramsWithNegativeLimit);
      }).toThrow('Number must be greater than 0');
    });

    it('should reject negative offset', () => {
      const paramsWithNegativeOffset = {
        offset: -1,
      };

      expect(() => {
        DataPointQueryParams.parse(paramsWithNegativeOffset);
      }).toThrow('Number must be greater than or equal to 0');
    });
  });

  describe('DataPointCreateParams', () => {
    it('should validate valid create parameters', () => {
      const validParams = {
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        ground_truth: { expected: 'result' },
        is_golden: true,
        metadata: { source: 'test' },
      };

      const result = DataPointCreateParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should validate create parameters without ground_truth', () => {
      const paramsWithoutGroundTruth = {
        method: HttpMethod.GET,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: false,
        metadata: {},
      };

      const result = DataPointCreateParams.safeParse(paramsWithoutGroundTruth);
      expect(result.success).toBe(true);
    });

    it('should validate create parameters with null ground_truth', () => {
      const paramsWithNullGroundTruth = {
        method: HttpMethod.PUT,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        ground_truth: null,
        is_golden: true,
        metadata: {},
      };

      const result = DataPointCreateParams.safeParse(paramsWithNullGroundTruth);
      expect(result.success).toBe(true);
    });

    it('should reject empty endpoint', () => {
      const paramsWithEmptyEndpoint = {
        method: HttpMethod.POST,
        endpoint: '',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: true,
        metadata: {},
      };

      const result = DataPointCreateParams.safeParse(paramsWithEmptyEndpoint);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('endpoint');
      }
    });

    it('should reject empty function_name', () => {
      const paramsWithEmptyFunctionName = {
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: '',
        request_body: { key: 'value' },
        is_golden: true,
        metadata: {},
      };

      const result = DataPointCreateParams.safeParse(
        paramsWithEmptyFunctionName,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('function_name');
      }
    });

    it('should provide default empty metadata', () => {
      const paramsWithoutMetadata = {
        method: HttpMethod.POST,
        endpoint: '/api/test',
        function_name: 'test_function',
        request_body: { key: 'value' },
        is_golden: true,
      };

      const result = DataPointCreateParams.safeParse(paramsWithoutMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({});
      }
    });
  });

  describe('DataPointUpdateParams', () => {
    it('should validate valid update parameters', () => {
      const validParams = {
        ground_truth: { updated: 'result' },
        is_golden: false,
        metadata: { updated: true },
      };

      const result = DataPointUpdateParams.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should validate update with only ground_truth', () => {
      const paramsWithOnlyGroundTruth = {
        ground_truth: { updated: 'result' },
      };

      const result = DataPointUpdateParams.safeParse(paramsWithOnlyGroundTruth);
      expect(result.success).toBe(true);
    });

    it('should validate update with only is_golden', () => {
      const paramsWithOnlyIsGolden = {
        is_golden: true,
      };

      const result = DataPointUpdateParams.safeParse(paramsWithOnlyIsGolden);
      expect(result.success).toBe(true);
    });

    it('should validate update with only metadata', () => {
      const paramsWithOnlyMetadata = {
        metadata: { updated: true },
      };

      const result = DataPointUpdateParams.safeParse(paramsWithOnlyMetadata);
      expect(result.success).toBe(true);
    });

    it('should validate update with null ground_truth', () => {
      const paramsWithNullGroundTruth = {
        ground_truth: null,
      };

      const result = DataPointUpdateParams.safeParse(paramsWithNullGroundTruth);
      expect(result.success).toBe(true);
    });

    it('should reject update with no fields', () => {
      const paramsWithNoFields = {};

      const result = DataPointUpdateParams.safeParse(paramsWithNoFields);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('custom');
      }
    });

    it('should reject update with only undefined fields', () => {
      const paramsWithUndefinedFields = {
        ground_truth: undefined,
        is_golden: undefined,
        metadata: undefined,
      };

      const result = DataPointUpdateParams.safeParse(paramsWithUndefinedFields);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('custom');
      }
    });
  });
});
