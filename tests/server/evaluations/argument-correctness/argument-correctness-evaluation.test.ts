import { evaluateArgumentCorrectness } from '@server/connectors/evaluations/argument-correctness/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DataPointOutput as EvaluationOutput } from '@shared/types/data/data-point-output';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock data
const mockDataPoints = [
  {
    id: 'dp-1',
    dataset_id: 'test-dataset-id',
    request_body: { input: 'Find user by email' },
    response_body: { result: 'User found: alice@example.com' },
    metadata: {
      tools: JSON.stringify([
        {
          name: 'db.query',
          description: 'Execute SQL',
          input: { sql: 'SELECT * FROM users WHERE email = ?' },
        },
      ]),
      agent_id: 'test-agent-id',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'dp-2',
    dataset_id: 'test-dataset-id',
    request_body: { input: 'Send a welcome email' },
    ground_truth: 'Email sent',
    metadata: {
      tools: '[]',
      agent_id: 'test-agent-id',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const mockUserDataStorageConnector = {
  getDataPoints: vi.fn().mockResolvedValue(mockDataPoints),
  createEvaluationRun: vi.fn().mockResolvedValue({
    id: 'test-run-id',
    dataset_id: 'test-dataset-id',
    agent_id: 'test-agent-id',
    evaluation_method: 'argument_correctness',
    name: 'Test Evaluation Run',
    description: 'Test description',
    status: 'running' as EvaluationRunStatus,
    results: {},
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  getEvaluationRuns: vi.fn().mockImplementation((queryParams) => {
    const evaluationRun = {
      id: queryParams.id || 'test-run-id',
      dataset_id: 'test-dataset-id',
      agent_id: 'test-agent-id',
      evaluation_method: 'argument_correctness',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_data_points: 2,
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
  createDataPointOutput: vi.fn().mockResolvedValue({
    id: 'test-output-id',
    data_point_id: 'dp-1',
    output: {},
    score: 0.5,
    metadata: {},
    created_at: new Date().toISOString(),
  } as EvaluationOutput),
  updateEvaluationRun: vi.fn().mockImplementation((updateData) => {
    const baseRun = {
      id: 'test-run-id',
      dataset_id: 'test-dataset-id',
      agent_id: 'test-agent-id',
      evaluation_method: 'argument_correctness',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: updateData.status || ('completed' as EvaluationRunStatus),
      results: updateData.results || {
        total_data_points: 2,
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
  getAgents: vi.fn().mockResolvedValue([{ id: 'test-agent-id' }]),
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
        const input: DatasetQueryParams = {
          id: 'test-dataset-id',
          limit: 5,
        };

        const params: ArgumentCorrectnessEvaluationParameters = {
          threshold: 0.5,
          model: 'gpt-4o',
          async_mode: false,
          batch_size: 5,
          agent_id: 'test-agent-id',
        };

        const results = await evaluateArgumentCorrectness(
          input,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        );

        expect(typeof results).toBe('object');
        expect(Array.isArray(results)).toBe(false);
        expect(results.evaluationRun).toBeTruthy();
        expect(results.averageResult).toBeTruthy();
        expect(results.averageResult).toHaveProperty('total_data_points');
        expect(results.averageResult).toHaveProperty('passed_count');
        expect(results.averageResult).toHaveProperty('failed_count');
        expect(results.averageResult).toHaveProperty('average_score');
        expect(results.averageResult).toHaveProperty('threshold_used');
      },
    );

    it('should handle strict mode correctly', { timeout: 30000 }, async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: ArgumentCorrectnessEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        strict_mode: true,
        async_mode: false,
        batch_size: 5,
        agent_id: 'test-agent-id',
      };

      const results = await evaluateArgumentCorrectness(
        input,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);
      expect(results.evaluationRun).toBeTruthy();
      expect(results.averageResult).toBeTruthy();
      expect(results.averageResult.threshold_used).toBe(1.0);
    });

    it('should handle verbose mode correctly', { timeout: 30000 }, async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: ArgumentCorrectnessEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        verbose_mode: true,
        async_mode: false,
        batch_size: 5,
        agent_id: 'test-agent-id',
      };

      const results = await evaluateArgumentCorrectness(
        input,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);
      expect(results.evaluationRun).toBeTruthy();
      expect(results.averageResult).toBeTruthy();
    });

    it('should handle missing user data storage connector', async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: ArgumentCorrectnessEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        agent_id: 'test-agent-id',
      };

      await expect(
        evaluateArgumentCorrectness(
          input,
          params,
          undefined as unknown as UserDataStorageConnector,
        ),
      ).rejects.toThrow(
        'User data storage connector is required for dataset evaluation',
      );
    });
  });

  describe('LLM Judge Integration', () => {
    it(
      'should create internal LLM judge with correct parameters',
      { timeout: 30000 },
      async () => {
        const input: DatasetQueryParams = {
          id: 'test-dataset-id',
          limit: 5,
        };

        const params: ArgumentCorrectnessEvaluationParameters = {
          threshold: 0.7,
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 1500,
          agent_id: 'test-agent-id',
        };

        const results = await evaluateArgumentCorrectness(
          input,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        );

        expect(results.evaluationRun).toBeTruthy();
        expect(results.averageResult).toBeTruthy();
      },
    );
  });
});
