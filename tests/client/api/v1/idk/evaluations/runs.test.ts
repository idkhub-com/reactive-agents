import {
  EvaluationRun,
  type EvaluationRunCreateParams,
  EvaluationRunStatus,
  type EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockJson = vi.fn();

const mockResponse = {
  json: mockJson,
  ok: true,
};

const mockClient = {
  v1: {
    idk: {
      evaluations: {
        runs: {
          $get: vi.fn(),
          $post: vi.fn(),
          ':runId': {
            $get: vi.fn(),
          },
          ':evaluationRunId': {
            $patch: vi.fn(),
            $delete: vi.fn(),
          },
        },
      },
    },
  },
};

vi.doMock('hono/client', () => ({
  hc: vi.fn().mockReturnValue(mockClient),
}));

describe('Evaluation Runs API functions', () => {
  let runsApi: typeof import('@client/api/v1/idk/evaluations/runs');

  beforeEach(async () => {
    runsApi = await import('@client/api/v1/idk/evaluations/runs');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queryEvaluationRuns', () => {
    it('should return an array of evaluation runs', async () => {
      const runs = [
        {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          name: 'test-run-1',
          description: 'Test evaluation run 1',
          status: EvaluationRunStatus.PENDING,
          agent_id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
          dataset_id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          metadata: {},
          results: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
          name: 'test-run-2',
          description: 'Test evaluation run 2',
          status: EvaluationRunStatus.COMPLETED,
          agent_id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01',
          dataset_id: 'd4e5f6a7-b8c9-0123-4567-890abcdef012',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          metadata: {},
          results: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      mockJson.mockResolvedValue(runs);

      mockClient.v1.idk.evaluations.runs.$get.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const result = await runsApi.queryEvaluationRuns({ name: 'test' });

      expect(mockClient.v1.idk.evaluations.runs.$get).toHaveBeenCalledWith({
        query: {
          id: undefined,
          dataset_id: undefined,
          agent_id: undefined,
          evaluation_method: undefined,
          name: 'test',
          status: undefined,
          limit: undefined,
          offset: undefined,
        },
      });
      expect(result).toEqual(EvaluationRun.array().parse(runs));
    });

    it('should handle limit and offset parameters', async () => {
      const runs: unknown[] = [];
      mockJson.mockResolvedValue(runs);

      mockClient.v1.idk.evaluations.runs.$get.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      await runsApi.queryEvaluationRuns({ limit: 10, offset: 20 });

      expect(mockClient.v1.idk.evaluations.runs.$get).toHaveBeenCalledWith({
        query: {
          id: undefined,
          dataset_id: undefined,
          agent_id: undefined,
          evaluation_method: undefined,
          name: undefined,
          status: undefined,
          limit: '10',
          offset: '20',
        },
      });
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.runs.$get.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        runsApi.queryEvaluationRuns({ name: 'test' }),
      ).rejects.toThrow('Failed to query evaluation runs');
    });
  });

  describe('getEvaluationRun', () => {
    it('should return a single evaluation run', async () => {
      const run = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'test-run',
        description: 'Test evaluation run',
        status: EvaluationRunStatus.PENDING,
        agent_id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
        dataset_id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        metadata: {},
        results: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockJson.mockResolvedValue(run);

      mockClient.v1.idk.evaluations.runs[':runId'].$get.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const result = await runsApi.getEvaluationRun(
        'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      );

      expect(
        mockClient.v1.idk.evaluations.runs[':runId'].$get,
      ).toHaveBeenCalledWith({
        param: { runId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
      });
      expect(result).toEqual(EvaluationRun.parse(run));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.runs[':runId'].$get.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(runsApi.getEvaluationRun('test-id')).rejects.toThrow(
        'Failed to get evaluation run',
      );
    });
  });

  describe('createEvaluationRun', () => {
    it('should create and return an evaluation run', async () => {
      const createParams: EvaluationRunCreateParams = {
        name: 'new-run',
        description: 'New evaluation run',
        agent_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        dataset_id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        metadata: {},
      };
      const createdRun = {
        id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01',
        ...createParams,
        status: EvaluationRunStatus.PENDING,
        results: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockJson.mockResolvedValue(createdRun);

      mockClient.v1.idk.evaluations.runs.$post.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const result = await runsApi.createEvaluationRun(createParams);

      expect(mockClient.v1.idk.evaluations.runs.$post).toHaveBeenCalledWith({
        json: createParams,
      });
      expect(result).toEqual(EvaluationRun.parse(createdRun));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.runs.$post.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        runsApi.createEvaluationRun({
          name: 'new-run',
          agent_id: 'agent-id',
          dataset_id: 'dataset-id',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          metadata: {},
        }),
      ).rejects.toThrow('Failed to create evaluation run');
    });
  });

  describe('updateEvaluationRun', () => {
    it('should update and return an evaluation run', async () => {
      const runId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const updateParams: EvaluationRunUpdateParams = {
        name: 'updated-run',
        status: EvaluationRunStatus.COMPLETED,
      };
      const updatedRun = {
        id: runId,
        name: 'updated-run',
        description: 'Test evaluation run',
        status: EvaluationRunStatus.COMPLETED,
        agent_id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef0',
        dataset_id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef01',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        metadata: {},
        results: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockJson.mockResolvedValue(updatedRun);

      mockClient.v1.idk.evaluations.runs[
        ':evaluationRunId'
      ].$patch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await runsApi.updateEvaluationRun(runId, updateParams);

      expect(
        mockClient.v1.idk.evaluations.runs[':evaluationRunId'].$patch,
      ).toHaveBeenCalledWith({
        param: { evaluationRunId: runId },
        json: updateParams,
      });
      expect(result).toEqual(EvaluationRun.parse(updatedRun));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.runs[
        ':evaluationRunId'
      ].$patch.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        runsApi.updateEvaluationRun('test-id', { name: 'updated' }),
      ).rejects.toThrow('Failed to update evaluation run');
    });
  });

  describe('deleteEvaluationRun', () => {
    it('should delete an evaluation run', async () => {
      const runId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

      mockClient.v1.idk.evaluations.runs[
        ':evaluationRunId'
      ].$delete.mockResolvedValue(mockResponse as unknown as Response);

      await runsApi.deleteEvaluationRun(runId);

      expect(
        mockClient.v1.idk.evaluations.runs[':evaluationRunId'].$delete,
      ).toHaveBeenCalledWith({
        param: { evaluationRunId: runId },
      });
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.runs[
        ':evaluationRunId'
      ].$delete.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(runsApi.deleteEvaluationRun('test-id')).rejects.toThrow(
        'Failed to delete evaluation run',
      );
    });
  });
});
