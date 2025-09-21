import {
  Skill,
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data/skill';
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

describe('Skill Data Transforms and Validation', () => {
  const testAgentId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SkillCreateParams Transform', () => {
    it('should default metadata to empty object', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.metadata).toEqual({});
    });

    it('should accept custom metadata', () => {
      const customMetadata = {
        type: 'chat-completion',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
      };

      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: customMetadata,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.metadata).toEqual(customMetadata);
    });

    it('should accept null description', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: null,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.description).toBeNull();
    });

    it('should accept undefined description', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: undefined,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.description).toBeUndefined();
    });

    it('should prevent users from overriding id field (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        id: '123e4567-e89b-12d3-a456-426614174000', // This should be ignored
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding created_at field (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        created_at: '2023-01-01T00:00:00.000Z', // This should be ignored
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding updated_at field (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        updated_at: '2023-01-01T00:00:00.000Z', // This should be ignored
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        extraField: 'should be rejected', // This should cause rejection
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should require all required fields', () => {
      const inputData = {
        // Missing required fields
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should reject empty strings for name', () => {
      const inputData = {
        agent_id: testAgentId,
        name: '', // Empty string should be rejected
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        type: 'chat-completion',
        model: 'gpt-4',
        settings: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000,
        },
        capabilities: ['text-generation', 'conversation'],
        nested: {
          deep: {
            value: 'test',
            number: 42,
            array: [1, 2, 3],
          },
        },
      };

      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: complexMetadata,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.metadata).toEqual(complexMetadata);
    });
  });

  describe('SkillUpdateParams Transform', () => {
    it('should not allow extra parameters', () => {
      const inputData = {
        description: 'My skill description',
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => SkillUpdateParams.parse(inputData)).toThrow(
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

    it('should reject objects with no update fields', () => {
      const inputData = {};

      expect(() => SkillUpdateParams.parse(inputData)).toThrow(
        'At least one field must be provided for update',
      );
    });

    it('should accept updates with description only', () => {
      const inputData = {
        description: 'Updated description',
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.description).toBe('Updated description');
      expect(result.metadata).toBeUndefined();
    });

    it('should accept updates with metadata only', () => {
      const newMetadata = { version: '2.0', updated: true };
      const inputData = {
        metadata: newMetadata,
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.metadata).toEqual(newMetadata);
      expect(result.description).toBeUndefined();
    });

    it('should accept partial updates with multiple fields', () => {
      const inputData = {
        description: 'Updated description',
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.description).toBe('Updated description');
      expect(result.metadata).toBeUndefined();
    });

    it('should handle null description updates', () => {
      const inputData = {
        description: null,
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.description).toBeNull();
    });
  });

  describe('SkillQueryParams Transform', () => {
    it('should accept empty query params', () => {
      const inputData = {};

      const result = SkillQueryParams.parse(inputData);

      expect(result).toEqual({});
    });

    it('should accept id filter', () => {
      const inputData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = SkillQueryParams.parse(inputData);

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should accept name filter', () => {
      const inputData = {
        name: 'Test Skill',
      };

      const result = SkillQueryParams.parse(inputData);

      expect(result.name).toBe('Test Skill');
    });

    it('should accept limit and offset', () => {
      const inputData = {
        limit: 10,
        offset: 20,
      };

      const result = SkillQueryParams.parse(inputData);

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should reject negative offset', () => {
      const inputData = {
        offset: -1,
      };

      expect(() => SkillQueryParams.parse(inputData)).toThrow();
    });

    it('should reject zero or negative limit', () => {
      const inputDataZero = {
        limit: 0,
      };

      const inputDataNegative = {
        limit: -5,
      };

      expect(() => SkillQueryParams.parse(inputDataZero)).toThrow();
      expect(() => SkillQueryParams.parse(inputDataNegative)).toThrow();
    });

    it('should reject non-integer limit and offset', () => {
      const inputDataFloat = {
        limit: 10.5,
        offset: 5.2,
      };

      expect(() => SkillQueryParams.parse(inputDataFloat)).toThrow();
    });

    it('should reject invalid UUID for id', () => {
      const inputData = {
        id: 'invalid-uuid',
      };

      expect(() => SkillQueryParams.parse(inputData)).toThrow();
    });

    it('should reject empty name', () => {
      const inputData = {
        name: '',
      };

      expect(() => SkillQueryParams.parse(inputData)).toThrow();
    });

    it('should reject additional properties (strict mode)', () => {
      const inputData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        extraField: 'should be rejected',
      };

      expect(() => SkillQueryParams.parse(inputData)).toThrow();
    });
  });

  describe('Skill Schema Validation', () => {
    it('should validate a complete skill object', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'A test skill',
        metadata: { type: 'completion' },
        max_configurations: 10,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Skill.parse(skillData);

      expect(result).toEqual(skillData);
    });

    it('should accept null description', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        description: null,
        metadata: {},
        max_configurations: 10,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Skill.parse(skillData);

      expect(result.description).toBeNull();
    });

    it('should accept undefined description', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: {},
        max_configurations: 10,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Skill.parse(skillData);

      expect(result.description).toBeUndefined();
    });

    it('should reject invalid UUIDs', () => {
      const skillData = {
        id: 'invalid-uuid',
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: {},
        max_configurations: 10,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });

    it('should reject empty name', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: '',
        metadata: {},
        max_configurations: 10,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });

    it('should reject invalid datetime strings', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: {},
        max_configurations: 10,
        created_at: 'invalid-date',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });

    it('should require timezone offset in datetime strings', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: {},
        max_configurations: 10,
        created_at: '2023-01-01T00:00:00', // Missing timezone offset
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });
  });
});
