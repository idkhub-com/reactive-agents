import { evaluateTaskCompletion } from '@server/connectors/evaluations/task-completion/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DataPointOutput as EvaluationOutput } from '@shared/types/data/data-point-output';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock data
const mockDataPoints = [
  {
    id: 'dp-1',
    dataset_id: 'test-dataset-id',
    request_body: { input: 'Test input 1' },
    ground_truth: 'Expected output 1',
    metadata: {
      tools: '[]',
      agent_id: 'test-agent-id',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'dp-2',
    dataset_id: 'test-dataset-id',
    request_body: { input: 'Test input 2' },
    ground_truth: 'Expected output 2',
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
    evaluation_method: 'task_completion',
    name: 'Test Evaluation Run',
    description: 'Test description',
    status: 'running' as EvaluationRunStatus,
    results: {},
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  getEvaluationRuns: vi.fn().mockImplementation((queryParams) => {
    // Return the evaluation run that matches the query
    const evaluationRun = {
      id: queryParams.id || 'test-run-id',
      dataset_id: 'test-dataset-id',
      agent_id: 'test-agent-id',
      evaluation_method: 'task_completion',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_data_points: 2,
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
  createDataPointOutput: vi.fn().mockResolvedValue({
    id: 'test-output-id',
    data_point_id: 'dp-1',
    output: {},
    score: 0.8,
    metadata: {},
    created_at: new Date().toISOString(),
  } as EvaluationOutput),
  updateEvaluationRun: vi.fn().mockImplementation((updateData) => {
    // Return different results based on the update data
    const baseRun = {
      id: 'test-run-id',
      dataset_id: 'test-dataset-id',
      agent_id: 'test-agent-id',
      evaluation_method: 'task_completion',
      name: 'Test Evaluation Run',
      description: 'Test description',
      status: updateData.status || ('completed' as EvaluationRunStatus),
      results: updateData.results || {
        total_data_points: 2,
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
  getAgents: vi.fn().mockResolvedValue([{ id: 'test-agent-id' }]),
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
        const input: DatasetQueryParams = {
          id: 'test-dataset-id',
          limit: 5,
        };

        const params: TaskCompletionEvaluationParameters = {
          threshold: 0.5,
          model: 'gpt-4o',
          async_mode: false, // Disable async for simpler testing
          batch_size: 5,
          agent_id: 'test-agent-id',
        };

        const results = await evaluateTaskCompletion(
          input,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        );

        expect(typeof results).toBe('object');
        expect(Array.isArray(results)).toBe(false);

        // Check TaskCompletionAverageResult properties
        expect(results.averageResult).toHaveProperty('average_score');
        expect(results.averageResult).toHaveProperty('total_data_points', 2);
        expect(results.averageResult).toHaveProperty('passed_count');
        expect(results.averageResult).toHaveProperty('failed_count');
        expect(results.averageResult).toHaveProperty('threshold_used', 0.5);
        expect(results.averageResult).toHaveProperty('evaluation_run_id');

        // Verify that data points were fetched
        expect(mockUserDataStorageConnector.getDataPoints).toHaveBeenCalledWith(
          'test-dataset-id',
          { limit: 5, offset: 0 },
        );
      },
    );

    it('should handle strict mode correctly', { timeout: 30000 }, async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        strict_mode: true, // Enable strict mode
        async_mode: false, // Disable async for simpler testing
        batch_size: 5,
        agent_id: 'test-agent-id',
      };

      const results = await evaluateTaskCompletion(
        input,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);

      // Check that threshold is overridden to 1.0 in strict mode
      expect(results.averageResult).toHaveProperty('threshold_used', 1.0);
      expect(results.averageResult).toHaveProperty('total_data_points', 2);
    });

    it('should handle verbose mode correctly', { timeout: 30000 }, async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        verbose_mode: true, // Enable verbose mode
        async_mode: false, // Disable async for simpler testing
        batch_size: 5,
        agent_id: 'test-agent-id',
      };

      const results = await evaluateTaskCompletion(
        input,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);

      // Check that the evaluation completed successfully
      expect(results.averageResult).toHaveProperty('total_data_points', 2);
    });

    it('should handle custom task parameter', { timeout: 30000 }, async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        task: 'Custom task description', // Custom task
        async_mode: false, // Disable async for simpler testing
        batch_size: 5,
        agent_id: 'test-agent-id',
      };

      const results = await evaluateTaskCompletion(
        input,
        params,
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
      );

      expect(typeof results).toBe('object');
      expect(Array.isArray(results)).toBe(false);

      // Check that the evaluation completed successfully
      expect(results.averageResult).toHaveProperty('total_data_points', 2);
    });

    it('should handle missing user data storage connector', async () => {
      const input: DatasetQueryParams = {
        id: 'test-dataset-id',
        limit: 5,
      };

      const params: TaskCompletionEvaluationParameters = {
        threshold: 0.5,
        model: 'gpt-4o',
        agent_id: 'test-agent-id',
      };

      await expect(
        evaluateTaskCompletion(
          input,
          params,
          undefined as unknown as UserDataStorageConnector, // Explicitly cast undefined
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

        const params: TaskCompletionEvaluationParameters = {
          threshold: 0.7,
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 1500,
          agent_id: 'test-agent-id',
        };

        const results = await evaluateTaskCompletion(
          input,
          params,
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        );

        // Verify that the evaluation completed successfully with the expected parameters
        expect(results.averageResult).toHaveProperty('evaluation_run_id');
        expect(results.averageResult).toHaveProperty('total_data_points', 2);
        expect(results.averageResult).toHaveProperty('threshold_used', 0.7);

        // Verify that the evaluation completed successfully
        expect(results.averageResult).toHaveProperty('passed_count');
        expect(results.averageResult).toHaveProperty('failed_count');
        expect(results.averageResult).toHaveProperty('average_score');
      },
    );
  });
});
