import type { UserDataStorageConnector } from '@server/types/connector';
import { getOrCreateSkill } from '@server/utils/idkhub/skills';
import type { Skill, SkillCreateParams } from '@shared/types/data/skill';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock console.log to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {
  // Intentionally empty implementation
});

describe('getOrCreateSkill', () => {
  let mockConnector: UserDataStorageConnector;
  const testAgentId = '550e8400-e29b-41d4-a716-446655440000';

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

      // Evaluation runs
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
      createModel: vi.fn(),
      updateModel: vi.fn(),
      deleteModel: vi.fn(),
      // Skill-Model relationship methods
      getSkillModels: vi.fn(),
      addModelsToSkill: vi.fn(),
      removeModelsFromSkill: vi.fn(),
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

  describe('when skill exists', () => {
    it('should return existing skill', async () => {
      const existingSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'existing-skill',
        description: 'Existing skill description',
        metadata: {
          last_clustering_at: '2023-01-01T00:00:00.000Z',
          last_clustering_log_start_time: 1234567890,
        },
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      vi.mocked(mockConnector.getSkills).mockResolvedValue([existingSkill]);

      const result = await getOrCreateSkill(
        mockConnector,
        testAgentId,
        'existing-skill',
      );

      expect(result).toEqual(existingSkill);
      expect(mockConnector.getSkills).toHaveBeenCalledWith({
        name: 'existing-skill',
        agent_id: testAgentId,
      });
      expect(mockConnector.createSkill).not.toHaveBeenCalled();
    });

    it('should return first skill when multiple exist with same name', async () => {
      const skills: Skill[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          agent_id: testAgentId,
          name: 'duplicate-skill',
          description: 'First skill',
          metadata: {
            last_clustering_at: '2023-01-01T00:00:00.000Z',
            last_clustering_log_start_time: 1234567890,
          },
          configuration_count: 5,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          system_prompt_count: 0,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          agent_id: testAgentId,
          name: 'duplicate-skill',
          description: 'Second skill',
          metadata: {
            last_clustering_at: '2023-01-02T00:00:00.000Z',
            last_clustering_log_start_time: 1234567890,
          },
          configuration_count: 5,
          created_at: '2023-01-02T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
          system_prompt_count: 0,
        },
      ];

      vi.mocked(mockConnector.getSkills).mockResolvedValue(skills);

      const result = await getOrCreateSkill(
        mockConnector,
        testAgentId,
        'duplicate-skill',
      );

      expect(result).toEqual(skills[0]);
      expect(mockConnector.createSkill).not.toHaveBeenCalled();
    });
  });

  describe('when skill does not exist', () => {
    it('should create and return new skill', async () => {
      const newSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'new-skill',
        description: 'New skill description',
        metadata: {},
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      vi.mocked(mockConnector.getSkills).mockResolvedValue([]);
      vi.mocked(mockConnector.createSkill).mockResolvedValue(newSkill);

      const result = await getOrCreateSkill(
        mockConnector,
        testAgentId,
        'new-skill',
      );

      expect(result).toEqual(newSkill);
      expect(mockConnector.getSkills).toHaveBeenCalledWith({
        name: 'new-skill',
        agent_id: testAgentId,
      });
      expect(mockConnector.createSkill).toHaveBeenCalledWith({
        agent_id: testAgentId,
        name: 'new-skill',
        description: 'This skill must be set up before it can be optimized.',
        metadata: {},
        configuration_count: 3,
        system_prompt_count: 0,
      } as SkillCreateParams);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Skill already exists'),
      );
    });

    it('should create skill with default metadata when none exists', async () => {
      const newSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: 'test-skill',
        description: 'Test skill description',
        metadata: {},
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      vi.mocked(mockConnector.getSkills).mockResolvedValue([]);
      vi.mocked(mockConnector.createSkill).mockResolvedValue(newSkill);

      await getOrCreateSkill(mockConnector, testAgentId, 'test-skill');

      expect(mockConnector.createSkill).toHaveBeenCalledWith({
        agent_id: testAgentId,
        name: 'test-skill',
        description: 'This skill must be set up before it can be optimized.',
        metadata: {},
        max_configurations: 3,
        num_system_prompts: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getSkills', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockConnector.getSkills).mockRejectedValue(error);

      await expect(
        getOrCreateSkill(mockConnector, testAgentId, 'test-skill'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate errors from createSkill', async () => {
      const error = new Error('Failed to create skill');
      vi.mocked(mockConnector.getSkills).mockResolvedValue([]);
      vi.mocked(mockConnector.createSkill).mockRejectedValue(error);

      await expect(
        getOrCreateSkill(mockConnector, testAgentId, 'test-skill'),
      ).rejects.toThrow('Failed to create skill');
    });
  });

  describe('edge cases', () => {
    it('should handle empty skill name', async () => {
      const newSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: '',
        description: 'Empty name skill description',
        metadata: {},
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      vi.mocked(mockConnector.getSkills).mockResolvedValue([]);
      vi.mocked(mockConnector.createSkill).mockResolvedValue(newSkill);

      const result = await getOrCreateSkill(mockConnector, testAgentId, '');

      expect(result).toEqual(newSkill);
      expect(mockConnector.getSkills).toHaveBeenCalledWith({
        name: '',
        agent_id: testAgentId,
      });
      expect(mockConnector.createSkill).toHaveBeenCalledWith({
        agent_id: testAgentId,
        name: '',
        description: 'This skill must be set up before it can be optimized.',
        metadata: {},
        max_configurations: 3,
        num_system_prompts: 0,
      });
    });

    it('should handle special characters in skill name', async () => {
      const specialName = 'skill-with-special-chars_123@domain.com';
      const newSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: specialName,
        description: 'Special characters skill description',
        metadata: {},
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      vi.mocked(mockConnector.getSkills).mockResolvedValue([]);
      vi.mocked(mockConnector.createSkill).mockResolvedValue(newSkill);

      const result = await getOrCreateSkill(
        mockConnector,
        testAgentId,
        specialName,
      );

      expect(result).toEqual(newSkill);
      expect(mockConnector.getSkills).toHaveBeenCalledWith({
        name: specialName,
        agent_id: testAgentId,
      });
    });

    it('should handle very long skill names', async () => {
      const longName = 'a'.repeat(1000);
      const newSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: longName,
        description: 'Long name skill description',
        metadata: {},
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      vi.mocked(mockConnector.getSkills).mockResolvedValue([]);
      vi.mocked(mockConnector.createSkill).mockResolvedValue(newSkill);

      const result = await getOrCreateSkill(
        mockConnector,
        testAgentId,
        longName,
      );

      expect(result).toEqual(newSkill);
      expect(mockConnector.getSkills).toHaveBeenCalledWith({
        name: longName,
        agent_id: testAgentId,
      });
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent calls for same skill name', async () => {
      const skillName = 'concurrent-skill';
      const existingSkill: Skill = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: testAgentId,
        name: skillName,
        description: 'Concurrent skill description',
        metadata: {},
        configuration_count: 5,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        system_prompt_count: 0,
      };

      // First call finds no skill, second call finds the skill created by first call
      vi.mocked(mockConnector.getSkills)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([existingSkill]);
      vi.mocked(mockConnector.createSkill).mockResolvedValue(existingSkill);

      const [result1, result2] = await Promise.all([
        getOrCreateSkill(mockConnector, testAgentId, skillName),
        getOrCreateSkill(mockConnector, testAgentId, skillName),
      ]);

      expect(result1).toEqual(existingSkill);
      expect(result2).toEqual(existingSkill);

      // Both calls should check for existing skill
      expect(mockConnector.getSkills).toHaveBeenCalledTimes(2);

      // Only first call should create the skill (due to our mock setup)
      expect(mockConnector.createSkill).toHaveBeenCalledTimes(1);
    });
  });
});
