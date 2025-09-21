import { datasetsRouter } from '@server/api/v1/idk/evaluations/datasets';
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
  // Improved response methods (required by interface)
  getImprovedResponse: vi.fn(),
  createImprovedResponse: vi.fn(),
  updateImprovedResponse: vi.fn(),
  deleteImprovedResponse: vi.fn(),
  // Agent methods (required by interface)
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  // Skill methods (required by interface)
  getSkills: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  // System prompt methods
  getSystemPrompts: vi.fn(),
  createSystemPrompt: vi.fn(),
  updateSystemPrompt: vi.fn(),
  deleteSystemPrompt: vi.fn(),
  // Skill configuration methods
  getSkillConfigurations: vi.fn(),
  createSkillConfiguration: vi.fn(),
  updateSkillConfiguration: vi.fn(),
  deleteSkillConfiguration: vi.fn(),
  // Tool methods (required by interface)
  getTools: vi.fn(),
  createTool: vi.fn(),
  deleteTool: vi.fn(),
  // Dataset methods (required by interface)
  getDatasets: vi.fn(),
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  // Log methods (migrated from datapoints)
  getLogs: vi.fn(),
  deleteLog: vi.fn(),
  getDatasetLogs: vi.fn(),
  addLogsToDataset: vi.fn(),
  removeLogsFromDataset: vi.fn(),

  // Evaluation run methods
  getEvaluationRuns: vi.fn(),
  createEvaluationRun: vi.fn(),
  updateEvaluationRun: vi.fn(),
  deleteEvaluationRun: vi.fn(),

  // Log output methods (migrated from data point outputs)
  getLogOutputs: vi.fn(),
  createLogOutput: vi.fn(),
  deleteLogOutput: vi.fn(),
  // AI Provider API Key methods
  getAIProviderAPIKeys: vi.fn(),
  getAIProviderAPIKeyById: vi.fn(),
  createAIProviderAPIKey: vi.fn(),
  updateAIProviderAPIKey: vi.fn(),
  deleteAIProviderAPIKey: vi.fn(),
  // Model methods
  getModels: vi.fn(),
  getModelById: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  // Skill-Model relationship methods
  getModelsBySkillId: vi.fn(),
  getSkillsByModelId: vi.fn(),
  addModelsToSkill: vi.fn(),
  removeModelsFromSkill: vi.fn(),
};

// Create a test app with the middleware that injects the mock connector
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('user_data_storage_connector', mockUserDataStorageConnector);
    await next();
  })
  .route('/', datasetsRouter);

describe('Datasets API Status Codes', () => {
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 on successful fetch', async () => {
      const mockDatasets = [
        { id: 'c5d6e7f8-a9b0-4234-9567-890abcdef034', name: 'test' },
      ];
      mockUserDataStorageConnector.getDatasets.mockResolvedValue(mockDatasets);

      const res = await client.index.$get({
        query: { name: 'test' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockDatasets);
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getDatasets.mockRejectedValue(
        new Error('DB error'),
      );

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch datasets' });
    });
  });

  describe('POST /', () => {
    it('should return 201 on successful creation', async () => {
      const mockDataset = {
        id: 'd6e7f8a9-b0c1-4345-9678-90abcdef0345',
        name: 'new dataset',
      };
      mockUserDataStorageConnector.createDataset.mockResolvedValue(mockDataset);

      const res = await client.index.$post({
        json: {
          name: 'new dataset',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          metadata: {},
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockDataset);
    });

    it('should return 500 on creation error', async () => {
      mockUserDataStorageConnector.createDataset.mockRejectedValue(
        new Error('Create failed'),
      );

      const res = await client.index.$post({
        json: {
          name: 'new dataset',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          metadata: {},
        },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to create dataset' });
    });
  });

  describe('PATCH /:datasetId', () => {
    it('should return 200 on successful update', async () => {
      const mockDataset = { id: 'valid-uuid', name: 'updated dataset' };
      mockUserDataStorageConnector.updateDataset.mockResolvedValue(mockDataset);

      const res = await client[':datasetId'].$patch({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: { name: 'updated dataset' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockDataset);
    });

    it('should return 500 on update error', async () => {
      mockUserDataStorageConnector.updateDataset.mockRejectedValue(
        new Error('Update failed'),
      );

      const res = await client[':datasetId'].$patch({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: { name: 'updated dataset' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to update dataset' });
    });
  });

  describe('DELETE /:datasetId', () => {
    it('should return 204 on successful deletion', async () => {
      mockUserDataStorageConnector.deleteDataset.mockResolvedValue(undefined);

      const res = await client[':datasetId'].$delete({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockUserDataStorageConnector.deleteDataset.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':datasetId'].$delete({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to delete dataset' });
    });
  });

  describe('GET /:datasetId/logs', () => {
    it('should return 200 on successful fetch', async () => {
      const mockLogs = [
        {
          id: 'e7f8a9b0-c1d2-4456-9789-0abcdef03456',
          method: 'GET',
          endpoint: '/test',
        },
      ];
      mockUserDataStorageConnector.getDatasetLogs.mockResolvedValue(mockLogs);

      const res = await client[':datasetId'].logs.$get({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {},
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockLogs);
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getDatasetLogs.mockRejectedValue(
        new Error('Fetch failed'),
      );

      const res = await client[':datasetId'].logs.$get({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {},
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch logs' });
    });
  });

  describe('POST /:datasetId/logs', () => {
    it('should return 201 on successful addition', async () => {
      mockUserDataStorageConnector.addLogsToDataset.mockResolvedValue(
        undefined,
      );

      const res = await client[':datasetId'].logs.$post({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: {
          logIds: ['e7f8a9b0-c1d2-4456-9789-0abcdef03456'],
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual({ success: true });
    });

    it('should return 500 on creation error', async () => {
      mockUserDataStorageConnector.addLogsToDataset.mockRejectedValue(
        new Error('Add failed'),
      );

      const res = await client[':datasetId'].logs.$post({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: {
          logIds: ['e7f8a9b0-c1d2-4456-9789-0abcdef03456'],
        },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to add logs to dataset' });
    });
  });

  describe('DELETE /:datasetId/logs', () => {
    it('should return 204 on successful deletion', async () => {
      mockUserDataStorageConnector.removeLogsFromDataset.mockResolvedValue(
        undefined,
      );

      const res = await client[':datasetId'].logs.$delete({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: { logIds: ['c13d1678-150a-466b-804f-ecc82de3680e'] },
      });

      if (res.status !== 204) {
        console.log('DELETE success response status:', res.status);
        console.log('DELETE success response body:', await res.text());
      }
      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockUserDataStorageConnector.removeLogsFromDataset.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':datasetId'].logs.$delete({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: { logIds: ['c13d1678-150a-466b-804f-ecc82de3680e'] },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to delete logs' });
    });
  });
});
