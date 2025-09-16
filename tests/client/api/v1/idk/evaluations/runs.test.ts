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
          id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          name: 'test-run-1',
          description: 'Test evaluation run 1',
          status: EvaluationRunStatus.PENDING,
          agent_id: '296c3860-e34a-4591-a380-031058fff06b',
          skill_id: 'e8a69698-5913-42d2-adcb-83d614d67d59',
          dataset_id: 'c5d97b31-566b-47d1-a370-2999bc16f6af',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          metadata: {},
          results: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '296c3860-e34a-4591-a380-031058fff06b',
          name: 'test-run-2',
          description: 'Test evaluation run 2',
          status: EvaluationRunStatus.COMPLETED,
          agent_id: 'c5d97b31-566b-47d1-a370-2999bc16f6af',
          skill_id: 'f9b70a09-6024-43e3-bdce-94e725e78e6a',
          dataset_id: '359cf706-4b73-491f-9494-e45369a02a6f',
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
        id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        name: 'test-run',
        description: 'Test evaluation run',
        status: EvaluationRunStatus.PENDING,
        agent_id: '296c3860-e34a-4591-a380-031058fff06b',
        skill_id: 'e8a69698-5913-42d2-adcb-83d614d67d59',
        dataset_id: 'c5d97b31-566b-47d1-a370-2999bc16f6af',
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
        'c13d1678-150a-466b-804f-ecc82de3680e',
      );

      expect(
        mockClient.v1.idk.evaluations.runs[':runId'].$get,
      ).toHaveBeenCalledWith({
        param: { runId: 'c13d1678-150a-466b-804f-ecc82de3680e' },
      });
      expect(result).toEqual(EvaluationRun.parse(run));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.runs[':runId'].$get.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        runsApi.getEvaluationRun('a1b2c3d4-e5f6-1890-a234-567890abcdef'),
      ).rejects.toThrow('Failed to get evaluation run');
    });
  });

  describe('createEvaluationRun', () => {
    it('should create and return an evaluation run', async () => {
      const createParams: EvaluationRunCreateParams = {
        name: 'new-run',
        description: 'New evaluation run',
        agent_id: 'c13d1678-150a-466b-804f-ecc82de3680e',
        skill_id: 'e8a69698-5913-42d2-adcb-83d614d67d59',
        dataset_id: '296c3860-e34a-4591-a380-031058fff06b',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        metadata: {},
      };
      const createdRun = {
        id: 'c5d97b31-566b-47d1-a370-2999bc16f6af',
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
          agent_id: 'a1b2c3d4-e5f6-1890-a234-567890abcdef',
          dataset_id: 'b2c3d4e5-f6a7-1901-b345-67890abcdef0',
          skill_id: 'e8a69698-5913-42d2-adcb-83d614d67d59',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          metadata: {},
        }),
      ).rejects.toThrow('Failed to create evaluation run');
    });
  });

  describe('updateEvaluationRun', () => {
    it('should update and return an evaluation run', async () => {
      const runId = '6e86f455-eb2a-44f1-8287-3c20fef205b1';
      const updateParams: EvaluationRunUpdateParams = {
        name: 'updated-run',
        status: EvaluationRunStatus.COMPLETED,
      };
      const updatedRun = {
        id: runId,
        name: 'updated-run',
        description: 'Test evaluation run',
        status: EvaluationRunStatus.COMPLETED,
        agent_id: '3864aa3b-72e6-441b-a845-b92887573a30',
        skill_id: 'e8a69698-5913-42d2-adcb-83d614d67d59',
        dataset_id: '2a87adf8-1a27-4abf-8c25-f3c1d8cebce4',
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
        runsApi.updateEvaluationRun('a1b2c3d4-e5f6-1890-a234-567890abcdef', {
          name: 'updated',
        }),
      ).rejects.toThrow('Failed to update evaluation run');
    });
  });

  describe('deleteEvaluationRun', () => {
    it('should delete an evaluation run', async () => {
      const runId = 'c13d1678-150a-466b-804f-ecc82de3680e';

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

      await expect(
        runsApi.deleteEvaluationRun('a1b2c3d4-e5f6-1890-a234-567890abcdef'),
      ).rejects.toThrow('Failed to delete evaluation run');
    });
  });
});
