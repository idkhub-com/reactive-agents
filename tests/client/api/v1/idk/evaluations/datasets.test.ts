import { Dataset, type DatasetCreateParams } from '@shared/types/data';
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
        datasets: {
          $get: vi.fn(),
          $post: vi.fn(),
          ':datasetId': {
            $patch: vi.fn(),
            $delete: vi.fn(),
            logs: {
              $get: vi.fn(),
              $post: vi.fn(),
              $delete: vi.fn(),
            },
          },
        },
      },
    },
  },
};

vi.doMock('hono/client', () => ({
  hc: vi.fn().mockReturnValue(mockClient),
}));

describe('Dataset API functions', () => {
  let datasetsApi: typeof import('@client/api/v1/idk/evaluations/datasets');

  beforeEach(async () => {
    datasetsApi = await import('@client/api/v1/idk/evaluations/datasets');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDatasets', () => {
    it('should return an array of datasets', async () => {
      const datasets = [
        {
          id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          agent_id: '144a7489-a61a-4a50-81ab-bb8884aabdb2',
          name: 'test1',
          description: 'test desc',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '296c3860-e34a-4591-a380-031058fff06b',
          agent_id: '144a7489-a61a-4a50-81ab-bb8884aabdb2',
          name: 'test2',
          description: 'test desc',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      mockJson.mockResolvedValue(datasets);

      mockClient.v1.idk.evaluations.datasets.$get.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const result = await datasetsApi.getDatasets({ name: 'test' });

      expect(mockClient.v1.idk.evaluations.datasets.$get).toHaveBeenCalledWith({
        query: {
          id: undefined,
          name: 'test',
          limit: undefined,
          offset: undefined,
        },
      });
      expect(result).toEqual(Dataset.array().parse(datasets));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets.$get.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.getDatasets({ name: 'test' })).rejects.toThrow(
        'Failed to query datasets',
      );
    });
  });

  describe('createDataset', () => {
    it('should create and return a dataset', async () => {
      const datasetCreateParams: DatasetCreateParams = {
        name: 'new',
        agent_id: '144a7489-a61a-4a50-81ab-bb8884aabdb2',
        description: 'new desc',
        metadata: {},
      };
      const createdDataset = {
        id: 'c5d97b31-566b-47d1-a370-2999bc16f6af',
        ...datasetCreateParams,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockJson.mockResolvedValue(createdDataset);

      mockClient.v1.idk.evaluations.datasets.$post.mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const result = await datasetsApi.createDataset(datasetCreateParams);

      expect(mockClient.v1.idk.evaluations.datasets.$post).toHaveBeenCalledWith(
        {
          json: datasetCreateParams,
        },
      );
      expect(result).toEqual(Dataset.parse(createdDataset));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets.$post.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        datasetsApi.createDataset({
          name: 'new',
          agent_id: '144a7489-a61a-4a50-81ab-bb8884aabdb2',
          metadata: {},
        }),
      ).rejects.toThrow('Failed to create dataset');
    });
  });

  describe('updateDataset', () => {
    it('should update and return a dataset', async () => {
      const datasetId = 'c13d1678-150a-466b-804f-ecc82de3680e';
      const updatedFields = { name: 'updated' };
      const updatedDataset = {
        id: datasetId,
        agent_id: '144a7489-a61a-4a50-81ab-bb8884aabdb2',
        name: 'updated',
        description: 'test desc',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockJson.mockResolvedValue(updatedDataset);

      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].$patch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await datasetsApi.updateDataset(datasetId, updatedFields);

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId'].$patch,
      ).toHaveBeenCalledWith({
        param: { datasetId },
        json: updatedFields,
      });
      expect(result).toEqual(Dataset.parse(updatedDataset));
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].$patch.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        datasetsApi.updateDataset('1', { name: 'updated' }),
      ).rejects.toThrow('Failed to update dataset');
    });
  });

  describe('deleteDataset', () => {
    it('should delete a dataset', async () => {
      const datasetId = 'c13d1678-150a-466b-804f-ecc82de3680e';

      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].$delete.mockResolvedValue(mockResponse as unknown as Response);

      await datasetsApi.deleteDataset(datasetId);

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId'].$delete,
      ).toHaveBeenCalledWith({
        param: { datasetId },
      });
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].$delete.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.deleteDataset('1')).rejects.toThrow(
        'Failed to delete dataset',
      );
    });
  });

  describe('getDatasetLogs', () => {
    it('should return dataset with logs', async () => {
      const datasetId = 'c13d1678-150a-466b-804f-ecc82de3680e';
      const logs: unknown[] = [];
      mockJson.mockResolvedValue(logs);

      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].logs.$get.mockResolvedValue(mockResponse as unknown as Response);

      const result = await datasetsApi.getDatasetLogs(datasetId, {});

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId'].logs.$get,
      ).toHaveBeenCalledWith({
        param: { datasetId },
        query: {
          ids: undefined,
          hashes: undefined,
          method: undefined,
          endpoint: undefined,
          function_name: undefined,
          status: undefined,
          limit: undefined,
          offset: undefined,
        },
      });
      expect(result).toEqual(logs);
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].logs.$get.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.getDatasetLogs('1', {})).rejects.toThrow(
        'Failed to get dataset',
      );
    });
  });

  describe('addDatasetLogs', () => {
    it('should add logs to a dataset', async () => {
      const datasetId = '1';
      const logIds = ['log1', 'log2'];

      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].logs.$post.mockResolvedValue(mockResponse as unknown as Response);

      await datasetsApi.addDatasetLogs(datasetId, logIds);

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId'].logs.$post,
      ).toHaveBeenCalledWith(
        {
          param: { datasetId },
          json: { logIds: logIds },
        },
        {
          init: undefined,
        },
      );
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].logs.$post.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.addDatasetLogs('1', ['log1'])).rejects.toThrow(
        'Failed to add logs',
      );
    });
  });

  describe('deleteDatasetLogs', () => {
    it('should delete logs from a dataset', async () => {
      const datasetId = '1';
      const logIds = ['log1', 'log2'];

      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].logs.$delete.mockResolvedValue(mockResponse as unknown as Response);

      await datasetsApi.deleteDatasetLogs(datasetId, logIds);

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId'].logs.$delete,
      ).toHaveBeenCalledWith({
        param: { datasetId },
        query: { logIds },
      });
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[
        ':datasetId'
      ].logs.$delete.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(
        datasetsApi.deleteDatasetLogs('1', ['log1']),
      ).rejects.toThrow('Failed to delete logs');
    });
  });
});
