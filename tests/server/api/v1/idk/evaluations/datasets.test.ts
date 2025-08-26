import { datasetsRouter } from '@server/api/v1/idk/evaluations/datasets';
import type { AppEnv } from '@server/types/hono';
import { HttpMethod } from '@server/types/http';
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
  // Tool methods (required by interface)
  getTools: vi.fn(),
  createTool: vi.fn(),
  deleteTool: vi.fn(),
  // Dataset methods (required by interface)
  getDatasets: vi.fn(),
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  // Data point methods (required by interface)
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

  describe('GET /:datasetId/data-points', () => {
    it('should return 200 on successful fetch', async () => {
      const mockDataPoints = [
        {
          id: 'e7f8a9b0-c1d2-4456-9789-0abcdef03456',
          method: 'GET',
          endpoint: '/test',
        },
      ];
      mockUserDataStorageConnector.getDataPoints.mockResolvedValue(
        mockDataPoints,
      );

      const res = await client[':datasetId']['data-points'].$get({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {},
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockDataPoints);
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getDataPoints.mockRejectedValue(
        new Error('Fetch failed'),
      );

      const res = await client[':datasetId']['data-points'].$get({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {},
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch data points' });
    });
  });

  describe('POST /:datasetId/data-points', () => {
    it('should return 201 on successful creation', async () => {
      const mockDataPoints = [
        {
          id: 'e7f8a9b0-c1d2-4456-9789-0abcdef03456',
          method: 'GET',
          endpoint: '/test',
        },
      ];
      mockUserDataStorageConnector.createDataPoints.mockResolvedValue(
        mockDataPoints,
      );

      const res = await client[':datasetId']['data-points'].$post({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: [
          {
            endpoint: '/test',
            metadata: {},
            function_name: 'test',
            method: HttpMethod.GET,
            is_golden: false,
            request_body: {},
          },
        ],
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockDataPoints);
    });

    it('should return 500 on creation error', async () => {
      mockUserDataStorageConnector.createDataPoints.mockRejectedValue(
        new Error('Create failed'),
      );

      const res = await client[':datasetId']['data-points'].$post({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: [
          {
            endpoint: '/test',
            metadata: {},
            function_name: 'test',
            method: HttpMethod.GET,
            is_golden: false,
            request_body: {},
          },
        ],
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to create data points' });
    });
  });

  describe('DELETE /:datasetId/data-points', () => {
    it('should return 204 on successful deletion', async () => {
      mockUserDataStorageConnector.deleteDataPoints.mockResolvedValue(
        undefined,
      );

      const res = await client[':datasetId']['data-points'].$delete({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: { dataPointIds: ['c13d1678-150a-466b-804f-ecc82de3680e'] },
      });

      if (res.status !== 204) {
        console.log('DELETE success response status:', res.status);
        console.log('DELETE success response body:', await res.text());
      }
      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockUserDataStorageConnector.deleteDataPoints.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':datasetId']['data-points'].$delete({
        param: { datasetId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: { dataPointIds: ['c13d1678-150a-466b-804f-ecc82de3680e'] },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to delete data point' });
    });
  });
});
