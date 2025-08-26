import { skillsRouter } from '@server/api/v1/idk/skills';
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
  .route('/', skillsRouter);

describe('Skills API Status Codes', () => {
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('should return 201 on successful creation', async () => {
      const mockSkill = {
        id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        name: 'test-skill',
        description: 'Test skill description',
        metadata: { test: true },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };
      mockUserDataStorageConnector.createSkill.mockResolvedValue(mockSkill);

      const res = await client.index.$post({
        json: {
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          name: 'test-skill',
          description: 'Test skill description',
          metadata: { test: true },
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockSkill);
    });

    it('should return 500 on creation error', async () => {
      mockUserDataStorageConnector.createSkill.mockRejectedValue(
        new Error('Creation failed'),
      );

      const res = await client.index.$post({
        json: {
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          name: 'test-skill',
          metadata: {},
        },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to create skill' });
    });

    it('should return 400 for invalid input', async () => {
      const res = await client.index.$post({
        // @ts-expect-error - Intentionally invalid input for testing
        json: {
          // Missing required agent_id field
          name: 'test-skill',
        },
      });

      expect(res.status).toBe(400);
      expect(mockUserDataStorageConnector.createSkill).not.toHaveBeenCalled();
    });
  });

  describe('GET /', () => {
    it('should return 200 on successful fetch', async () => {
      const mockSkills = [
        {
          id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          name: 'test-skill',
          description: 'Test skill description',
          metadata: { test: true },
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];
      mockUserDataStorageConnector.getSkills.mockResolvedValue(mockSkills);

      const res = await client.index.$get({
        query: {
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          limit: '10',
          offset: '0',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockSkills);
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getSkills.mockRejectedValue(
        new Error('DB error'),
      );

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch skills' });
    });
  });

  describe('PATCH /:skillId', () => {
    it('should return 200 on successful update', async () => {
      const mockSkill = {
        id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        name: 'test-skill',
        description: 'updated description',
        metadata: { test: true },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
      };
      mockUserDataStorageConnector.updateSkill.mockResolvedValue(mockSkill);

      const res = await client[':skillId'].$patch({
        param: { skillId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: { description: 'updated description' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockSkill);
    });

    it('should return 500 on update error', async () => {
      mockUserDataStorageConnector.updateSkill.mockRejectedValue(
        new Error('Update failed'),
      );

      const res = await client[':skillId'].$patch({
        param: { skillId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: { description: 'updated description' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to update skill' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':skillId'].$patch({
        param: { skillId: 'invalid-uuid' },
        json: { description: 'updated description' },
      });

      expect(res.status).toBe(400);
      expect(mockUserDataStorageConnector.updateSkill).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:skillId', () => {
    it('should return 204 on successful deletion', async () => {
      mockUserDataStorageConnector.deleteSkill.mockResolvedValue(undefined);

      const res = await client[':skillId'].$delete({
        param: { skillId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockUserDataStorageConnector.deleteSkill.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':skillId'].$delete({
        param: { skillId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to delete skill' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':skillId'].$delete({
        param: { skillId: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
      expect(mockUserDataStorageConnector.deleteSkill).not.toHaveBeenCalled();
    });
  });
});
