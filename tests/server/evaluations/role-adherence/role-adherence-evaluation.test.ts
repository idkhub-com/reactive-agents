import { evaluateRoleAdherenceDataset } from '@server/connectors/evaluations/role-adherence/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DataPointOutput as EvaluationOutput } from '@shared/types/data/data-point-output';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { RoleAdherenceEvaluationParameters } from '@shared/types/idkhub/evaluations/role-adherence';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data
const mockDataPoints = [
  {
    id: 'dp-1',
    dataset_id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    request_body: { input: 'Test input 1' },
    ground_truth: 'Assistant output 1',
    metadata: {
      tools: '[]',
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
      role_definition: 'You are a helpful assistant.',
      instructions: 'Be concise.',
      assistant_output: 'Output 1',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'dp-2',
    dataset_id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    request_body: { input: 'Test input 2' },
    ground_truth: 'Assistant output 2',
    metadata: {
      tools: '[]',
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
      role_definition: 'You are a helpful assistant.',
      assistant_output: 'Output 2',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const mockUserDataStorageConnector = {
  getDataPoints: vi.fn().mockResolvedValue(mockDataPoints),
  createEvaluationRun: vi.fn().mockResolvedValue({
    id: 'c3d4e5f6-a7b8-4012-9456-7890abcdef01',
    dataset_id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
    agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
    evaluation_method: 'role_adherence',
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
      id: queryParams.id || 'c3d4e5f6-a7b8-4012-9456-7890abcdef01',
      dataset_id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
      evaluation_method: 'role_adherence',
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
    const baseRun = {
      id: 'c3d4e5f6-a7b8-4012-9456-7890abcdef01',
      dataset_id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
      evaluation_method: 'role_adherence',
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
  getAgents: vi
    .fn()
    .mockResolvedValue([{ id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0' }]),
};

describe('Role Adherence Evaluation (Dataset)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();

    // Mock successful LLM judge responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    score: 0.8,
                    reasoning:
                      'The assistant adhered well to the role definition',
                    metadata: { role_type: 'assistant' },
                  }),
                },
              ],
            },
          ],
        }),
    });
  });

  it('should successfully evaluate a dataset', async () => {
    const input: DatasetQueryParams = {
      id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      limit: 5,
    };

    const params: RoleAdherenceEvaluationParameters = {
      threshold: 0.5,
      model: 'gpt-4o',
      async_mode: false,
      batch_size: 5,
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
    } as RoleAdherenceEvaluationParameters;

    const results = await evaluateRoleAdherenceDataset(
      input,
      params,
      mockUserDataStorageConnector as unknown as UserDataStorageConnector,
    );

    expect(typeof results).toBe('object');
    expect(results.averageResult).toHaveProperty('average_score');
    expect(results.averageResult).toHaveProperty('total_data_points', 2);
    expect(results.averageResult).toHaveProperty('passed_count');
    expect(results.averageResult).toHaveProperty('failed_count');
    expect(results.averageResult).toHaveProperty('threshold_used', 0.5);
    expect(results.averageResult).toHaveProperty('evaluation_run_id');

    expect(mockUserDataStorageConnector.getDataPoints).toHaveBeenCalledWith(
      'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      { limit: 5, offset: 0 },
    );
  });

  it('should handle strict mode correctly', async () => {
    const input: DatasetQueryParams = {
      id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      limit: 5,
    };

    const params: RoleAdherenceEvaluationParameters = {
      threshold: 0.5,
      model: 'gpt-4o',
      strict_mode: true,
      async_mode: false,
      batch_size: 5,
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
    } as RoleAdherenceEvaluationParameters;

    const results = await evaluateRoleAdherenceDataset(
      input,
      params,
      mockUserDataStorageConnector as unknown as UserDataStorageConnector,
    );

    expect(typeof results).toBe('object');
    expect(results.averageResult).toHaveProperty('threshold_used', 1.0);
    expect(results.averageResult).toHaveProperty('total_data_points', 2);
  });

  it('should handle missing user data storage connector', async () => {
    const input: DatasetQueryParams = {
      id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      limit: 5,
    };

    const params: RoleAdherenceEvaluationParameters = {
      threshold: 0.5,
      model: 'gpt-4o',
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
    } as RoleAdherenceEvaluationParameters;

    await expect(
      evaluateRoleAdherenceDataset(
        input,
        params,
        undefined as unknown as UserDataStorageConnector,
      ),
    ).rejects.toThrow(
      'User data storage connector is required for dataset evaluation',
    );
  });

  it('should create internal LLM judge with correct parameters', async () => {
    const input: DatasetQueryParams = {
      id: 'a1b2c3d4-e5f6-4890-9234-567890abcdef',
      limit: 5,
    };

    const params: RoleAdherenceEvaluationParameters = {
      threshold: 0.7,
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1500,
      agent_id: 'b2c3d4e5-f6a7-4901-9345-67890abcdef0',
      async_mode: false,
    } as RoleAdherenceEvaluationParameters;

    const results = await evaluateRoleAdherenceDataset(
      input,
      params,
      mockUserDataStorageConnector as unknown as UserDataStorageConnector,
    );

    expect(results.averageResult).toHaveProperty('evaluation_run_id');
    expect(results.averageResult).toHaveProperty('total_data_points', 2);
    expect(results.averageResult).toHaveProperty('threshold_used', 0.7);
  }, 15000); // 15 second timeout for LLM API calls
});
