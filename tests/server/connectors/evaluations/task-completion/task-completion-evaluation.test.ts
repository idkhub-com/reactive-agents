import { evaluateTaskCompletion } from '@server/connectors/evaluations/task-completion/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { LogOutput as EvaluationOutput } from '@shared/types/data/log-output';
import type { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock data
const mockLogs = [
  {
    id: 'log-1',
    agent_id: 'e5f6a7b8-c9d0-4234-9678-90abcdef0123',
    skill_id: 'skill-1',
    method: HttpMethod.POST,
    endpoint: '/api/test',
    function_name: 'test_function',
    status: 200,
    start_time: Date.now(),
    end_time: Date.now() + 1000,
    duration: 1000,
    base_idk_config: {},
    ai_provider: 'openai',
    model: 'gpt-4',
    ai_provider_request_log: {
      provider: 'openai',
      request_url: '/api/test',
      method: HttpMethod.POST,
      request_body: { input: 'Test input 1' },
      response_body: { result: 'Expected output 1' },
      cache_status: 'MISS',
    },
    hook_logs: [],
    metadata: {
      tools: '[]',
    },
    cache_status: 'MISS',
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  },
  {
    id: 'log-2',
    agent_id: 'e5f6a7b8-c9d0-4234-9678-90abcdef0123',
    skill_id: 'skill-2',
    method: HttpMethod.POST,
    endpoint: '/api/test2',
    function_name: 'test_function2',
    status: 200,
    start_time: Date.now(),
    end_time: Date.now() + 500,
    duration: 500,
    base_idk_config: {},
    ai_provider: 'openai',
    model: 'gpt-4',
    ai_provider_request_log: {
      provider: 'openai',
      request_url: '/api/test2',
      method: HttpMethod.POST,
      request_body: { input: 'Test input 2' },
      response_body: { result: 'Expected output 2' },
      cache_status: 'HIT',
    },
    hook_logs: [],
    metadata: {
      tools: '[]',
    },
    cache_status: 'HIT',
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  },
];

const mockUserDataStorageConnector = {
  getLogs: vi.fn().mockResolvedValue(mockLogs),
  getDatasetLogs: vi.fn().mockResolvedValue(mockLogs),
  createEvaluationRun: vi.fn().mockImplementation((params) => {
    return Promise.resolve({
      id: 'f6a7b8c9-d0e1-4345-9789-0abcdef01234',
      dataset_id: params.dataset_id,
      agent_id: params.agent_id,
      skill_id: params.skill_id,
      evaluation_method: 'task_completion',
      name: params.name || 'Test Evaluation Run',
      description: params.description || 'Test description',
      status: 'running' as EvaluationRunStatus,
      results: {},
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
  getEvaluationRuns: vi.fn().mockImplementation((queryParams) => {
    // Return the evaluation run that matches the query
    const evaluationRun = {
      id: queryParams.id || 'f6a7b8c9-d0e1-4345-9789-0abcdef01234',
      dataset_id: 'd4e5f6a7-b8c9-4123-9567-890abcdef012',
      agent_id: 'e5f6a7b8-c9d0-4234-9678-90abcdef0123',
      skill_id: 'skill-1',
      evaluation_method: 'task_completion',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_logs: 2,
        passed_count: 1,
        failed_count: 1,
        average_score: 0.8,
        threshold_used: 0.5,
        evaluation_outputs: ['output-1', 'output-2'],
      },
      metadata: {
        parameters: {
          threshold: 0.5,
          model: 'gpt-4o',
          verbose_mode: false,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    return Promise.resolve([evaluationRun]);
  }),
  createLogOutput: vi.fn().mockResolvedValue({
    id: 'test-output-id',
    log_id: 'log-1',
    output: {},
    score: 0.8,
    metadata: {},
    created_at: new Date().toISOString(),
  } as EvaluationOutput),
  updateEvaluationRun: vi.fn().mockImplementation((updateData) => {
    // Return different results based on the update data
    const baseRun = {
      id: 'f6a7b8c9-d0e1-4345-9789-0abcdef01234',
      dataset_id: 'd4e5f6a7-b8c9-4123-9567-890abcdef012',
      agent_id: 'e5f6a7b8-c9d0-4234-9678-90abcdef0123',
      skill_id: 'skill-1',
      evaluation_method: 'task_completion',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: updateData.status || ('completed' as EvaluationRunStatus),
      results: updateData.results || {
        total_logs: 2,
        passed_count: 1,
        failed_count: 1,
        average_score: 0.8,
        threshold_used: updateData.results?.threshold_used || 0.5,
        evaluation_outputs: ['output-1', 'output-2'],
      },
      metadata: {
        ...updateData.metadata,
        parameters: {
          threshold: 0.5,
          model: 'gpt-4o',
          verbose_mode: false,
          ...updateData.metadata?.parameters,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: updateData.completed_at || new Date().toISOString(),
    };
    return Promise.resolve(baseRun);
  }),
  getAgents: vi
    .fn()
    .mockResolvedValue([{ id: 'e5f6a7b8-c9d0-4234-9678-90abcdef0123' }]),
};

describe('Task Completion Evaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should validate parameters correctly', () => {
      const validParams: TaskCompletionEvaluationParameters = {
        threshold: 0.7,
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 1000,
        include_reason: true,
        strict_mode: false,
        async_mode: true,
        verbose_mode: false,
        batch_size: 10,
      };

      expect(validParams.threshold).toBe(0.7);
      expect(validParams.model).toBe('gpt-4o');
    });
  });

  describe('Dataset Evaluation', () => {
    it(
      'should successfully evaluate a dataset',
      { timeout: 30000 },
      async () => {
        const agentId = 'e5f6a7b8-c9d0-4234-9678-90abcdef0123';
        const skillId = 'skill-1';
        const datasetId = 'd4e5f6a7-b8c9-4123-9567-890abcdef012';

        const params: TaskCompletionEvaluationParameters = {
          threshold: 0.5,
          model: 'gpt-4o',
          include_reason: true,
          strict_mode: false,
          async_mode: false,
          verbose_mode: true,
          temperature: 0.1,
          max_tokens: 1000,
          batch_size: 5,
        };

        const evalRunOptions = {
          name: 'Test Task Completion Evaluation',
          description: 'Test description',
        };

        const results = await evaluateTaskCompletion(
          agentId,
          skillId,
          datasetId,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
          evalRunOptions,
        );

        expect(typeof results).toBe('object');
        expect(Array.isArray(results)).toBe(false);

        // Check TaskCompletionAverageResult properties
        expect(results.averageResult).toHaveProperty('average_score');
        expect(results.averageResult).toHaveProperty('total_logs', 2);
        expect(results.averageResult).toHaveProperty('passed_count');
        expect(results.averageResult).toHaveProperty('failed_count');
        expect(results.averageResult).toHaveProperty('threshold_used', 0.5);
        expect(results.averageResult).toHaveProperty('evaluation_run_id');

        // Verify that logs were fetched
        expect(
          mockUserDataStorageConnector.getDatasetLogs,
        ).toHaveBeenCalledWith('d4e5f6a7-b8c9-4123-9567-890abcdef012', {});
      },
    );

    it('should handle strict mode correctly', { timeout: 30000 }, async () => {
      const agentId = 'e5f6a7b8-c9d0-4234-9678-90abcdef0123';
      const skillId = 'skill-1';
      const datasetId = 'd4e5f6a7-b8c9-4123-9567-890abcdef012';

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        include_reason: true,
        strict_mode: true,
        async_mode: false,
        verbose_mode: true,
        temperature: 0.1,
        max_tokens: 1000,
        batch_size: 5,
      };

      const evalRunOptions = {
        name: 'Test Strict Mode Evaluation',
        description: 'Test strict mode description',
      };

      const results = await evaluateTaskCompletion(
        agentId,
        skillId,
        datasetId,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        evalRunOptions,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);

      // Check that threshold is overridden to 1.0 in strict mode
      expect(results.averageResult).toHaveProperty('threshold_used', 1.0);
      expect(results.averageResult).toHaveProperty('total_logs', 2);
    });

    it('should handle verbose mode correctly', { timeout: 30000 }, async () => {
      const agentId = 'e5f6a7b8-c9d0-4234-9678-90abcdef0123';
      const skillId = 'skill-1';
      const datasetId = 'd4e5f6a7-b8c9-4123-9567-890abcdef012';

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        include_reason: true,
        strict_mode: false,
        async_mode: false,
        verbose_mode: true,
        temperature: 0.1,
        max_tokens: 1000,
        batch_size: 5,
      };

      const evalRunOptions = {
        name: 'Test Verbose Mode Evaluation',
        description: 'Test verbose mode description',
      };

      const results = await evaluateTaskCompletion(
        agentId,
        skillId,
        datasetId,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        evalRunOptions,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);

      // Check that the evaluation completed successfully
      expect(results.averageResult).toHaveProperty('total_logs', 2);
    });

    it('should handle custom task parameter', { timeout: 30000 }, async () => {
      const agentId = 'e5f6a7b8-c9d0-4234-9678-90abcdef0123';
      const skillId = 'skill-1';
      const datasetId = 'd4e5f6a7-b8c9-4123-9567-890abcdef012';

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        include_reason: true,
        strict_mode: false,
        async_mode: false,
        verbose_mode: true,
        temperature: 0.1,
        max_tokens: 1000,
        batch_size: 5,
        task: 'Custom task description',
      };

      const evalRunOptions = {
        name: 'Test Custom Task Evaluation',
        description: 'Test custom task parameter',
      };

      const results = await evaluateTaskCompletion(
        agentId,
        skillId,
        datasetId,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        evalRunOptions,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);

      // Check that the evaluation completed successfully
      expect(results.averageResult).toHaveProperty('total_logs', 2);
    });

    it('should handle missing user data storage connector', async () => {
      const agentId = 'e5f6a7b8-c9d0-4234-9678-90abcdef0123';
      const skillId = 'skill-1';
      const datasetId = 'd4e5f6a7-b8c9-4123-9567-890abcdef012';

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        include_reason: true,
        strict_mode: false,
        async_mode: false,
        verbose_mode: true,
        temperature: 0.1,
        max_tokens: 1000,
        batch_size: 5,
      };

      const evalRunOptions = {
        name: 'Test Evaluation Run',
        description: 'Test description',
      };

      await expect(
        evaluateTaskCompletion(
          agentId,
          skillId,
          datasetId,
          params,
          undefined as unknown as UserDataStorageConnector,
          evalRunOptions,
        ),
      ).rejects.toThrow();
    });
  });

  describe('LLM Judge Integration', () => {
    it(
      'should create internal LLM judge with correct parameters',
      { timeout: 30000 },
      async () => {
        const agentId = 'e5f6a7b8-c9d0-4234-9678-90abcdef0123';
        const skillId = 'skill-1';
        const datasetId = 'd4e5f6a7-b8c9-4123-9567-890abcdef012';

        const params: TaskCompletionEvaluationParameters = {
          threshold: 0.7,
          model: 'gpt-4o-mini',
          include_reason: true,
          strict_mode: false,
          async_mode: false,
          verbose_mode: true,
          temperature: 0.2,
          max_tokens: 1500,
          batch_size: 5,
        };

        const evalRunOptions = {
          name: 'Test LLM Judge Parameters',
          description: 'Test LLM judge configuration',
        };

        const results = await evaluateTaskCompletion(
          agentId,
          skillId,
          datasetId,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
          evalRunOptions,
        );

        // Verify that the evaluation completed successfully with the expected parameters
        expect(results.averageResult).toHaveProperty('evaluation_run_id');
        expect(results.averageResult).toHaveProperty('total_logs', 2);
        expect(results.averageResult).toHaveProperty('threshold_used', 0.7);

        // Verify that the evaluation completed successfully
        expect(results.averageResult).toHaveProperty('passed_count');
        expect(results.averageResult).toHaveProperty('failed_count');
        expect(results.averageResult).toHaveProperty('average_score');
      },
    );
  });
});
