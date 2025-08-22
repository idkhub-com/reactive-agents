import { agentsRouter } from '@server/api/v1/idk/agents';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create a mock UserDataStorageConnector with all required methods
const mockUserDataStorageConnector = {
  // Feedback methods
  getFeedback: vi.fn(),
  createFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
  // Improved response methods
  getImprovedResponse: vi.fn(),
  createImprovedResponse: vi.fn(),
  updateImprovedResponse: vi.fn(),
  deleteImprovedResponse: vi.fn(),
  // Agent methods
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  // Skill methods
  getSkills: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  // Tool methods
  getTools: vi.fn(),
  createTool: vi.fn(),
  deleteTool: vi.fn(),
  // Dataset methods
  getDatasets: vi.fn(),
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  // Data point methods
  getDataPoints: vi.fn(),
  createDataPoints: vi.fn(),
  updateDataPoint: vi.fn(),
  deleteDataPoints: vi.fn(),
  // Evaluation run methods
  getEvaluationRuns: vi.fn(),
  createEvaluationRun: vi.fn(),
  updateEvaluationRun: vi.fn(),
  deleteEvaluationRun: vi.fn(),
  // Data point output methods
  getDataPointOutputs: vi.fn(),
  createDataPointOutput: vi.fn(),
  deleteDataPointOutput: vi.fn(),
};

// Create a test app with the middleware that injects the mock connector
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('user_data_storage_connector', mockUserDataStorageConnector);
    await next();
  })
  .route('/', agentsRouter);

describe('Agents API Status Codes', () => {
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 on successful fetch', async () => {
      const mockAgents = [{ id: '1', name: 'test-agent' }];
      mockUserDataStorageConnector.getAgents.mockResolvedValue(mockAgents);

      const res = await client.index.$get({
        query: { name: 'test' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockAgents);
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getAgents.mockRejectedValue(
        new Error('DB error'),
      );

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch agents' });
    });
  });

  describe('PATCH /:agentId', () => {
    it('should return 200 on successful update', async () => {
      const mockAgent = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'test-agent',
        description: 'updated description',
      };
      mockUserDataStorageConnector.updateAgent.mockResolvedValue(mockAgent);

      const res = await client[':agentId'].$patch({
        param: { agentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
        json: { description: 'updated description' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockAgent);
    });

    it('should return 500 on update error', async () => {
      mockUserDataStorageConnector.updateAgent.mockRejectedValue(
        new Error('Update failed'),
      );

      const res = await client[':agentId'].$patch({
        param: { agentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
        json: { description: 'updated description' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to update agent' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':agentId'].$patch({
        param: { agentId: 'invalid-uuid' },
        json: { description: 'updated description' },
      });

      expect(res.status).toBe(400);
      expect(mockUserDataStorageConnector.updateAgent).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:agentId', () => {
    it('should return 204 on successful deletion', async () => {
      mockUserDataStorageConnector.deleteAgent.mockResolvedValue(undefined);

      const res = await client[':agentId'].$delete({
        param: { agentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockUserDataStorageConnector.deleteAgent.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':agentId'].$delete({
        param: { agentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to delete agent' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':agentId'].$delete({
        param: { agentId: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
      expect(mockUserDataStorageConnector.deleteAgent).not.toHaveBeenCalled();
    });
  });

  describe('GET /:agentId/skills', () => {
    it('should return 200 on successful fetch', async () => {
      const mockSkills = [{ id: '1', name: 'test-skill' }];
      mockUserDataStorageConnector.getSkills.mockResolvedValue(mockSkills);

      const res = await client[':agentId'].skills.$get({
        param: { agentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockSkills);
      expect(mockUserDataStorageConnector.getSkills).toHaveBeenCalledWith({
        agent_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      });
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getSkills.mockRejectedValue(
        new Error('Fetch failed'),
      );

      const res = await client[':agentId'].skills.$get({
        param: { agentId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch skills' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':agentId'].skills.$get({
        param: { agentId: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
      expect(mockUserDataStorageConnector.getSkills).not.toHaveBeenCalled();
    });
  });
});
