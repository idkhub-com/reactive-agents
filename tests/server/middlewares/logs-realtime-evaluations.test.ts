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

describe('Realtime Evaluations Integration', () => {
  let userDataStorageConnector: UserDataStorageConnector;
  let evaluationConnector: EvaluationMethodConnector;

  beforeEach(() => {
    userDataStorageConnector = createMockUserDataStorageConnector();
    evaluationConnector = createMockEvaluationConnector();
    vi.clearAllMocks();
  });

  describe('Full Workflow Integration', () => {
    it('should execute complete realtime evaluation workflow', async () => {
      // Setup: Mock storage responses for a successful realtime evaluation workflow
      vi.mocked(
        userDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([mockSkillOptimizationEvaluation]);

      // Step 1: Check if we should trigger realtime evaluations
      const url = new URL('http://localhost:3000/v1/chat/completions');
      const shouldTrigger = shouldTriggerRealtimeEvaluation(200, url);
      expect(shouldTrigger).toBe(true);

      // Step 2: Find realtime evaluations for the agent/skill
      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      expect(realtimeEvaluations).toHaveLength(1);
      expect(realtimeEvaluations[0]).toEqual(mockSkillOptimizationEvaluation);

      // Step 3: Trigger realtime evaluations
      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: evaluationConnector,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      await runEvaluationsForLog(
        mockIdkRequestLog,
        realtimeEvaluations,
        evaluationConnectorsMap,
        userDataStorageConnector,
      );

      // Verify the complete workflow executed correctly
      expect(
        userDataStorageConnector.getSkillOptimizationEvaluations,
      ).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        skill_id: 'skill-789',
      });
      expect(evaluationConnector.evaluateLog).toHaveBeenCalledWith(
        'eval-123',
        mockIdkRequestLog,
        userDataStorageConnector,
      );
    });

    it('should handle multiple evaluation methods', async () => {
      // Create multiple evaluation runs with different methods
      const taskCompletionEvaluation: SkillOptimizationEvaluation = {
        ...mockSkillOptimizationEvaluation,
        id: 'eval-456',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      };

      vi.mocked(
        userDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([
        mockSkillOptimizationEvaluation,
        taskCompletionEvaluation,
      ]);

      const taskCompletionConnector = createMockEvaluationConnector();
      vi.mocked(taskCompletionConnector.getDetails).mockReturnValue({
        method: EvaluationMethodName.TASK_COMPLETION,
        name: 'Task Completion',
        description: 'Test task completion',
      });

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: evaluationConnector,
        [EvaluationMethodName.TASK_COMPLETION]: taskCompletionConnector,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      await runEvaluationsForLog(
        mockIdkRequestLog,
        realtimeEvaluations,
        evaluationConnectorsMap,
        userDataStorageConnector,
      );

      // Verify both evaluations were triggered
      expect(evaluationConnector.evaluateLog).toHaveBeenCalledWith(
        'eval-123',
        mockIdkRequestLog,
        userDataStorageConnector,
      );
      expect(taskCompletionConnector.evaluateLog).toHaveBeenCalledWith(
        'eval-456',
        mockIdkRequestLog,
        userDataStorageConnector,
      );
    });

    it('should handle no realtime evaluations gracefully', async () => {
      // Setup: No skill optimization evaluations
      vi.mocked(
        userDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([]);

      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      expect(realtimeEvaluations).toEqual([]);

      // Trigger with empty evaluations should be safe
      await runEvaluationsForLog(
        mockIdkRequestLog,
        realtimeEvaluations,
        {} as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>,
        userDataStorageConnector,
      );

      // No evaluation should occur
      expect(evaluationConnector.evaluateLog).not.toHaveBeenCalled();
    });

    it('should handle evaluation errors gracefully in full workflow', async () => {
      vi.mocked(
        userDataStorageConnector.getSkillOptimizationEvaluations,
      ).mockResolvedValue([mockSkillOptimizationEvaluation]);

      // Mock evaluation to fail
      vi.mocked(evaluationConnector.evaluateLog).mockRejectedValue(
        new Error('Evaluation failed'),
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: evaluationConnector,
      } as Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>;

      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      await runEvaluationsForLog(
        mockIdkRequestLog,
        realtimeEvaluations,
        evaluationConnectorsMap,
        userDataStorageConnector,
      );

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in skill optimization evaluation eval-123 for log log-123:',
        expect.any(Error),
      );
    });

    it('should filter out requests that should not trigger evaluations', () => {
      // Test internal IDK API calls
      const idkUrl = new URL('http://localhost:3000/v1/idk/agents');
      expect(shouldTriggerRealtimeEvaluation(200, idkUrl)).toBe(false);

      // Test non-200 status
      const url = new URL('http://localhost:3000/v1/chat/completions');
      expect(shouldTriggerRealtimeEvaluation(500, url)).toBe(false);

      // Test valid AI provider call
      expect(shouldTriggerRealtimeEvaluation(200, url)).toBe(true);
    });
  });
});
