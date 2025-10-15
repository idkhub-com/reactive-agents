import type { UserDataStorageConnector } from '@server/types/connector';
import { getAgent } from '@server/utils/idkhub/agents';
import type { Agent } from '@shared/types/data/agent';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('getAgent', () => {
  let mockConnector: UserDataStorageConnector;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock connector with all required methods
    mockConnector = {
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

      // Feedback methods
      getFeedback: vi.fn(),
      createFeedback: vi.fn(),
      deleteFeedback: vi.fn(),

      // Improved response methods
      getImprovedResponse: vi.fn(),
      createImprovedResponse: vi.fn(),
      updateImprovedResponse: vi.fn(),
      deleteImprovedResponse: vi.fn(),

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
    } as UserDataStorageConnector;
  });

  describe('when agent exists', () => {
    it('should return existing agent', async () => {
      const existingAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'existing-agent',
        description: 'Existing agent description',
        metadata: { version: '1.0' },
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([existingAgent]);

      const result = await getAgent(mockConnector, 'existing-agent');

      expect(result).toEqual(existingAgent);
      expect(mockConnector.getAgents).toHaveBeenCalledWith({
        name: 'existing-agent',
      });
      expect(mockConnector.createAgent).not.toHaveBeenCalled();
    });

    it('should return first agent when multiple exist with same name', async () => {
      const agents: Agent[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'duplicate-agent',
          description: 'First agent',
          metadata: { version: '1.0' },
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          name: 'duplicate-agent',
          description: 'Second agent',
          metadata: { version: '2.0' },
          created_at: '2023-01-02T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
        },
      ];

      vi.mocked(mockConnector.getAgents).mockResolvedValue(agents);

      const result = await getAgent(mockConnector, 'duplicate-agent');

      expect(result).toEqual(agents[0]);
      expect(mockConnector.createAgent).not.toHaveBeenCalled();
    });
  });

  describe('when agent does not exist', () => {
    it('should return null', async () => {
      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);

      const result = await getAgent(mockConnector, 'non-existent-agent');

      expect(result).toBeNull();
      expect(mockConnector.getAgents).toHaveBeenCalledWith({
        name: 'non-existent-agent',
      });
      expect(mockConnector.createAgent).not.toHaveBeenCalled();
    });

    it('should return null for empty agent name', async () => {
      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);

      const result = await getAgent(mockConnector, '');

      expect(result).toBeNull();
      expect(mockConnector.getAgents).toHaveBeenCalledWith({ name: '' });
      expect(mockConnector.createAgent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getAgents', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockConnector.getAgents).mockRejectedValue(error);

      await expect(getAgent(mockConnector, 'test-agent')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in agent name', async () => {
      const specialName = 'agent-with-special-chars_123@domain.com';
      const agent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: specialName,
        description: 'Agent with special characters',
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([agent]);

      const result = await getAgent(mockConnector, specialName);

      expect(result).toEqual(agent);
      expect(mockConnector.getAgents).toHaveBeenCalledWith({
        name: specialName,
      });
    });

    it('should handle very long agent names', async () => {
      const longName = 'a'.repeat(1000);

      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);

      const result = await getAgent(mockConnector, longName);

      expect(result).toBeNull();
      expect(mockConnector.getAgents).toHaveBeenCalledWith({ name: longName });
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent calls for same agent name', async () => {
      const agentName = 'concurrent-agent';
      const existingAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: agentName,
        description: 'Concurrent agent',
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([existingAgent]);

      const [result1, result2] = await Promise.all([
        getAgent(mockConnector, agentName),
        getAgent(mockConnector, agentName),
      ]);

      expect(result1).toEqual(existingAgent);
      expect(result2).toEqual(existingAgent);
      expect(mockConnector.getAgents).toHaveBeenCalledTimes(2);
      expect(mockConnector.createAgent).not.toHaveBeenCalled();
    });
  });
});
