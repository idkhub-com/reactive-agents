import { modelsRouter } from '@server/api/v1/reactive-agents/models';
import type { AppEnv } from '@server/types/hono';
import type { Model } from '@shared/types/data/model';
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
  incrementSkillTotalRequests: vi.fn(),
  tryAcquireReclusteringLock: vi.fn(),
  // System prompt methods
  getSystemPrompts: vi.fn(),
  createSystemPrompt: vi.fn(),
  updateSystemPrompt: vi.fn(),
  deleteSystemPrompt: vi.fn(),
  // Skill Optimization Cluster methods
  getSkillOptimizationClusters: vi.fn(),
  createSkillOptimizationClusters: vi.fn(),
  updateSkillOptimizationCluster: vi.fn(),
  deleteSkillOptimizationCluster: vi.fn(),
  incrementClusterCounters: vi.fn(),
  // Skill Optimization Arm methods
  getSkillOptimizationArms: vi.fn(),
  getSkillOptimizationArmStats: vi.fn(),
  deleteSkillOptimizationArmStats: vi.fn(),
  createSkillOptimizationArms: vi.fn(),
  updateSkillOptimizationArm: vi.fn(),
  updateArmAndIncrementCounters: vi.fn(),
  deleteSkillOptimizationArm: vi.fn(),
  deleteSkillOptimizationArmsForSkill: vi.fn(),
  deleteSkillOptimizationArmsForCluster: vi.fn(),
  // Skill Optimization Evaluation methods
  getSkillOptimizationEvaluations: vi.fn(),
  createSkillOptimizationEvaluations: vi.fn(),
  deleteSkillOptimizationEvaluation: vi.fn(),
  updateSkillOptimizationEvaluation: vi.fn(),
  deleteSkillOptimizationEvaluationsForSkill: vi.fn(),
  // Skill Optimization Evaluation Run methods
  getSkillOptimizationEvaluationRuns: vi.fn(),
  getEvaluationScoresByTimeBucket: vi.fn(),
  createSkillOptimizationEvaluationRun: vi.fn(),
  deleteSkillOptimizationEvaluationRun: vi.fn(),
  getSkillEvents: vi.fn(),
  createSkillEvent: vi.fn(),
  // Tool methods
  getTools: vi.fn(),
  createTool: vi.fn(),
  deleteTool: vi.fn(),
  // Dataset methods
  getDatasets: vi.fn(),
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  // Log methods (required by interface)
  getLogs: vi.fn(),
  deleteLog: vi.fn(),
  // Dataset-Log Bridge methods (required by interface)
  getDatasetLogs: vi.fn(),
  addLogsToDataset: vi.fn(),
  removeLogsFromDataset: vi.fn(),
  // Evaluation run methods
  getEvaluationRuns: vi.fn(),
  createEvaluationRun: vi.fn(),
  updateEvaluationRun: vi.fn(),
  deleteEvaluationRun: vi.fn(),
  // Log Output methods (required by interface)
  getLogOutputs: vi.fn(),
  createLogOutput: vi.fn(),
  deleteLogOutput: vi.fn(),
  // AI Provider API Key methods
  getAIProviderAPIKeys: vi.fn(),
  getAIProviderAPIKeyById: vi.fn(),
  createAIProvider: vi.fn(),
  updateAIProvider: vi.fn(),
  deleteAIProvider: vi.fn(),
  // Model methods
  getModels: vi.fn(),
  getModelById: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  // Skill-Model relationship methods
  getSkillModels: vi.fn(),
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
  .route('/', modelsRouter);

describe('Models API Status Codes', () => {
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 on successful fetch', async () => {
      const mockModels: Model[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
          model_name: 'gpt-4',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];
      mockUserDataStorageConnector.getModels.mockResolvedValue(mockModels);

      const res = await client.index.$get({
        query: { model_name: 'gpt-4' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockModels);
    });

    it('should return 200 with empty array when no models found', async () => {
      mockUserDataStorageConnector.getModels.mockResolvedValue([]);

      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockUserDataStorageConnector.getModels.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const res = await client.index.$get();

      expect(res.status).toBe(500);
    });

    it('should handle invalid query parameters', async () => {
      const res = await client.index.$get({
        query: { limit: 'invalid' },
      });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('should return 404 when model not found', async () => {
      mockUserDataStorageConnector.getModels.mockResolvedValue([]);

      const res = await client[':id'].$get({
        param: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: 'Model not found' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':id'].$get({
        param: { id: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /', () => {
    it('should return 400 for invalid request body', async () => {
      const res = await client.index.$post({
        json: {
          ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
          model_name: '', // Invalid: empty string
        },
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await client.index.$post({
        json: {
          model_name: 'gpt-4',
          // Missing ai_provider_id - this will be handled by Zod validation
        } as { ai_provider_id: string; model_name: string },
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid UUID in ai_provider_id', async () => {
      const res = await client.index.$post({
        json: {
          ai_provider_id: 'invalid-uuid',
          model_name: 'gpt-4',
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /:id', () => {
    it('should return 400 for invalid UUID in param', async () => {
      const res = await client[':id'].$patch({
        param: { id: 'invalid-uuid' },
        json: { model_name: 'gpt-4-turbo' },
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid request body', async () => {
      const res = await client[':id'].$patch({
        param: { id: '123e4567-e89b-12d3-a456-426614174000' },
        json: { model_name: '' }, // Invalid: empty string
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty update body', async () => {
      const res = await client[':id'].$patch({
        param: { id: '123e4567-e89b-12d3-a456-426614174000' },
        json: {},
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /:id', () => {
    it('should return 400 for invalid UUID', async () => {
      const res = await client[':id'].$delete({
        param: { id: 'invalid-uuid' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockUserDataStorageConnector.getModels.mockRejectedValue(
        new Error('Connection timeout'),
      );

      const res = await client.index.$get();

      expect(res.status).toBe(500);
    });

    it('should handle malformed JSON in POST requests', async () => {
      const res = await client.index.$post({
        json: null as unknown as {
          ai_provider_id: string;
          model_name: string;
        },
      });

      expect(res.status).toBe(400);
    });

    it('should handle malformed JSON in PATCH requests', async () => {
      const res = await client[':id'].$patch({
        param: { id: '123e4567-e89b-12d3-a456-426614174000' },
        json: null as unknown as { model_name?: string | undefined },
      });

      expect(res.status).toBe(400);
    });
  });
});
