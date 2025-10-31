import { agentsRouter } from '@server/api/v1/reactive-agents/agents';
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
  addModelsToSkill: vi.fn(),
  removeModelsFromSkill: vi.fn(),
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
      const mockAgents = [
        { id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef02', name: 'test-agent' },
      ];
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
        id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        name: 'test-agent',
        description: 'updated description',
      };
      mockUserDataStorageConnector.updateAgent.mockResolvedValue(mockAgent);

      const res = await client[':agentId'].$patch({
        param: { agentId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
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
        param: { agentId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
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
        param: { agentId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');
    });

    it('should return 500 on deletion error', async () => {
      mockUserDataStorageConnector.deleteAgent.mockRejectedValue(
        new Error('Delete failed'),
      );

      const res = await client[':agentId'].$delete({
        param: { agentId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
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
      const mockSkills = [
        { id: 'b4c5d6e7-f8a9-4123-8456-7890abcdef023', name: 'test-skill' },
      ];
      mockUserDataStorageConnector.getSkills.mockResolvedValue(mockSkills);

      const res = await client[':agentId'].skills.$get({
        param: { agentId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockSkills);
      expect(mockUserDataStorageConnector.getSkills).toHaveBeenCalledWith({
        agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
      });
    });

    it('should return 500 on error', async () => {
      mockUserDataStorageConnector.getSkills.mockRejectedValue(
        new Error('Fetch failed'),
      );

      const res = await client[':agentId'].skills.$get({
        param: { agentId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
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
