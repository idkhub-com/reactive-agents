import type { UserDataStorageConnector } from '@server/types/connector';
import { getOrCreateAgent } from '@server/utils/idkhub/agents';
import type { Agent, AgentCreateParams } from '@shared/types/data/agent';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock console.log to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {
  // Intentionally empty implementation
});

describe('getOrCreateAgent', () => {
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

      const result = await getOrCreateAgent(mockConnector, 'existing-agent');

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

      const result = await getOrCreateAgent(mockConnector, 'duplicate-agent');

      expect(result).toEqual(agents[0]);
      expect(mockConnector.createAgent).not.toHaveBeenCalled();
    });
  });

  describe('when agent does not exist', () => {
    it('should create and return new agent', async () => {
      const newAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'new-agent',
        description: null,
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);
      vi.mocked(mockConnector.createAgent).mockResolvedValue(newAgent);

      const result = await getOrCreateAgent(mockConnector, 'new-agent');

      expect(result).toEqual(newAgent);
      expect(mockConnector.getAgents).toHaveBeenCalledWith({
        name: 'new-agent',
      });
      expect(mockConnector.createAgent).toHaveBeenCalledWith({
        name: 'new-agent',
        metadata: {},
      } as AgentCreateParams);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Agent already exists'),
      );
    });

    it('should create agent with default metadata when none exists', async () => {
      const newAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test-agent',
        description: null,
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);
      vi.mocked(mockConnector.createAgent).mockResolvedValue(newAgent);

      await getOrCreateAgent(mockConnector, 'test-agent');

      expect(mockConnector.createAgent).toHaveBeenCalledWith({
        name: 'test-agent',
        metadata: {},
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getAgents', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockConnector.getAgents).mockRejectedValue(error);

      await expect(
        getOrCreateAgent(mockConnector, 'test-agent'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate errors from createAgent', async () => {
      const error = new Error('Failed to create agent');
      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);
      vi.mocked(mockConnector.createAgent).mockRejectedValue(error);

      await expect(
        getOrCreateAgent(mockConnector, 'test-agent'),
      ).rejects.toThrow('Failed to create agent');
    });
  });

  describe('edge cases', () => {
    it('should handle empty agent name', async () => {
      const newAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: '',
        description: null,
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);
      vi.mocked(mockConnector.createAgent).mockResolvedValue(newAgent);

      const result = await getOrCreateAgent(mockConnector, '');

      expect(result).toEqual(newAgent);
      expect(mockConnector.getAgents).toHaveBeenCalledWith({ name: '' });
      expect(mockConnector.createAgent).toHaveBeenCalledWith({
        name: '',
        metadata: {},
      });
    });

    it('should handle special characters in agent name', async () => {
      const specialName = 'agent-with-special-chars_123@domain.com';
      const newAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: specialName,
        description: null,
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);
      vi.mocked(mockConnector.createAgent).mockResolvedValue(newAgent);

      const result = await getOrCreateAgent(mockConnector, specialName);

      expect(result).toEqual(newAgent);
      expect(mockConnector.getAgents).toHaveBeenCalledWith({
        name: specialName,
      });
    });

    it('should handle very long agent names', async () => {
      const longName = 'a'.repeat(1000);
      const newAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: longName,
        description: null,
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      vi.mocked(mockConnector.getAgents).mockResolvedValue([]);
      vi.mocked(mockConnector.createAgent).mockResolvedValue(newAgent);

      const result = await getOrCreateAgent(mockConnector, longName);

      expect(result).toEqual(newAgent);
      expect(mockConnector.getAgents).toHaveBeenCalledWith({ name: longName });
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent calls for same agent name', async () => {
      const agentName = 'concurrent-agent';
      const existingAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: agentName,
        description: null,
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      // First call finds no agent, second call finds the agent created by first call
      vi.mocked(mockConnector.getAgents)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([existingAgent]);
      vi.mocked(mockConnector.createAgent).mockResolvedValue(existingAgent);

      const [result1, result2] = await Promise.all([
        getOrCreateAgent(mockConnector, agentName),
        getOrCreateAgent(mockConnector, agentName),
      ]);

      expect(result1).toEqual(existingAgent);
      expect(result2).toEqual(existingAgent);

      // Both calls should check for existing agent
      expect(mockConnector.getAgents).toHaveBeenCalledTimes(2);

      // Only first call should create the agent (due to our mock setup)
      expect(mockConnector.createAgent).toHaveBeenCalledTimes(1);
    });
  });
});
