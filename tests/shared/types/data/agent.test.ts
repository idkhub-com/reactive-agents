import {
  Agent,
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data/agent';
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

describe('Agent Data Transforms and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AgentCreateParams Transform', () => {
    it('should default metadata to empty object', () => {
      const inputData = {
        name: 'Test Agent',
        description: 'A test agent',
      };

      const result = AgentCreateParams.parse(inputData);

      expect(result.metadata).toEqual({});
    });

    it('should accept custom metadata', () => {
      const customMetadata = {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
      };

      const inputData = {
        name: 'Test Agent',
        description: 'A test agent',
        metadata: customMetadata,
      };

      const result = AgentCreateParams.parse(inputData);

      expect(result.metadata).toEqual(customMetadata);
    });

    it('should require description field', () => {
      const inputDataWithNull = {
        name: 'Test Agent',
        description: null,
      };

      expect(() => AgentCreateParams.parse(inputDataWithNull)).toThrow();

      const inputDataWithUndefined = {
        name: 'Test Agent',
        description: undefined,
      };

      expect(() => AgentCreateParams.parse(inputDataWithUndefined)).toThrow();
    });

    it('should prevent users from overriding id field (strict mode)', () => {
      const inputData = {
        name: 'Test Agent',
        id: 'user-provided-id', // Should be rejected
      };

      expect(() => AgentCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding created_at field (strict mode)', () => {
      const inputData = {
        name: 'Test Agent',

        created_at: '2022-01-01T00:00:00.000Z', // Should be rejected
      };

      expect(() => AgentCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding updated_at field (strict mode)', () => {
      const inputData = {
        name: 'Test Agent',

        updated_at: '2022-01-01T00:00:00.000Z', // Should be rejected
      };

      expect(() => AgentCreateParams.parse(inputData)).toThrow();
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const inputData = {
        name: 'Test Agent',

        extra_field: 'should be rejected',
      };

      expect(() => AgentCreateParams.parse(inputData)).toThrow();
    });

    it('should require all required fields', () => {
      const incompleteData = {
        // Missing name and alias
      };

      expect(() => AgentCreateParams.parse(incompleteData)).toThrow();
    });

    it('should reject empty strings for name and alias', () => {
      const inputData = {
        name: '',
      };

      expect(() => AgentCreateParams.parse(inputData)).toThrow();
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        models: ['gpt-4', 'gpt-3.5-turbo'],
        config: {
          temperature: 0.7,
          max_tokens: 1000,
          stop: ['\n', '###'],
        },
        features: {
          streaming: true,
          functions: false,
        },
        nested: {
          deep: {
            value: 'test',
            number: 42,
            array: [1, 2, 3],
          },
        },
      };

      const inputData = {
        name: 'Test Agent',
        description: 'A test agent',
        metadata: complexMetadata,
      };

      const result = AgentCreateParams.parse(inputData);

      expect(result.metadata).toEqual(complexMetadata);
    });
  });

  describe('AgentUpdateParams Transform', () => {
    it('should not allow extra parameters', () => {
      const inputData = {
        description: 'Updated description',
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => AgentUpdateParams.parse(inputData)).toThrow(
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

    it('should accept updates with description only', () => {
      const inputData = {
        description: 'Updated description',
      };

      const result = AgentUpdateParams.parse(inputData);

      expect(result.description).toBe('Updated description');
      expect(result.metadata).toBeUndefined();
    });

    it('should accept updates with metadata only', () => {
      const newMetadata = { updated: true };
      const inputData = {
        metadata: newMetadata,
      };

      const result = AgentUpdateParams.parse(inputData);

      expect(result.metadata).toEqual(newMetadata);
      expect(result.description).toBeUndefined();
    });

    it('should accept updates with all fields', () => {
      const inputData = {
        description: 'Updated description',
        metadata: { updated: true },
      };

      const result = AgentUpdateParams.parse(inputData);

      expect(result).toEqual({
        description: 'Updated description',
        metadata: { updated: true },
      });
    });

    it('should accept null description', () => {
      const inputData = {
        description: null,
      };

      const result = AgentUpdateParams.parse(inputData);

      expect(result.description).toBeNull();
    });
  });

  describe('AgentQueryParams Validation', () => {
    it('should validate optional id as UUID', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = AgentQueryParams.parse(validParams);
      expect(result.id).toBe(validParams.id);
    });

    it('should validate limit as positive integer', () => {
      const validParams = {
        limit: 50,
      };

      const result = AgentQueryParams.parse(validParams);
      expect(result.limit).toBe(50);
    });

    it('should validate offset as non-negative integer', () => {
      const validParams = {
        offset: 20,
      };

      const result = AgentQueryParams.parse(validParams);
      expect(result.offset).toBe(20);
    });

    it('should reject invalid UUID for id', () => {
      const invalidParams = {
        id: 'not-a-uuid',
      };

      expect(() => AgentQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject negative limit', () => {
      const invalidParams = {
        limit: -10,
      };

      expect(() => AgentQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject zero limit', () => {
      const invalidParams = {
        limit: 0,
      };

      expect(() => AgentQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject negative offset', () => {
      const invalidParams = {
        offset: -5,
      };

      expect(() => AgentQueryParams.parse(invalidParams)).toThrow();
    });

    it('should allow zero offset', () => {
      const validParams = {
        offset: 0,
      };

      const result = AgentQueryParams.parse(validParams);
      expect(result.offset).toBe(0);
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const inputData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        extra_param: 'should be rejected',
      };

      expect(() => AgentQueryParams.parse(inputData)).toThrow();
    });

    it('should accept empty query params', () => {
      const emptyParams = {};

      const result = AgentQueryParams.parse(emptyParams);
      expect(result).toEqual({});
    });

    it('should accept all valid params together', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',

        limit: 25,
        offset: 10,
      };

      const result = AgentQueryParams.parse(validParams);
      expect(result).toEqual(validParams);
    });
  });

  describe('Agent Schema Validation', () => {
    it('should validate complete agent object', () => {
      const validAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Agent',
        description: 'A test agent',

        metadata: { model: 'gpt-4' },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Agent.parse(validAgent);
      expect(result).toEqual(validAgent);
    });

    it('should validate datetime strings with timezone offset', () => {
      const validAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Agent',
        description: 'A test agent',

        metadata: {},
        created_at: '2023-01-01T00:00:00.000+00:00',
        updated_at: '2023-01-02T12:30:45.123-05:00',
      };

      const result = Agent.parse(validAgent);
      expect(result.created_at).toBe('2023-01-01T00:00:00.000+00:00');
      expect(result.updated_at).toBe('2023-01-02T12:30:45.123-05:00');
    });

    it('should reject invalid datetime format', () => {
      const invalidAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Agent',
        description: 'A test agent',

        metadata: {},
        created_at: 'invalid-date',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Agent.parse(invalidAgent)).toThrow();
    });

    it('should reject invalid UUID formats', () => {
      const invalidAgent = {
        id: 'not-a-uuid',
        name: 'Test Agent',
        description: 'A test agent',

        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Agent.parse(invalidAgent)).toThrow();
    });

    it('should require all required fields', () => {
      const incompleteAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing other required fields
      };

      expect(() => Agent.parse(incompleteAgent)).toThrow();
    });

    it('should reject empty strings for required fields', () => {
      const invalidAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: '',
        description: 'A test agent',

        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Agent.parse(invalidAgent)).toThrow();
    });

    it('should require non-null description', () => {
      const invalidAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Agent',
        description: null,

        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Agent.parse(invalidAgent)).toThrow();
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        models: ['gpt-4', 'gpt-3.5-turbo'],
        config: {
          temperature: 0.7,
          max_tokens: 1000,
        },
        features: {
          streaming: true,
        },
      };

      const validAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Agent',
        description: 'A test agent',

        metadata: complexMetadata,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Agent.parse(validAgent);
      expect(result.metadata).toEqual(complexMetadata);
    });
  });
});
