import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { HttpMethod } from '@server/types/http';
import {
  findRealtimeEvaluations,
  shouldTriggerRealtimeEvaluation,
  triggerRealtimeEvaluations,
} from '@server/utils/realtime-evaluations';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { Dataset } from '@shared/types/data/dataset';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Mock user data storage connector
const createMockUserDataStorageConnector = () =>
  ({
    getDatasets: vi.fn(),
    getEvaluationRuns: vi.fn(),
    getDatasetLogs: vi.fn(),
    addLogsToDataset: vi.fn(),
    removeLogsFromDataset: vi.fn(),
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
    getLogs: vi.fn(),
    deleteLog: vi.fn(),
    createEvaluationRun: vi.fn(),
    updateEvaluationRun: vi.fn(),
    deleteEvaluationRun: vi.fn(),
    getLogOutputs: vi.fn(),
    createLogOutput: vi.fn(),
    deleteLogOutput: vi.fn(),
  }) as unknown as UserDataStorageConnector;

const createMockEvaluationConnector = (): EvaluationMethodConnector => ({
  getDetails: vi.fn().mockReturnValue({
    method: EvaluationMethodName.TURN_RELEVANCY,
    name: 'Turn Relevancy',
    description: 'Test evaluation method',
  }),
  evaluate: vi.fn(),
  evaluateOneLog: vi.fn(),
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
} as const;

const mockRealtimeDataset: Dataset = {
  id: 'dataset-789',
  agent_id: 'agent-456',
  name: 'Test Realtime Dataset',
  description: null,
  is_realtime: true,
  realtime_size: 5,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockEvaluationRun: EvaluationRun = {
  id: 'eval-run-123',
  dataset_id: 'dataset-789',
  agent_id: 'agent-456',
  skill_id: 'skill-789',
  evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
  name: 'Test Evaluation Run',
  description: null,
  status: EvaluationRunStatus.RUNNING,
  results: {},
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  started_at: null,
  completed_at: null,
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
      vi.mocked(userDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(userDataStorageConnector.getEvaluationRuns).mockResolvedValue([
        mockEvaluationRun,
      ]);
      vi.mocked(userDataStorageConnector.getDatasetLogs).mockResolvedValue([]);

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
      expect(realtimeEvaluations[0]).toEqual(mockEvaluationRun);

      // Step 3: Trigger realtime evaluations
      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: evaluationConnector,
      };

      await triggerRealtimeEvaluations(
        mockIdkRequestLog,
        realtimeEvaluations,
        evaluationConnectorsMap,
        userDataStorageConnector,
      );

      // Verify the complete workflow executed correctly
      expect(userDataStorageConnector.getDatasets).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        is_realtime: true,
      });
      expect(userDataStorageConnector.getEvaluationRuns).toHaveBeenCalledWith({
        dataset_id: 'dataset-789',
        agent_id: 'agent-456',
        skill_id: 'skill-789',
        status: EvaluationRunStatus.RUNNING,
      });
      // Verify that getDatasets was called during realtime dataset size limit handling
      expect(userDataStorageConnector.getDatasets).toHaveBeenCalledWith({
        id: 'dataset-789',
      });
      expect(evaluationConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-123',
        mockIdkRequestLog,
        userDataStorageConnector,
      );
    });

    it('should handle multiple evaluation methods', async () => {
      // Create multiple evaluation runs with different methods
      const argumentCorrectnessRun = {
        ...mockEvaluationRun,
        id: 'eval-run-456',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
      };

      vi.mocked(userDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(userDataStorageConnector.getEvaluationRuns).mockResolvedValue([
        mockEvaluationRun,
        argumentCorrectnessRun,
      ]);
      vi.mocked(userDataStorageConnector.getDatasetLogs).mockResolvedValue([]);

      const argumentConnector = createMockEvaluationConnector();
      vi.mocked(argumentConnector.getDetails).mockReturnValue({
        method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Argument Correctness',
        description: 'Test argument correctness',
      });

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: evaluationConnector,
        [EvaluationMethodName.ARGUMENT_CORRECTNESS]: argumentConnector,
      };

      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      await triggerRealtimeEvaluations(
        mockIdkRequestLog,
        realtimeEvaluations,
        evaluationConnectorsMap,
        userDataStorageConnector,
      );

      // Verify both evaluations were triggered
      expect(evaluationConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-123',
        mockIdkRequestLog,
        userDataStorageConnector,
      );
      expect(argumentConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-456',
        mockIdkRequestLog,
        userDataStorageConnector,
      );
    });

    it('should handle realtime dataset size management during full workflow', async () => {
      // Setup dataset with logs that exceed the limit
      const existingLogs = Array.from({ length: 6 }, (_, i) => ({
        ...mockIdkRequestLog,
        id: `existing-log-${i}`,
        start_time: 1000 + i * 1000, // Different timestamps
      }));

      vi.mocked(userDataStorageConnector.getDatasets).mockResolvedValue([
        { ...mockRealtimeDataset, realtime_size: 3 }, // Small limit for testing
      ]);
      vi.mocked(userDataStorageConnector.getEvaluationRuns).mockResolvedValue([
        mockEvaluationRun,
      ]);
      vi.mocked(userDataStorageConnector.getDatasetLogs).mockResolvedValue(
        existingLogs,
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: evaluationConnector,
      };

      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      await triggerRealtimeEvaluations(
        mockIdkRequestLog,
        realtimeEvaluations,
        evaluationConnectorsMap,
        userDataStorageConnector,
      );

      // Verify dataset size management was handled (realtime datasets don't use bridge table)
      // Instead, verify that getDatasets was called to check the dataset properties
      expect(userDataStorageConnector.getDatasets).toHaveBeenCalledWith({
        id: 'dataset-789',
      });

      // Verify evaluation was still triggered
      expect(evaluationConnector.evaluateOneLog).toHaveBeenCalled();
    });

    it('should handle no realtime evaluations gracefully', async () => {
      // Setup: No realtime datasets
      vi.mocked(userDataStorageConnector.getDatasets).mockResolvedValue([]);

      const realtimeEvaluations = await findRealtimeEvaluations(
        mockIdkRequestLog.agent_id,
        mockIdkRequestLog.skill_id,
        userDataStorageConnector,
      );

      expect(realtimeEvaluations).toEqual([]);

      // Trigger with empty evaluations should be safe
      await triggerRealtimeEvaluations(
        mockIdkRequestLog,
        realtimeEvaluations,
        {},
        userDataStorageConnector,
      );

      // No dataset operations should occur
      expect(userDataStorageConnector.addLogsToDataset).not.toHaveBeenCalled();
    });
  });
});
