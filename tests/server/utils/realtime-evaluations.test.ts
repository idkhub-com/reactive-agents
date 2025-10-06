import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { HttpMethod } from '@server/types/http';
import {
  findRealtimeEvaluations,
  runEvaluationsForLog,
  shouldTriggerRealtimeEvaluation,
} from '@server/utils/realtime-evaluations';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Mock user data storage connector
const createMockUserDataStorageConnector = () =>
  ({
    getSkillOptimizationEvaluations: vi.fn(),
    // Other methods not used in tests
    getFeedback: vi.fn(),
    createFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    getImprovedResponse: vi.fn(),
    createImprovedResponse: vi.fn(),
    updateImprovedResponse: vi.fn(),
    deleteImprovedResponse: vi.fn(),
    getAgents: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    getSkills: vi.fn(),
    createSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    getTools: vi.fn(),
    createTool: vi.fn(),
    deleteTool: vi.fn(),
    createDataset: vi.fn(),
    updateDataset: vi.fn(),
    deleteDataset: vi.fn(),
    getDatasets: vi.fn(),
    getLogs: vi.fn(),
    deleteLog: vi.fn(),
    createEvaluationRun: vi.fn(),
    updateEvaluationRun: vi.fn(),
    deleteEvaluationRun: vi.fn(),
    getEvaluationRuns: vi.fn(),
    getLogOutputs: vi.fn(),
    createLogOutput: vi.fn(),
    deleteLogOutput: vi.fn(),
    getDatasetLogs: vi.fn(),
    addLogsToDataset: vi.fn(),
    removeLogsFromDataset: vi.fn(),
    createSkillOptimizationEvaluation: vi.fn(),
    updateSkillOptimizationEvaluation: vi.fn(),
    deleteSkillOptimizationEvaluation: vi.fn(),
    // AI Provider API Key methods
    getAIProviderAPIKeys: vi.fn(),
    getAIProviderAPIKeyById: vi.fn(),
    createAIProviderAPIKey: vi.fn(),
    updateAIProviderAPIKey: vi.fn(),
    deleteAIProviderAPIKey: vi.fn(),
  }) as unknown as UserDataStorageConnector;

const createMockEvaluationConnector = (): EvaluationMethodConnector => ({
  getDetails: vi.fn().mockReturnValue({
    method: EvaluationMethodName.TURN_RELEVANCY,
    name: 'Turn Relevancy',
    description: 'Test evaluation method',
  }),
  evaluate: vi.fn(),
  evaluateLog: vi.fn(),
  getParameterSchema: z.object({}),
});

const mockIdkRequestLog: IdkRequestLog = {
  id: 'log-123',
  agent_id: 'agent-456',
  skill_id: 'skill-789',
  method: 'POST' as HttpMethod,
  endpoint: '/v1/chat/completions',
  function_name: FunctionName.CHAT_COMPLETE,
  status: 200,
  start_time: Date.now(),
  end_time: Date.now() + 1000,
  duration: 1000,
  base_idk_config: {},
  ai_provider: AIProvider.OPENAI,
  model: 'gpt-4',
  ai_provider_request_log: {
    provider: AIProvider.OPENAI,
    function_name: FunctionName.CHAT_COMPLETE,
    method: 'POST' as HttpMethod,
    request_url: 'https://api.openai.com/v1/chat/completions',
    status: 200,
    request_body: { model: 'gpt-4' },
    response_body: {},
    raw_request_body: '{}',
    raw_response_body: '{}',
    cache_mode: CacheMode.SIMPLE,
    cache_status: CacheStatus.MISS,
  },
  hook_logs: [],
  metadata: {},
  cache_status: CacheStatus.MISS,
  trace_id: null,
  parent_span_id: null,
  span_id: null,
  span_name: null,
  app_id: null,
  external_user_id: null,
  external_user_human_name: null,
  user_metadata: null,
  embedding: null,
} as const;

const mockSkillOptimizationEvaluation: SkillOptimizationEvaluation = {
  id: 'eval-123',
  agent_id: 'agent-456',
  skill_id: 'skill-789',
  evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Realtime Evaluations', () => {
  let mockUserDataStorageConnector: UserDataStorageConnector;

  beforeEach(() => {
    mockUserDataStorageConnector = createMockUserDataStorageConnector();
    vi.clearAllMocks();
  });

  describe('findRealtimeEvaluations', () => {
    it('should return empty array when no skill optimization evaluations exist', async () => {
      vi.mocked(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([]);

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([]);
      expect(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        skill_id: 'skill-789',
      });
    });

    it('should return skill optimization evaluations', async () => {
      vi.mocked(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([mockSkillOptimizationEvaluation]);

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([mockSkillOptimizationEvaluation]);
      expect(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        skill_id: 'skill-789',
      });
    });

    it('should return multiple skill optimization evaluations', async () => {
      const evaluation2: SkillOptimizationEvaluation = {
        ...mockSkillOptimizationEvaluation,
        id: 'eval-456',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      };

      vi.mocked(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([mockSkillOptimizationEvaluation, evaluation2]);

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([mockSkillOptimizationEvaluation, evaluation2]);
      expect(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockRejectedValue(new Error('Database error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error finding realtime evaluations for agent agent-456, skill skill-789:',
        expect.any(Error),
      );
    });
  });

  describe('runRealtimeEvaluationsForLog', () => {
    it('should do nothing when no evaluation runs provided', async () => {
      const result = await runEvaluationsForLog(
        mockIdkRequestLog,
        [],
        {} as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>,
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([]);
      expect(
        mockUserDataStorageConnector.getSkillOptimizationEvaluations,
      ).not.toHaveBeenCalled();
    });

    it('should trigger evaluations', async () => {
      const mockConnector = createMockEvaluationConnector();
      const mockLogOutput = {
        id: 'output-123',
        evaluation_run_id: 'eval-123',
        log_id: 'log-123',
        output: {},
        score: 0.95,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      vi.mocked(mockConnector.evaluateLog).mockResolvedValue(mockLogOutput);

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      const result = await runEvaluationsForLog(
        mockIdkRequestLog,
        [mockSkillOptimizationEvaluation],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Verify evaluation was triggered
      expect(mockConnector.evaluateLog).toHaveBeenCalledWith(
        'eval-123',
        mockIdkRequestLog,
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([mockLogOutput]);
    });

    it('should handle evaluation errors gracefully', async () => {
      const mockConnector = createMockEvaluationConnector();
      vi.mocked(mockConnector.evaluateLog).mockRejectedValue(
        new Error('Evaluation failed'),
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      const result = await runEvaluationsForLog(
        mockIdkRequestLog,
        [mockSkillOptimizationEvaluation],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in skill optimization evaluation eval-123 for log log-123:',
        expect.any(Error),
      );
      expect(result).toEqual([]);
    });

    it('should skip evaluations when no connector found', async () => {
      const evaluationConnectorsMap = {} as Partial<
        Record<EvaluationMethodName, EvaluationMethodConnector>
      >; // No connectors available

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      const result = await runEvaluationsForLog(
        mockIdkRequestLog,
        [mockSkillOptimizationEvaluation],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'No connector found for evaluation method: turn_relevancy',
      );
      expect(result).toEqual([]);
    });

    it('should handle multiple evaluations in parallel', async () => {
      const mockConnector1 = createMockEvaluationConnector();
      const mockConnector2 = createMockEvaluationConnector();

      const mockLogOutput1 = {
        id: 'output-1',
        evaluation_run_id: 'eval-123',
        log_id: 'log-123',
        output: {},
        score: 0.95,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      const mockLogOutput2 = {
        id: 'output-2',
        evaluation_run_id: 'eval-456',
        log_id: 'log-123',
        output: {},
        score: 0.85,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      vi.mocked(mockConnector1.evaluateLog).mockResolvedValue(mockLogOutput1);
      vi.mocked(mockConnector2.evaluateLog).mockResolvedValue(mockLogOutput2);

      const evaluation2: SkillOptimizationEvaluation = {
        ...mockSkillOptimizationEvaluation,
        id: 'eval-456',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      };

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector1,
        [EvaluationMethodName.TASK_COMPLETION]: mockConnector2,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      const result = await runEvaluationsForLog(
        mockIdkRequestLog,
        [mockSkillOptimizationEvaluation, evaluation2],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(mockConnector1.evaluateLog).toHaveBeenCalledWith(
        'eval-123',
        mockIdkRequestLog,
        mockUserDataStorageConnector,
      );

      expect(mockConnector2.evaluateLog).toHaveBeenCalledWith(
        'eval-456',
        mockIdkRequestLog,
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([mockLogOutput1, mockLogOutput2]);
    });

    it('should continue with other evaluations if one fails', async () => {
      const mockConnector1 = createMockEvaluationConnector();
      const mockConnector2 = createMockEvaluationConnector();

      const mockLogOutput2 = {
        id: 'output-2',
        evaluation_run_id: 'eval-456',
        log_id: 'log-123',
        output: {},
        score: 0.85,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      vi.mocked(mockConnector1.evaluateLog).mockRejectedValue(
        new Error('Evaluation 1 failed'),
      );
      vi.mocked(mockConnector2.evaluateLog).mockResolvedValue(mockLogOutput2);

      const evaluation2: SkillOptimizationEvaluation = {
        ...mockSkillOptimizationEvaluation,
        id: 'eval-456',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      };

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector1,
        [EvaluationMethodName.TASK_COMPLETION]: mockConnector2,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      const result = await runEvaluationsForLog(
        mockIdkRequestLog,
        [mockSkillOptimizationEvaluation, evaluation2],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in skill optimization evaluation eval-123 for log log-123:',
        expect.any(Error),
      );

      // Should only return successful evaluation
      expect(result).toEqual([mockLogOutput2]);
    });
  });

  describe('shouldTriggerRealtimeEvaluation', () => {
    it('should return true for successful AI provider calls', () => {
      const url = new URL('http://localhost:3000/v1/chat/completions');
      expect(shouldTriggerRealtimeEvaluation(200, url)).toBe(true);
    });

    it('should return false for non-200 status codes', () => {
      const url = new URL('http://localhost:3000/v1/chat/completions');
      expect(shouldTriggerRealtimeEvaluation(400, url)).toBe(false);
      expect(shouldTriggerRealtimeEvaluation(500, url)).toBe(false);
    });

    it('should return false for non-v1 endpoints', () => {
      const url = new URL('http://localhost:3000/v2/chat/completions');
      expect(shouldTriggerRealtimeEvaluation(200, url)).toBe(false);
    });

    it('should return false for IDK internal API calls', () => {
      const url = new URL('http://localhost:3000/v1/idk/agents');
      expect(shouldTriggerRealtimeEvaluation(200, url)).toBe(false);
    });

    it('should return true for valid AI provider endpoints', () => {
      const validEndpoints = [
        'http://localhost:3000/v1/chat/completions',
        'http://localhost:3000/v1/completions',
        'http://localhost:3000/v1/embeddings',
        'http://localhost:3000/v1/images/generations',
      ];

      for (const endpoint of validEndpoints) {
        const url = new URL(endpoint);
        expect(shouldTriggerRealtimeEvaluation(200, url)).toBe(true);
      }
    });
  });
});
