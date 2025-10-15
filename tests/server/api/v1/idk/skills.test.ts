import { skillsRouter } from '@server/api/v1/idk/skills';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the system prompt generation to avoid OpenAI API calls
vi.mock('@server/optimization/utils/system-prompt', () => ({
  generateSystemPromptForSkill: vi
    .fn()
    .mockResolvedValue('Generated system prompt'),
}));

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
  // Skill Optimization Arm methods
  getSkillOptimizationArms: vi.fn(),
  createSkillOptimizationArms: vi.fn(),
  updateSkillOptimizationArm: vi.fn(),
  deleteSkillOptimizationArm: vi.fn(),
  deleteSkillOptimizationArmsForSkill: vi.fn(),
  deleteSkillOptimizationArmsForCluster: vi.fn(),
  // Skill Optimization Evaluation methods
  getSkillOptimizationEvaluations: vi.fn(),
  createSkillOptimizationEvaluations: vi.fn(),
  deleteSkillOptimizationEvaluation: vi.fn(),
  deleteSkillOptimizationEvaluationsForSkill: vi.fn(),
  // Skill Optimization Evaluation Run methods
  getSkillOptimizationEvaluationRuns: vi.fn(),
  createSkillOptimizationEvaluationRun: vi.fn(),
  deleteSkillOptimizationEvaluationRun: vi.fn(),
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
  getSkillModels: vi.fn(),
  addModelsToSkill: vi.fn(),
  removeModelsFromSkill: vi.fn(),
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
        description:
          'This is a test skill description with at least 25 characters',
        metadata: { test: true },
        max_configurations: 10,
        num_system_prompts: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };
      mockUserDataStorageConnector.createSkill.mockResolvedValue(mockSkill);
      mockUserDataStorageConnector.createSkillOptimizationClusters.mockResolvedValue(
        [],
      );

      const res = await client.index.$post({
        json: {
          agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          name: 'test-skill',
          description:
            'This is a test skill description with at least 25 characters',
          metadata: {
            last_clustering_at: '2023-01-01T00:00:00.000Z',
            last_clustering_log_start_time: 1234567890,
          },
          optimize: false,
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
          description:
            'This is a test skill description with at least 25 characters',
          metadata: {},
          optimize: false,
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
          description:
            'This is a test skill description with at least 25 characters',
          metadata: { test: true },
          max_configurations: 10,
          num_system_prompts: 5,
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
        description:
          'This is an updated skill description with at least 25 characters',
        metadata: { test: true },
        max_configurations: 10,
        num_system_prompts: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T00:00:00.000Z',
      };
      const mockCluster = {
        id: 'cluster-1',
        agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        skill_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        name: 'Cluster 1',
        total_steps: 0,
        centroid: [0.5],
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };
      const mockModel = {
        id: 'model-1',
        ai_provider: 'anthropic',
        name: 'claude-3-sonnet',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      // Mocks for updateSkill operation
      mockUserDataStorageConnector.updateSkill.mockResolvedValue(mockSkill);

      // Mocks for handleGenerateArms operation (called when description is updated)
      mockUserDataStorageConnector.getSkills.mockResolvedValue([mockSkill]);
      mockUserDataStorageConnector.deleteSkillOptimizationArmsForSkill.mockResolvedValue(
        undefined,
      );
      mockUserDataStorageConnector.getSkillOptimizationClusters.mockResolvedValue(
        [mockCluster],
      );
      mockUserDataStorageConnector.updateSkillOptimizationCluster.mockResolvedValue(
        mockCluster,
      );
      mockUserDataStorageConnector.getSkillModels.mockResolvedValue([
        mockModel,
      ]);
      mockUserDataStorageConnector.createSkillOptimizationArms.mockResolvedValue(
        [],
      );

      const res = await client[':skillId'].$patch({
        param: { skillId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
        json: {
          description:
            'This is an updated skill description with at least 25 characters',
        },
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
        json: {
          description:
            'This is an updated skill description with at least 25 characters',
        },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to update skill' });
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await client[':skillId'].$patch({
        param: { skillId: 'invalid-uuid' },
        json: {
          description:
            'This is an updated skill description with at least 25 characters',
        },
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
