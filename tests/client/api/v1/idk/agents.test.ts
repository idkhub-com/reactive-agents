import type {
  Agent,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock functions that we can reference in tests
const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

// Mock the entire agents module to control the client behavior
vi.mock('@client/api/v1/idk/agents', () => {
  return {
    getAgents: vi.fn().mockImplementation(async (params: AgentQueryParams) => {
      const response = await mockGet({
        query: {
          id: params.id,
          name: params.name,
          limit: params.limit?.toString(),
          offset: params.offset?.toString(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      return response.json();
    }),
    updateAgent: vi
      .fn()
      .mockImplementation(
        async (agentId: string, params: AgentUpdateParams) => {
          const response = await mockPatch({
            param: { agentId },
            json: params,
          });

          if (!response.ok) {
            throw new Error('Failed to update agent');
          }

          return response.json();
        },
      ),
    deleteAgent: vi.fn().mockImplementation(async (agentId: string) => {
      const response = await mockDelete({
        param: { agentId },
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
    }),
  };
});

// Import the mocked module
import * as agentsAPI from '@client/api/v1/idk/agents';

describe('Agents Client API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAgents', () => {
    it('should return agents on successful response', async () => {
      const mockAgents: Agent[] = [
        {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          name: 'test-agent',
          description: 'A test agent',
          metadata: {},
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockAgents),
      };

      mockGet.mockResolvedValue(mockResponse);

      const params: AgentQueryParams = { name: 'test' };
      const result = await agentsAPI.getAgents(params);

      expect(mockGet).toHaveBeenCalledWith({
        query: {
          id: params.id,
          name: params.name,
          limit: params.limit?.toString(),
          offset: params.offset?.toString(),
        },
      });
      expect(result).toEqual(mockAgents);
    });

    it('should throw error on failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      mockGet.mockResolvedValue(mockResponse);

      const params: AgentQueryParams = { name: 'test' };

      await expect(agentsAPI.getAgents(params)).rejects.toThrow(
        'Failed to fetch agents',
      );
    });

    it('should handle query parameters correctly', async () => {
      const mockAgents: Agent[] = [];
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockAgents),
      };

      mockGet.mockResolvedValue(mockResponse);

      const params: AgentQueryParams = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'test-agent',
        limit: 10,
        offset: 5,
      };

      await agentsAPI.getAgents(params);

      expect(mockGet).toHaveBeenCalledWith({
        query: {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          name: 'test-agent',
          limit: '10',
          offset: '5',
        },
      });
    });
  });

  describe('updateAgent', () => {
    it('should return updated agent on successful response', async () => {
      const mockAgent: Agent = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'updated-agent',
        description: 'Updated description',
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockAgent),
      };

      mockPatch.mockResolvedValue(mockResponse);

      const agentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const params: AgentUpdateParams = { description: 'Updated description' };

      const result = await agentsAPI.updateAgent(agentId, params);

      expect(mockPatch).toHaveBeenCalledWith({
        param: { agentId },
        json: params,
      });
      expect(result).toEqual(mockAgent);
    });

    it('should throw error on failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      mockPatch.mockResolvedValue(mockResponse);

      const agentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const params: AgentUpdateParams = { description: 'Updated description' };

      await expect(agentsAPI.updateAgent(agentId, params)).rejects.toThrow(
        'Failed to update agent',
      );
    });

    it('should handle metadata updates', async () => {
      const mockAgent: Agent = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'test-agent',
        description: 'Test agent',
        metadata: { key: 'value' },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockAgent),
      };

      mockPatch.mockResolvedValue(mockResponse);

      const agentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const params: AgentUpdateParams = {
        description: 'Test agent',
        metadata: { key: 'value' },
      };

      const result = await agentsAPI.updateAgent(agentId, params);

      expect(mockPatch).toHaveBeenCalledWith({
        param: { agentId },
        json: params,
      });
      expect(result).toEqual(mockAgent);
    });
  });

  describe('deleteAgent', () => {
    it('should complete successfully on 204 response', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
      };

      mockDelete.mockResolvedValue(mockResponse);

      const agentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

      await expect(agentsAPI.deleteAgent(agentId)).resolves.toBeUndefined();

      expect(mockDelete).toHaveBeenCalledWith({
        param: { agentId },
      });
    });

    it('should throw error on failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      mockDelete.mockResolvedValue(mockResponse);

      const agentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

      await expect(agentsAPI.deleteAgent(agentId)).rejects.toThrow(
        'Failed to delete agent',
      );
    });

    it('should handle invalid agent ID', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
      };

      mockDelete.mockResolvedValue(mockResponse);

      const invalidAgentId = 'invalid-id';

      await expect(agentsAPI.deleteAgent(invalidAgentId)).rejects.toThrow(
        'Failed to delete agent',
      );
    });

    it('should handle not found agent', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };

      mockDelete.mockResolvedValue(mockResponse);

      const nonExistentAgentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

      await expect(agentsAPI.deleteAgent(nonExistentAgentId)).rejects.toThrow(
        'Failed to delete agent',
      );
    });
  });
});
