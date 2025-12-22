import {
  ImprovedResponse,
  ImprovedResponseCreateParams,
  ImprovedResponseQueryParams,
  ImprovedResponseUpdateParams,
} from '@shared/types/data/improved-response';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock uuid to have predictable values in tests
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
}));

// Mock Date to have predictable timestamps
const mockDate = new Date('2023-01-01T00:00:00.000Z');
const mockISOString = '2023-01-01T00:00:00.000Z';
vi.spyOn(global.Date.prototype, 'toISOString').mockReturnValue(mockISOString);
vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

describe('Improved Response Data Transforms and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImprovedResponseCreateParams Transform', () => {
    it('should auto-generate id, created_at, and updated_at fields', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
      };

      const result = ImprovedResponseCreateParams.parse(inputData);

      expect(result).toEqual({
        ...inputData,
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });
    });

    it('should prevent users from overriding id field (strict mode)', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        id: 'user-provided-id', // Should be rejected
      };

      expect(() => ImprovedResponseCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding created_at field (strict mode)', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        created_at: '2022-01-01T00:00:00.000Z', // Should be rejected
      };

      expect(() => ImprovedResponseCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding updated_at field (strict mode)', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        updated_at: '2022-01-01T00:00:00.000Z', // Should be rejected
      };

      expect(() => ImprovedResponseCreateParams.parse(inputData)).toThrow();
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        extra_field: 'should be rejected',
      };

      expect(() => ImprovedResponseCreateParams.parse(inputData)).toThrow();
    });

    it('should validate UUIDs for agent_id', () => {
      const inputData = {
        agent_id: 'invalid-uuid',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
      };

      expect(() => ImprovedResponseCreateParams.parse(inputData)).toThrow();
    });

    it('should validate UUIDs for log_id', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: 'not-a-uuid',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
      };

      expect(() => ImprovedResponseCreateParams.parse(inputData)).toThrow();
    });

    it('should require all required fields', () => {
      const incompleteData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        // Missing log_id, original_response_body, improved_response_body
      };

      expect(() =>
        ImprovedResponseCreateParams.parse(incompleteData),
      ).toThrow();
    });

    it('should accept complex nested objects in response bodies', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Original response',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25,
          },
        },
        improved_response_body: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Improved response with better quality',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      };

      const result = ImprovedResponseCreateParams.parse(inputData);

      expect(result.original_response_body).toEqual(
        inputData.original_response_body,
      );
      expect(result.improved_response_body).toEqual(
        inputData.improved_response_body,
      );
    });

    it('should handle empty response bodies', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: {},
        improved_response_body: {},
      };

      const result = ImprovedResponseCreateParams.parse(inputData);

      expect(result.original_response_body).toEqual({});
      expect(result.improved_response_body).toEqual({});
    });

    it('should handle arrays and primitive values in response bodies', () => {
      const inputData = {
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: {
          data: [1, 2, 3],
          text: 'string value',
          number: 42,
          boolean: true,
          null_value: null,
        },
        improved_response_body: {
          data: ['a', 'b', 'c'],
          text: 'improved string value',
          number: 100,
          boolean: false,
          null_value: null,
        },
      };

      const result = ImprovedResponseCreateParams.parse(inputData);

      expect(result.original_response_body).toEqual(
        inputData.original_response_body,
      );
      expect(result.improved_response_body).toEqual(
        inputData.improved_response_body,
      );
    });
  });

  describe('ImprovedResponseUpdateParams Transform', () => {
    it('should not allow extra parameters', () => {
      const inputData = {
        improved_response_body: {
          data: ['a', 'b', 'c'],
          text: 'improved string value',
          number: 100,
          boolean: false,
          null_value: null,
        },
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => ImprovedResponseUpdateParams.parse(inputData)).toThrow(
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

    it('should reject empty objects with no fields', () => {
      const emptyObject = {};

      expect(() => ImprovedResponseUpdateParams.parse(emptyObject)).toThrow(
        'At least one field must be provided for update',
      );
    });

    it('should reject objects with improved_response_body set to undefined', () => {
      const inputData = {
        improved_response_body: undefined,
      };

      expect(() => ImprovedResponseUpdateParams.parse(inputData)).toThrow(
        'At least one field must be provided for update',
      );
    });
  });

  describe('ImprovedResponseQueryParams Validation', () => {
    it('should validate optional id as UUID', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = ImprovedResponseQueryParams.parse(validParams);
      expect(result.id).toBe(validParams.id);
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const inputData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        extra_param: 'should be rejected',
      };

      expect(() => ImprovedResponseQueryParams.parse(inputData)).toThrow();
    });

    it('should validate optional log_id as UUID', () => {
      const validParams = {
        log_id: '123e4567-e89b-12d3-a456-426614174003',
      };

      const result = ImprovedResponseQueryParams.parse(validParams);
      expect(result.log_id).toBe(validParams.log_id);
    });

    it('should reject invalid UUID for id', () => {
      const invalidParams = {
        id: 'not-a-uuid',
      };

      expect(() => ImprovedResponseQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject invalid UUID for log_id', () => {
      const invalidParams = {
        log_id: 'invalid-uuid-format',
      };

      expect(() => ImprovedResponseQueryParams.parse(invalidParams)).toThrow();
    });

    it('should validate limit as positive integer', () => {
      const validParams = {
        limit: 50,
      };

      const result = ImprovedResponseQueryParams.parse(validParams);
      expect(result.limit).toBe(50);
    });

    it('should reject negative limit', () => {
      const invalidParams = {
        limit: -10,
      };

      expect(() => ImprovedResponseQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject zero limit', () => {
      const invalidParams = {
        limit: 0,
      };

      expect(() => ImprovedResponseQueryParams.parse(invalidParams)).toThrow();
    });

    it('should validate offset as non-negative integer', () => {
      const validParams = {
        offset: 20,
      };

      const result = ImprovedResponseQueryParams.parse(validParams);
      expect(result.offset).toBe(20);
    });

    it('should allow zero offset', () => {
      const validParams = {
        offset: 0,
      };

      const result = ImprovedResponseQueryParams.parse(validParams);
      expect(result.offset).toBe(0);
    });

    it('should reject negative offset', () => {
      const invalidParams = {
        offset: -5,
      };

      expect(() => ImprovedResponseQueryParams.parse(invalidParams)).toThrow();
    });

    it('should accept empty query params', () => {
      const emptyParams = {};

      const result = ImprovedResponseQueryParams.parse(emptyParams);
      expect(result).toEqual({});
    });

    it('should accept all valid params together', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        limit: 25,
        offset: 10,
      };

      const result = ImprovedResponseQueryParams.parse(validParams);
      expect(result).toEqual(validParams);
    });
  });

  describe('ImprovedResponseSchema Validation', () => {
    it('should validate complete improved response object', () => {
      const validResponse: ImprovedResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = ImprovedResponse.parse(validResponse);
      expect(result).toEqual(validResponse);
    });

    it('should validate datetime strings with timezone offset', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        created_at: '2023-01-01T00:00:00.000+00:00',
        updated_at: '2023-01-02T12:30:45.123-05:00',
      };

      const result = ImprovedResponse.parse(validResponse);
      expect(result.created_at).toBe('2023-01-01T00:00:00.000+00:00');
      expect(result.updated_at).toBe('2023-01-02T12:30:45.123-05:00');
    });

    it('should reject invalid datetime format', () => {
      const invalidResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        skill_id: '123e4567-e89b-12d3-a456-426614174004',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        created_at: 'invalid-date',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => ImprovedResponse.parse(invalidResponse)).toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const invalidResponse = {
        id: 'not-a-uuid',
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => ImprovedResponse.parse(invalidResponse)).toThrow();
    });

    it('should require all required fields', () => {
      const incompleteResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing other required fields
      };

      expect(() => ImprovedResponse.parse(incompleteResponse)).toThrow();
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const invalidResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        log_id: '123e4567-e89b-12d3-a456-426614174003',
        original_response_body: { original: 'content' },
        improved_response_body: { improved: 'content' },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        extra_field: 'should be rejected',
      };

      expect(() => ImprovedResponse.parse(invalidResponse)).toThrow();
    });
  });
});
