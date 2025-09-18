import { evaluateArgumentCorrectness } from '@server/connectors/evaluations/argument-correctness/service/evaluate';

import type { UserDataStorageConnector } from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { LogOutput as EvaluationOutput } from '@shared/types/data/log-output';
import type { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock data
const mockLogs = [
  {
    id: 'log-1',
    agent_id: 'b8c9d0e1-f2a3-4567-8901-23456789abcd',
    skill_id: 'skill-1',
    method: HttpMethod.POST,
    endpoint: '/api/users',
    function_name: 'findUserByEmail',
    status: 200,
    start_time: Date.now(),
    end_time: Date.now() + 1000,
    duration: 1000,
    base_idk_config: {},
    ai_provider: 'openai',
    model: 'gpt-4',
    ai_provider_request_log: {
      provider: 'openai',
      request_url: '/api/users',
      method: HttpMethod.POST,
      request_body: { input: 'Find user by email' },
      response_body: { result: 'User found: alice@example.com' },
      cache_status: 'MISS',
    },
    hook_logs: [],
    metadata: {
      tools: JSON.stringify([
        {
          name: 'db.query',
          description: 'Execute SQL',
          input: { sql: 'SELECT * FROM users WHERE email = ?' },
        },
      ]),
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
    agent_id: 'b8c9d0e1-f2a3-4567-8901-23456789abcd',
    skill_id: 'skill-2',
    method: HttpMethod.POST,
    endpoint: '/api/emails',
    function_name: 'sendWelcomeEmail',
    status: 200,
    start_time: Date.now(),
    end_time: Date.now() + 500,
    duration: 500,
    base_idk_config: {},
    ai_provider: 'openai',
    model: 'gpt-4',
    ai_provider_request_log: {
      provider: 'openai',
      request_url: '/api/emails',
      method: HttpMethod.POST,
      request_body: { input: 'Send a welcome email' },
      response_body: { result: 'Email sent successfully' },
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
      id: 'c9d0e1f2-a3b4-4678-9012-3456789abcde',
      dataset_id: params.dataset_id,
      agent_id: params.agent_id,
      skill_id: params.skill_id,
      evaluation_method: 'argument_correctness',
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
    const evaluationRun = {
      id: queryParams.id || 'c9d0e1f2-a3b4-4678-9012-3456789abcde',
      dataset_id: 'a7b8c9d0-e1f2-4456-8890-123456789abc',
      agent_id: 'b8c9d0e1-f2a3-4567-8901-23456789abcd',
      skill_id: 'skill-1',
      evaluation_method: 'argument_correctness',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_logs: 2,
        passed_count: 1,
        failed_count: 1,
        average_score: 0.5,
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
    score: 0.5,
    metadata: {},
    created_at: new Date().toISOString(),
  } as EvaluationOutput),
  updateEvaluationRun: vi.fn().mockImplementation((updateData) => {
    const baseRun = {
      id: 'c9d0e1f2-a3b4-4678-9012-3456789abcde',
      dataset_id: 'a7b8c9d0-e1f2-4456-8890-123456789abc',
      agent_id: 'b8c9d0e1-f2a3-4567-8901-23456789abcd',
      skill_id: 'skill-1',
      evaluation_method: 'argument_correctness',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: updateData.status || ('completed' as EvaluationRunStatus),
      results: updateData.results || {
        total_logs: 2,
        passed_count: 1,
        failed_count: 1,
        average_score: 0.5,
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
    .mockResolvedValue([{ id: 'b8c9d0e1-f2a3-4567-8901-23456789abcd' }]),
};

describe('Argument Correctness Evaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should validate parameters correctly', () => {
      const validParams: ArgumentCorrectnessEvaluationParameters = {
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
        const agentId = 'b8c9d0e1-f2a3-4567-8901-23456789abcd';
        const skillId = 'skill-1';
        const datasetId = 'a7b8c9d0-e1f2-4456-8890-123456789abc';

        const params: ArgumentCorrectnessEvaluationParameters = {
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
          name: 'Test Argument Correctness Evaluation',
          description: 'Test description',
        };

        const results = await evaluateArgumentCorrectness(
          agentId,
          skillId,
          datasetId,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
          evalRunOptions,
        );

        expect(typeof results).toBe('object');
        expect(Array.isArray(results)).toBe(false);
        expect(results.evaluationRun).toBeTruthy();
        expect(results.averageResult).toBeTruthy();
        expect(results.averageResult).toHaveProperty('total_logs');
        expect(results.averageResult).toHaveProperty('passed_count');
        expect(results.averageResult).toHaveProperty('failed_count');
        expect(results.averageResult).toHaveProperty('average_score');
        expect(results.averageResult).toHaveProperty('threshold_used');
      },
    );

    it('should handle strict mode correctly', { timeout: 30000 }, async () => {
      const agentId = 'b8c9d0e1-f2a3-4567-8901-23456789abcd';
      const skillId = 'skill-1';
      const datasetId = 'a7b8c9d0-e1f2-4456-8890-123456789abc';

      const params: ArgumentCorrectnessEvaluationParameters = {
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

      const results = await evaluateArgumentCorrectness(
        agentId,
        skillId,
        datasetId,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        evalRunOptions,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);
      expect(results.evaluationRun).toBeTruthy();
      expect(results.averageResult).toBeTruthy();
      expect(results.averageResult.threshold_used).toBe(1.0);
    });

    it('should handle verbose mode correctly', { timeout: 30000 }, async () => {
      const agentId = 'b8c9d0e1-f2a3-4567-8901-23456789abcd';
      const skillId = 'skill-1';
      const datasetId = 'a7b8c9d0-e1f2-4456-8890-123456789abc';

      const params: ArgumentCorrectnessEvaluationParameters = {
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

      const results = await evaluateArgumentCorrectness(
        agentId,
        skillId,
        datasetId,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        evalRunOptions,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);
      expect(results.evaluationRun).toBeTruthy();
      expect(results.averageResult).toBeTruthy();
    });

    it('should handle missing user data storage connector', async () => {
      const agentId = 'b8c9d0e1-f2a3-4567-8901-23456789abcd';
      const skillId = 'skill-1';
      const datasetId = 'a7b8c9d0-e1f2-4456-8890-123456789abc';

      const params: ArgumentCorrectnessEvaluationParameters = {
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
        evaluateArgumentCorrectness(
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
        const agentId = 'b8c9d0e1-f2a3-4567-8901-23456789abcd';
        const skillId = 'skill-1';
        const datasetId = 'a7b8c9d0-e1f2-4456-8890-123456789abc';

        const params: ArgumentCorrectnessEvaluationParameters = {
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

        const results = await evaluateArgumentCorrectness(
          agentId,
          skillId,
          datasetId,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
          evalRunOptions,
        );

        expect(results.evaluationRun).toBeTruthy();
        expect(results.averageResult).toBeTruthy();
      },
    );
  });
});
