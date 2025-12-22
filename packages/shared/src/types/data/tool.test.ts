import {
  Tool,
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import { describe, expect, it } from 'vitest';

describe('Tool types', () => {
  describe('Tool schema', () => {
    it('should validate a valid tool object', () => {
      const validTool = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(validTool)).not.toThrow();
      const parsed = Tool.parse(validTool);
      expect(parsed).toEqual(validTool);
    });

    it('should reject tool with invalid UUID for id', () => {
      const invalidTool = {
        id: 'invalid-uuid',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(invalidTool)).toThrow();
    });

    it('should reject tool with invalid UUID for agent_id', () => {
      const invalidTool = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: 'invalid-uuid',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(invalidTool)).toThrow();
    });

    it('should reject tool with empty hash', () => {
      const invalidTool = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: '',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(invalidTool)).toThrow();
    });

    it('should reject tool with empty type', () => {
      const invalidTool = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: '',
        name: 'test_function',
        raw_data: { key: 'value' },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(invalidTool)).toThrow();
    });

    it('should reject tool with empty name', () => {
      const invalidTool = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: '',
        raw_data: { key: 'value' },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(invalidTool)).toThrow();
    });

    it('should reject tool with invalid datetime for created_at', () => {
      const invalidTool = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
        created_at: 'invalid-date',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      expect(() => Tool.parse(invalidTool)).toThrow();
    });
  });

  describe('ToolQueryParams schema', () => {
    it('should validate empty query params', () => {
      const emptyParams = {};
      expect(() => ToolQueryParams.parse(emptyParams)).not.toThrow();
    });

    it('should validate query params with all optional fields', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        limit: 10,
        offset: 0,
      };

      expect(() => ToolQueryParams.parse(validParams)).not.toThrow();
      const parsed = ToolQueryParams.parse(validParams);
      expect(parsed).toEqual(validParams);
    });

    it('should reject invalid UUID for id', () => {
      const invalidParams = {
        id: 'invalid-uuid',
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject invalid UUID for agent_id', () => {
      const invalidParams = {
        agent_id: 'invalid-uuid',
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject negative limit', () => {
      const invalidParams = {
        limit: -1,
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject zero limit', () => {
      const invalidParams = {
        limit: 0,
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject negative offset', () => {
      const invalidParams = {
        offset: -1,
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should allow zero offset', () => {
      const validParams = {
        offset: 0,
      };

      expect(() => ToolQueryParams.parse(validParams)).not.toThrow();
    });

    it('should reject empty hash', () => {
      const invalidParams = {
        hash: '',
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject empty type', () => {
      const invalidParams = {
        type: '',
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject empty name', () => {
      const invalidParams = {
        name: '',
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });

    it('should reject extra fields due to strict mode', () => {
      const invalidParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        extra_field: 'should not be allowed',
      };

      expect(() => ToolQueryParams.parse(invalidParams)).toThrow();
    });
  });

  describe('ToolCreateParams schema', () => {
    it('should validate valid create params', () => {
      const validParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value', nested: { prop: 123 } },
      };

      expect(() => ToolCreateParams.parse(validParams)).not.toThrow();
      const parsed = ToolCreateParams.parse(validParams);
      expect(parsed).toEqual(validParams);
    });

    it('should reject missing required agent_id', () => {
      const invalidParams = {
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });

    it('should reject missing required hash', () => {
      const invalidParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });

    it('should reject missing required type', () => {
      const invalidParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        name: 'test_function',
        raw_data: { key: 'value' },
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });

    it('should reject missing required name', () => {
      const invalidParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        raw_data: { key: 'value' },
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });

    it('should reject missing required raw_data', () => {
      const invalidParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });

    it('should reject invalid UUID for agent_id', () => {
      const invalidParams = {
        agent_id: 'invalid-uuid',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });

    it('should reject extra fields due to strict mode', () => {
      const invalidParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { key: 'value' },
        extra_field: 'should not be allowed',
      };

      expect(() => ToolCreateParams.parse(invalidParams)).toThrow();
    });
  });

  describe('Complex raw_data validation', () => {
    it('should accept nested objects in raw_data', () => {
      const validParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: {
          function: {
            name: 'test_function',
            parameters: {
              type: 'object',
              properties: {
                param1: { type: 'string' },
                param2: { type: 'number' },
              },
            },
          },
          metadata: {
            version: '1.0',
            tags: ['test', 'function'],
          },
        },
      };

      expect(() => ToolCreateParams.parse(validParams)).not.toThrow();
    });

    it('should accept arrays in raw_data', () => {
      const validParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: {
          tools: [
            { name: 'tool1', type: 'function' },
            { name: 'tool2', type: 'computer' },
          ],
        },
      };

      expect(() => ToolCreateParams.parse(validParams)).not.toThrow();
    });

    it('should accept mixed types in raw_data', () => {
      const validParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: {
          string_prop: 'value',
          number_prop: 42,
          boolean_prop: true,
          null_prop: null,
          array_prop: [1, 2, 3],
          object_prop: { nested: 'value' },
        },
      };

      expect(() => ToolCreateParams.parse(validParams)).not.toThrow();
    });
  });
});
