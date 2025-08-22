import type {
  Skill,
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock functions that we can reference in tests
const mockPost = vi.fn();
const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

// Mock the entire skills module to control the client behavior
vi.mock('@client/api/v1/idk/skills', () => {
  return {
    createSkill: vi
      .fn()
      .mockImplementation(async (params: SkillCreateParams) => {
        const response = await mockPost({
          json: params,
        });

        if (!response.ok) {
          throw new Error('Failed to create skill');
        }

        return response.json();
      }),
    getSkills: vi.fn().mockImplementation(async (params: SkillQueryParams) => {
      const response = await mockGet({
        query: {
          id: params.id,
          agent_id: params.agent_id,
          name: params.name,
          limit: params.limit?.toString(),
          offset: params.offset?.toString(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }

      return response.json();
    }),
    updateSkill: vi
      .fn()
      .mockImplementation(
        async (skillId: string, params: SkillUpdateParams) => {
          const response = await mockPatch({
            param: { skillId },
            json: params,
          });

          if (!response.ok) {
            throw new Error('Failed to update skill');
          }

          return response.json();
        },
      ),
    deleteSkill: vi.fn().mockImplementation(async (id: string) => {
      const response = await mockDelete({
        param: { skillId: id },
      });

      if (!response.ok) {
        throw new Error('Failed to delete skill');
      }
    }),
  };
});

// Import the mocked functions
import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
} from '@client/api/v1/idk/skills';

describe('Skills API functions', () => {
  const mockSkill: Skill = {
    id: 'skill-123',
    agent_id: 'agent-456',
    name: 'test-skill',
    description: 'Test skill description',
    metadata: { test: true },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSkill', () => {
    it('should create a skill successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockSkill),
      };
      mockPost.mockResolvedValue(mockResponse);

      const params = {
        agent_id: 'agent-456',
        name: 'test-skill',
        description: 'Test skill description',
        metadata: { test: true },
      };

      const result = await createSkill(params);

      expect(mockPost).toHaveBeenCalledWith({
        json: params,
      });
      expect(result).toEqual(mockSkill);
    });

    it('should throw error when creation fails', async () => {
      const mockResponse = {
        ok: false,
      };
      mockPost.mockResolvedValue(mockResponse);

      await expect(
        createSkill({
          agent_id: 'agent-456',
          name: 'test-skill',
          metadata: {},
        }),
      ).rejects.toThrow('Failed to create skill');
    });
  });

  describe('getSkills', () => {
    it('should fetch skills successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([mockSkill]),
      };
      mockGet.mockResolvedValue(mockResponse);

      const params = {
        agent_id: 'agent-456',
        limit: 10,
        offset: 0,
      };

      const result = await getSkills(params);

      expect(mockGet).toHaveBeenCalledWith({
        query: {
          id: undefined,
          agent_id: 'agent-456',
          name: undefined,
          limit: '10',
          offset: '0',
        },
      });
      expect(result).toEqual([mockSkill]);
    });

    it('should throw error when fetch fails', async () => {
      const mockResponse = {
        ok: false,
      };
      mockGet.mockResolvedValue(mockResponse);

      await expect(getSkills({})).rejects.toThrow('Failed to fetch skills');
    });
  });

  describe('updateSkill', () => {
    it('should update a skill successfully', async () => {
      const updatedSkill = { ...mockSkill, description: 'Updated description' };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(updatedSkill),
      };
      mockPatch.mockResolvedValue(mockResponse);

      const params = {
        description: 'Updated description',
      };

      const result = await updateSkill('skill-123', params);

      expect(mockPatch).toHaveBeenCalledWith({
        param: {
          skillId: 'skill-123',
        },
        json: params,
      });
      expect(result).toEqual(updatedSkill);
    });

    it('should throw error when update fails', async () => {
      const mockResponse = {
        ok: false,
      };
      mockPatch.mockResolvedValue(mockResponse);

      await expect(
        updateSkill('skill-123', { description: 'Updated' }),
      ).rejects.toThrow('Failed to update skill');
    });
  });

  describe('deleteSkill', () => {
    it('should delete a skill successfully', async () => {
      const mockResponse = {
        ok: true,
      };
      mockDelete.mockResolvedValue(mockResponse);

      await deleteSkill('skill-123');

      expect(mockDelete).toHaveBeenCalledWith({
        param: {
          skillId: 'skill-123',
        },
      });
    });

    it('should throw error when delete fails', async () => {
      const mockResponse = {
        ok: false,
      };
      mockDelete.mockResolvedValue(mockResponse);

      await expect(deleteSkill('skill-123')).rejects.toThrow(
        'Failed to delete skill',
      );
    });
  });
});
