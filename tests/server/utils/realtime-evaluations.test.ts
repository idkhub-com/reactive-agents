import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { HttpMethod } from '@server/types/http';
import {
  evaluateExistingLogsInRealtimeDataset,
  findRealtimeEvaluations,
  shouldTriggerRealtimeEvaluation,
  runRealtimeEvaluationsForLog,
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
  id: 'dataset-123',
  agent_id: 'agent-456',
  name: 'Test Realtime Dataset',
  description: null,
  is_realtime: true,
  realtime_size: 3,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockEvaluationRun: EvaluationRun = {
  id: 'eval-run-123',
  dataset_id: 'dataset-123',
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

describe('Realtime Evaluations', () => {
  let mockUserDataStorageConnector: UserDataStorageConnector;

  beforeEach(() => {
    mockUserDataStorageConnector = createMockUserDataStorageConnector();
    vi.clearAllMocks();
  });

  describe('findRealtimeEvaluations', () => {
    it('should return empty array when no realtime datasets exist', async () => {
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([]);

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([]);
      expect(mockUserDataStorageConnector.getDatasets).toHaveBeenCalledWith({
        agent_id: 'agent-456',
        is_realtime: true,
      });
    });

    it('should return evaluation runs for realtime datasets', async () => {
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(
        mockUserDataStorageConnector.getEvaluationRuns,
      ).mockResolvedValue([mockEvaluationRun]);

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([mockEvaluationRun]);
      expect(
        mockUserDataStorageConnector.getEvaluationRuns,
      ).toHaveBeenCalledWith({
        dataset_id: 'dataset-123',
        agent_id: 'agent-456',
        skill_id: 'skill-789',
        status: EvaluationRunStatus.RUNNING,
      });
    });

    it('should handle multiple realtime datasets', async () => {
      const dataset2 = { ...mockRealtimeDataset, id: 'dataset-456' };
      const evaluationRun2 = {
        ...mockEvaluationRun,
        id: 'eval-run-456',
        dataset_id: 'dataset-456',
      };

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
        dataset2,
      ]);
      vi.mocked(mockUserDataStorageConnector.getEvaluationRuns)
        .mockResolvedValueOnce([mockEvaluationRun])
        .mockResolvedValueOnce([evaluationRun2]);

      const result = await findRealtimeEvaluations(
        'agent-456',
        'skill-789',
        mockUserDataStorageConnector,
      );

      expect(result).toEqual([mockEvaluationRun, evaluationRun2]);
      expect(
        mockUserDataStorageConnector.getEvaluationRuns,
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockRejectedValue(
        new Error('Database error'),
      );
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

  describe('triggerRealtimeEvaluations', () => {
    it('should do nothing when no evaluation runs provided', async () => {
      await runRealtimeEvaluationsForLog(
        mockIdkRequestLog,
        [],
        {},
        mockUserDataStorageConnector,
      );

      expect(mockUserDataStorageConnector.getDatasets).not.toHaveBeenCalled();
    });

    it('should trigger evaluations and manage dataset size limits', async () => {
      const mockConnector = createMockEvaluationConnector();
      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      // Mock dataset size management
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue([
        { ...mockIdkRequestLog, id: 'log-1', start_time: 1000 },
        { ...mockIdkRequestLog, id: 'log-2', start_time: 2000 },
        { ...mockIdkRequestLog, id: 'log-3', start_time: 3000 },
        { ...mockIdkRequestLog, id: 'log-4', start_time: 4000 }, // This should be removed as it exceeds limit of 3
      ]);

      await runRealtimeEvaluationsForLog(
        mockIdkRequestLog,
        [mockEvaluationRun],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // For realtime datasets, logs are not managed via bridge table
      // So addLogsToDataset and removeLogsFromDataset should not be called
      expect(
        mockUserDataStorageConnector.addLogsToDataset,
      ).not.toHaveBeenCalled();
      expect(
        mockUserDataStorageConnector.removeLogsFromDataset,
      ).not.toHaveBeenCalled();

      // Verify evaluation was triggered
      expect(mockConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-123',
        mockIdkRequestLog,
        mockUserDataStorageConnector,
      );
    });

    it('should handle evaluation errors gracefully', async () => {
      const mockConnector = createMockEvaluationConnector();
      vi.mocked(mockConnector.evaluateOneLog).mockRejectedValue(
        new Error('Evaluation failed'),
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        [],
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      await runRealtimeEvaluationsForLog(
        mockIdkRequestLog,
        [mockEvaluationRun],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in realtime evaluation eval-run-123 for log log-123:',
        expect.any(Error),
      );
    });

    it('should skip evaluations when no connector found', async () => {
      const evaluationConnectorsMap = {}; // No connectors available

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        [],
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      await runRealtimeEvaluationsForLog(
        mockIdkRequestLog,
        [mockEvaluationRun],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'No connector found for evaluation method: turn_relevancy',
      );
    });

    it('should skip non-realtime datasets', async () => {
      const nonRealtimeDataset = { ...mockRealtimeDataset, is_realtime: false };

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        nonRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        [],
      );

      const mockConnector = createMockEvaluationConnector();
      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      await runRealtimeEvaluationsForLog(
        mockIdkRequestLog,
        [mockEvaluationRun],
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Should not add logs to non-realtime dataset
      expect(
        mockUserDataStorageConnector.addLogsToDataset,
      ).not.toHaveBeenCalled();

      // Should still trigger evaluation though
      expect(mockConnector.evaluateOneLog).toHaveBeenCalled();
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

  describe('evaluateExistingLogsInRealtimeDataset', () => {
    let mockConnector: EvaluationMethodConnector;

    beforeEach(() => {
      mockConnector = createMockEvaluationConnector();
    });

    it('should evaluate existing logs in realtime dataset', async () => {
      const existingLogs = [
        { ...mockIdkRequestLog, id: 'log-1', start_time: 1000 },
        { ...mockIdkRequestLog, id: 'log-2', start_time: 2000 },
        { ...mockIdkRequestLog, id: 'log-3', start_time: 3000 },
      ];

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        existingLogs,
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Verify dataset was fetched to check if realtime
      expect(mockUserDataStorageConnector.getDatasets).toHaveBeenCalledWith({
        id: 'dataset-123',
      });

      // Verify existing logs were retrieved with skill_id filter for realtime datasets
      expect(mockUserDataStorageConnector.getDatasetLogs).toHaveBeenCalledWith(
        'dataset-123',
        {
          skill_id: 'skill-789',
        },
      );

      // Verify all existing logs were evaluated
      expect(mockConnector.evaluateOneLog).toHaveBeenCalledTimes(3);
      expect(mockConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-123',
        existingLogs[0],
        mockUserDataStorageConnector,
      );
      expect(mockConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-123',
        existingLogs[1],
        mockUserDataStorageConnector,
      );
      expect(mockConnector.evaluateOneLog).toHaveBeenCalledWith(
        'eval-run-123',
        existingLogs[2],
        mockUserDataStorageConnector,
      );
    });

    it('should skip non-realtime datasets', async () => {
      const nonRealtimeDataset = { ...mockRealtimeDataset, is_realtime: false };

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        nonRealtimeDataset,
      ]);

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Should not get logs or evaluate
      expect(
        mockUserDataStorageConnector.getDatasetLogs,
      ).not.toHaveBeenCalled();
      expect(mockConnector.evaluateOneLog).not.toHaveBeenCalled();
    });

    it('should handle missing dataset gracefully', async () => {
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([]);

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Should not get logs or evaluate
      expect(
        mockUserDataStorageConnector.getDatasetLogs,
      ).not.toHaveBeenCalled();
      expect(mockConnector.evaluateOneLog).not.toHaveBeenCalled();
    });

    it('should handle empty dataset gracefully', async () => {
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        [],
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Should get logs but not evaluate
      expect(mockUserDataStorageConnector.getDatasetLogs).toHaveBeenCalledWith(
        'dataset-123',
        {
          skill_id: 'skill-789',
        },
      );
      expect(mockConnector.evaluateOneLog).not.toHaveBeenCalled();
    });

    it('should handle missing evaluation connector gracefully', async () => {
      const existingLogs = [
        { ...mockIdkRequestLog, id: 'log-1', start_time: 1000 },
      ];

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        existingLogs,
      );

      // No connectors available
      const evaluationConnectorsMap = {};

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'No connector found for evaluation method: turn_relevancy',
      );
    });

    it('should handle individual evaluation errors gracefully', async () => {
      const existingLogs = [
        { ...mockIdkRequestLog, id: 'log-1', start_time: 1000 },
        { ...mockIdkRequestLog, id: 'log-2', start_time: 2000 },
      ];

      vi.mocked(mockUserDataStorageConnector.getDatasets).mockResolvedValue([
        mockRealtimeDataset,
      ]);
      vi.mocked(mockUserDataStorageConnector.getDatasetLogs).mockResolvedValue(
        existingLogs,
      );

      // Mock first evaluation to fail, second to succeed
      vi.mocked(mockConnector.evaluateOneLog)
        .mockRejectedValueOnce(new Error('Evaluation failed'))
        .mockResolvedValueOnce(undefined);

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      // Both logs should be attempted
      expect(mockConnector.evaluateOneLog).toHaveBeenCalledTimes(2);

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in backfill evaluation of log log-1 for evaluation run eval-run-123:',
        expect.any(Error),
      );
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockUserDataStorageConnector.getDatasets).mockRejectedValue(
        new Error('Database error'),
      );

      const evaluationConnectorsMap = {
        [EvaluationMethodName.TURN_RELEVANCY]: mockConnector,
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation to suppress console output
      });

      await evaluateExistingLogsInRealtimeDataset(
        mockEvaluationRun,
        evaluationConnectorsMap,
        mockUserDataStorageConnector,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in backfill evaluation for evaluation run eval-run-123:',
        expect.any(Error),
      );

      // Should not attempt to evaluate
      expect(mockConnector.evaluateOneLog).not.toHaveBeenCalled();
    });
  });
});
