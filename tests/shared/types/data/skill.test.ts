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
    it('should accept valid skill creation parameters', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.metadata).toEqual({});
      expect(result.description).toBe(
        'This is a test skill description with sufficient length',
      );
    });

    it('should accept custom metadata with optional fields', () => {
      const customMetadata = {
        last_clustering_at: '2023-01-01T00:00:00.000Z',
        last_clustering_log_start_time: 1234567890,
      };

      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: customMetadata,
        optimize: false,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.metadata).toEqual(customMetadata);
    });

    it('should reject description that is too short', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'Too short',
        metadata: {},
        optimize: false,
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should accept minimum length description', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This has exactly 25 chars',
        metadata: {},
        optimize: false,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.description).toBe('This has exactly 25 chars');
    });

    it('should prevent users from overriding id field (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
        id: '123e4567-e89b-12d3-a456-426614174000', // This should be ignored
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding created_at field (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
        created_at: '2023-01-01T00:00:00.000Z', // This should be ignored
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should prevent users from overriding updated_at field (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
        updated_at: '2023-01-01T00:00:00.000Z', // This should be ignored
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should reject objects with additional properties (strict mode)', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
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
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
      };

      expect(() => SkillCreateParams.parse(inputData)).toThrow();
    });

    it('should accept metadata with all optional fields', () => {
      const fullMetadata = {
        last_clustering_at: '2023-01-01T00:00:00.000Z',
        last_clustering_log_start_time: 1234567890,
      };

      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: fullMetadata,
        optimize: false,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.metadata).toEqual(fullMetadata);
    });

    it('should accept default values for configuration_count and system_prompt_count', () => {
      const inputData = {
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'This is a test skill description with sufficient length',
        metadata: {},
        optimize: false,
      };

      const result = SkillCreateParams.parse(inputData);

      expect(result.configuration_count).toBe(3);
      expect(result.system_prompt_count).toBe(3);
      expect(result.clustering_interval).toBe(15);
      expect(result.reflection_min_requests_per_arm).toBe(3);
    });
  });

  describe('SkillUpdateParams Transform', () => {
    it('should not allow extra parameters', () => {
      const inputData = {
        description: 'My skill description with sufficient length for testing',
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => SkillUpdateParams.parse(inputData)).toThrow();
    });

    it('should reject objects with no update fields', () => {
      const inputData = {};

      expect(() => SkillUpdateParams.parse(inputData)).toThrow(
        'At least one field must be provided for update',
      );
    });

    it('should accept updates with description only', () => {
      const inputData = {
        description:
          'Updated description with sufficient length for validation',
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.description).toBe(
        'Updated description with sufficient length for validation',
      );
      expect(result.metadata).toBeUndefined();
    });

    it('should accept updates with metadata only', () => {
      const newMetadata = {
        last_clustering_at: '2023-02-01T00:00:00.000Z',
      };
      const inputData = {
        metadata: newMetadata,
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.metadata).toEqual(newMetadata);
      expect(result.description).toBeUndefined();
    });

    it('should accept partial updates with multiple fields', () => {
      const inputData = {
        description:
          'Updated description with sufficient length for validation',
        configuration_count: 5,
      };

      const result = SkillUpdateParams.parse(inputData);

      expect(result.description).toBe(
        'Updated description with sufficient length for validation',
      );
      expect(result.configuration_count).toBe(5);
      expect(result.metadata).toBeUndefined();
    });

    it('should reject description that is too short', () => {
      const inputData = {
        description: 'Too short',
      };

      expect(() => SkillUpdateParams.parse(inputData)).toThrow();
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
        description: 'A test skill with sufficient description length',
        metadata: {},
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Skill.parse(skillData);

      expect(result).toEqual(skillData);
    });

    it('should validate skill with metadata fields', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'A test skill with sufficient description length',
        metadata: {
          last_clustering_at: '2023-01-01T00:00:00.000Z',
          last_clustering_log_start_time: 1234567890,
        },
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Skill.parse(skillData);

      expect(result.metadata.last_clustering_at).toBe(
        '2023-01-01T00:00:00.000Z',
      );
      expect(result.metadata.last_clustering_log_start_time).toBe(1234567890);
    });

    it('should require description field', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        metadata: {},
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });

    it('should reject invalid UUIDs', () => {
      const skillData = {
        id: 'invalid-uuid',
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'A test skill with sufficient description length',
        metadata: {},
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });

    it('should accept empty name from database', () => {
      // Note: Skill schema (for reading from DB) allows empty names,
      // but SkillCreateParams (for creation) does not
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: '',
        description: 'A test skill with sufficient description length',
        metadata: {},
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const result = Skill.parse(skillData);

      expect(result.name).toBe('');
    });

    it('should reject invalid datetime strings', () => {
      const skillData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'Test Skill',
        description: 'A test skill with sufficient description length',
        metadata: {},
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
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
        description: 'A test skill with sufficient description length',
        metadata: {},
        optimize: false,
        configuration_count: 10,
        system_prompt_count: 5,
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        created_at: '2023-01-01T00:00:00', // Missing timezone offset
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      expect(() => Skill.parse(skillData)).toThrow();
    });
  });
});
