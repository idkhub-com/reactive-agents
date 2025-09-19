import { runsRouter } from '@server/api/v1/idk/evaluations/runs';
import type { AppEnv } from '@server/types/hono';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mockConnector = {
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
  // Tool methods
  getTools: vi.fn(),
  createTool: vi.fn(),
  deleteTool: vi.fn(),
  // Dataset methods
  getDatasets: vi.fn(),
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  // Dataset logs methods
  getDatasetLogs: vi.fn(),
  addLogsToDataset: vi.fn(),
  removeLogsFromDataset: vi.fn(),
  // Log methods
  getLogs: vi.fn(),
  createLogs: vi.fn(),
  updateLog: vi.fn(),
  deleteLogs: vi.fn(),
  deleteLog: vi.fn(),
  // Evaluation run methods
  getEvaluationRuns: vi.fn(),
  createEvaluationRun: vi.fn(),
  updateEvaluationRun: vi.fn(),
  deleteEvaluationRun: vi.fn(),
  // Log output methods
  getLogOutputs: vi.fn(),
  createLogOutput: vi.fn(),
  deleteLogOutput: vi.fn(),
  // AI Provider API Key methods
  getAIProviderAPIKeys: vi.fn(),
  createAIProviderAPIKey: vi.fn(),
  updateAIProviderAPIKey: vi.fn(),
  deleteAIProviderAPIKey: vi.fn(),
};

const mockEvaluationConnector = {
  getDetails: vi.fn().mockReturnValue({
    method: EvaluationMethodName.TURN_RELEVANCY,
    name: 'Turn Relevancy',
    description: 'Test evaluation method',
  }),
  evaluate: vi.fn(),
  evaluateOneLog: vi.fn(),
  getParameterSchema: z.object({}),
};

const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('user_data_storage_connector', mockConnector);
    c.set('evaluation_connectors_map', {
      [EvaluationMethodName.TURN_RELEVANCY]: mockEvaluationConnector,
    });
    await next();
  })
  .route('/', runsRouter);

describe('Evaluation Runs API Status Codes', () => {
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 on successful fetch', async () => {
      const mockRuns = [
        { id: 'f8a9b0c1-d2e3-4567-8890-123456789def', name: 'test-run' },
      ];
      mockConnector.getEvaluationRuns.mockResolvedValue(mockRuns);

      const res = await client.index.$get({
        query: { name: 'test' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockRuns);
    });

    it('should return 200 with empty query', async () => {
      const mockRuns = [
        { id: 'f8a9b0c1-d2e3-4567-8890-123456789def', name: 'test-run' },
      ];
      mockConnector.getEvaluationRuns.mockResolvedValue(mockRuns);

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockRuns);
    });

    it('should return 500 on error', async () => {
      mockConnector.getEvaluationRuns.mockRejectedValue(new Error('DB error'));

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch evaluation runs' });
    });
  });

  describe('GET /:runId', () => {
    it('should return 200 on successful fetch', async () => {
      const mockRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        dataset_id: '123e4567-e89b-12d3-a456-426614174001',
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        name: 'Test Evaluation Run',
        description: 'A test evaluation run',
        status: 'pending',
        results: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      mockConnector.getEvaluationRuns.mockResolvedValue([mockRun]);

      const res = await client[':runId'].$get({
        param: { runId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockRun);
      expect(mockConnector.getEvaluationRuns).toHaveBeenCalledWith({
        id: 'c13d1678-150a-466b-804f-ecc82de3680e',
      });
    });

    it('should return 404 when run not found', async () => {
      mockConnector.getEvaluationRuns.mockResolvedValue([]);

      const res = await client[':runId'].$get({
        param: { runId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: 'Evaluation run not found' });
    });

    it('should return 500 on error', async () => {
      mockConnector.getEvaluationRuns.mockRejectedValue(new Error('DB error'));

      const res = await client[':runId'].$get({
        param: { runId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch evaluation run' });
    });

    it('should validate UUID format', async () => {
      const res = await client[':runId'].$get({
        param: { runId: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
      expect(mockConnector.getEvaluationRuns).not.toHaveBeenCalled();
    });
  });

  describe('POST /', () => {
    it('should return 201 on successful creation', async () => {
      const mockRun = {
        id: 'a9b0c1d2-e3f4-4678-8901-23456789def0',
        name: 'new-run',
      };
      mockConnector.createEvaluationRun.mockResolvedValue(mockRun);

      const res = await client.index.$post({
        json: {
          name: 'new-run',
          dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          skill_id: '3e35a872-b7de-4f67-8df5-93a2fc2cf71e',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockRun);
    });

    it('should trigger backfill evaluation for realtime datasets', async () => {
      const mockRun = {
        id: 'a9b0c1d2-e3f4-4678-8901-23456789def0',
        dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680f',
        name: 'new-realtime-run',
        evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
      };
      const mockRealtimeDataset = {
        id: 'c13d1678-150a-466b-804f-ecc82de3680f',
        is_realtime: true,
        realtime_size: 5,
      };
      const mockExistingLogs = [
        { id: 'log-1', start_time: 1000 },
        { id: 'log-2', start_time: 2000 },
      ];

      mockConnector.createEvaluationRun.mockResolvedValue(mockRun);
      mockConnector.getDatasets.mockResolvedValue([mockRealtimeDataset]);
      mockConnector.getDatasetLogs.mockResolvedValue(mockExistingLogs);

      const res = await client.index.$post({
        json: {
          name: 'new-realtime-run',
          dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680f',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          skill_id: '3e35a872-b7de-4f67-8df5-93a2fc2cf71e',
          evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockRun);

      // Wait a tick for async backfill to potentially start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify backfill evaluation was triggered
      expect(mockConnector.getDatasets).toHaveBeenCalledWith({
        id: 'c13d1678-150a-466b-804f-ecc82de3680f',
      });
      expect(mockConnector.getDatasetLogs).toHaveBeenCalledWith(
        'c13d1678-150a-466b-804f-ecc82de3680f',
        {},
      );
    });

    it('should not trigger backfill for non-realtime datasets', async () => {
      const mockRun = {
        id: 'a9b0c1d2-e3f4-4678-8901-23456789def0',
        dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680d',
        name: 'new-regular-run',
        evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
      };
      const mockRegularDataset = {
        id: 'c13d1678-150a-466b-804f-ecc82de3680d',
        is_realtime: false,
      };

      mockConnector.createEvaluationRun.mockResolvedValue(mockRun);
      mockConnector.getDatasets.mockResolvedValue([mockRegularDataset]);

      const res = await client.index.$post({
        json: {
          name: 'new-regular-run',
          dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680d',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          skill_id: '3e35a872-b7de-4f67-8df5-93a2fc2cf71e',
          evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockRun);

      // Wait a tick for async backfill to potentially start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify dataset was checked but logs were not fetched
      expect(mockConnector.getDatasets).toHaveBeenCalledWith({
        id: 'c13d1678-150a-466b-804f-ecc82de3680d',
      });
      expect(mockConnector.getDatasetLogs).not.toHaveBeenCalled();
      expect(mockEvaluationConnector.evaluateOneLog).not.toHaveBeenCalled();
    });

    it('should handle backfill errors gracefully without failing API request', async () => {
      const mockRun = {
        id: 'a9b0c1d2-e3f4-4678-8901-23456789def0',
        dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680c',
        name: 'new-run-with-error',
        evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
      };

      mockConnector.createEvaluationRun.mockResolvedValue(mockRun);
      mockConnector.getDatasets.mockRejectedValue(
        new Error('Database error during backfill'),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      const res = await client.index.$post({
        json: {
          name: 'new-run-with-error',
          dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680c',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          skill_id: '3e35a872-b7de-4f67-8df5-93a2fc2cf71e',
          evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
        },
      });

      // API request should still succeed
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockRun);

      // Wait for async backfill error to be logged
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify error was logged but didn't fail the request
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in backfill evaluation for evaluation run a9b0c1d2-e3f4-4678-8901-23456789def0:',
        expect.any(Error),
      );
    });

    it('should return 500 on creation error', async () => {
      mockConnector.createEvaluationRun.mockRejectedValue(
        new Error('Create failed'),
      );

      const res = await client.index.$post({
        json: {
          name: 'new-run',
          dataset_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          skill_id: '3e35a872-b7de-4f67-8df5-93a2fc2cf71e',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to create evaluation run' });
    });
  });

  describe('PATCH /:evaluationRunId', () => {
    it('should return 200 on successful update', async () => {
      const mockRun = {
        id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        name: 'updated-run',
      };
      mockConnector.updateEvaluationRun.mockResolvedValue(mockRun);

      const res = await client[':evaluationRunId'].$patch({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: { name: 'updated-run' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockRun);
    });

    it('should return 500 on update error', async () => {
      mockConnector.updateEvaluationRun.mockRejectedValue(
        new Error('Update failed'),
      );

      const res = await client[':evaluationRunId'].$patch({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: { name: 'updated-run' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to update evaluation run' });
    });

    it('should validate UUID format', async () => {
      const res = await client[':evaluationRunId'].$patch({
        param: { evaluationRunId: 'invalid-uuid' },
        json: { name: 'updated-run' },
      });

      expect(res.status).toBe(400);
      expect(mockConnector.updateEvaluationRun).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:evaluationRunId', () => {
    it('should return 204 on successful deletion', async () => {
      mockConnector.deleteEvaluationRun.mockResolvedValue(undefined);

      const res = await client[':evaluationRunId'].$delete({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockConnector.deleteEvaluationRun.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':evaluationRunId'].$delete({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to delete evaluation run' });
    });

    it('should validate UUID format', async () => {
      const res = await client[':evaluationRunId'].$delete({
        param: { evaluationRunId: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
      expect(mockConnector.deleteEvaluationRun).not.toHaveBeenCalled();
    });
  });

  describe('GET /:evaluationRunId/log-outputs', () => {
    it('should return 200 on successful fetch', async () => {
      const mockLogs = [
        {
          id: 'output-1',
          log_id: 'log-1',
          output: { result: 'test' },
          score: 0.95,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockConnector.getLogOutputs.mockResolvedValue(mockLogs);

      const res = await client[':evaluationRunId']['log-outputs'].$get({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: { limit: '10', offset: '0' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockLogs);
      expect(mockConnector.getLogOutputs).toHaveBeenCalledWith(
        'c13d1678-150a-466b-804f-ecc82de3680e',
        { limit: 10, offset: 0 },
      );
    });

    it('should return 200 with query filters', async () => {
      const mockLogs = [
        {
          id: 'output-1',
          log_id: 'log-1',
          output: { result: 'test' },
          score: 0.85,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockConnector.getLogOutputs.mockResolvedValue(mockLogs);

      const res = await client[':evaluationRunId']['log-outputs'].$get({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {
          score_min: '0.8',
          score_max: '0.9',
          limit: '5',
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockLogs);
      expect(mockConnector.getLogOutputs).toHaveBeenCalledWith(
        'c13d1678-150a-466b-804f-ecc82de3680e',
        {
          score_min: 0.8,
          score_max: 0.9,
          limit: 5,
        },
      );
    });

    it('should return 500 on error', async () => {
      mockConnector.getLogOutputs.mockRejectedValue(new Error('DB error'));

      const res = await client[':evaluationRunId']['log-outputs'].$get({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: { limit: '10' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch log outputs' });
    });

    it('should validate UUID format for evaluationRunId', async () => {
      const res = await client[':evaluationRunId']['log-outputs'].$get({
        param: { evaluationRunId: 'invalid-uuid' },
        query: { limit: '10' },
      });

      expect(res.status).toBe(400);
      expect(mockConnector.getLogOutputs).not.toHaveBeenCalled();
    });

    it('should validate query parameters', async () => {
      const res = await client[':evaluationRunId']['log-outputs'].$get({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {
          limit: '-5', // negative limit should fail validation
          offset: '-1', // negative offset should fail validation
        },
      });

      expect(res.status).toBe(400);
      expect(mockConnector.getLogOutputs).not.toHaveBeenCalled();
    });

    it('should validate limit is positive', async () => {
      const res = await client[':evaluationRunId']['log-outputs'].$get({
        param: { evaluationRunId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        query: {
          limit: '0', // should fail because limit must be positive
        },
      });

      expect(res.status).toBe(400);
      expect(mockConnector.getLogOutputs).not.toHaveBeenCalled();
    });
  });
});
