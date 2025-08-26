import { HttpMethod } from '@server/types/http';
import {
  type DataPointCreateParams,
  Dataset,
  type DatasetCreateParams,
} from '@shared/types/data';
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
            'data-points': {
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

  describe('getDatasetDataPoints', () => {
    it('should return dataset with data points', async () => {
      const datasetId = 'c13d1678-150a-466b-804f-ecc82de3680e';
      const dataPoints: unknown[] = [];
      mockJson.mockResolvedValue(dataPoints);

      mockClient.v1.idk.evaluations.datasets[':datasetId'][
        'data-points'
      ].$get.mockResolvedValue(mockResponse as unknown as Response);

      const result = await datasetsApi.getDatasetDataPoints(datasetId, {});

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId']['data-points']
          .$get,
      ).toHaveBeenCalledWith({
        param: { datasetId },
        query: {
          ids: undefined,
          hashes: undefined,
          method: undefined,
          endpoint: undefined,
          function_name: undefined,
          is_golden: undefined,
          limit: undefined,
          offset: undefined,
        },
      });
      expect(result).toEqual(dataPoints);
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[':datasetId'][
        'data-points'
      ].$get.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.getDatasetDataPoints('1', {})).rejects.toThrow(
        'Failed to get dataset',
      );
    });
  });

  describe('addDataPoints', () => {
    it('should add data points to a dataset', async () => {
      const datasetId = '1';
      const dataPointsCreateParams: DataPointCreateParams[] = [
        {
          endpoint: 'endpoint1',
          metadata: {},
          function_name: 'function_name1',
          method: HttpMethod.POST,
          is_golden: false,
          request_body: { key: 'value' },
        },
      ];
      const createdDataPoints = [
        {
          id: 'c13d1678-150a-466b-804f-ecc82de3680e',
          endpoint: 'endpoint1',
          metadata: {},
          function_name: 'function_name1',
          method: HttpMethod.POST,
          is_golden: false,
          request_body: { key: 'value' },
          created_at: new Date().toISOString(),
        },
      ];
      mockJson.mockResolvedValue(createdDataPoints);

      mockClient.v1.idk.evaluations.datasets[':datasetId'][
        'data-points'
      ].$post.mockResolvedValue(mockResponse as unknown as Response);

      const result = await datasetsApi.addDataPoints(
        datasetId,
        dataPointsCreateParams,
      );

      expect(result).toEqual(createdDataPoints);

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId']['data-points']
          .$post,
      ).toHaveBeenCalledWith(
        {
          param: { datasetId },
          json: dataPointsCreateParams,
        },
        {
          init: undefined,
        },
      );
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[':datasetId'][
        'data-points'
      ].$post.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.addDataPoints('1', [])).rejects.toThrow(
        'Failed to add data points',
      );
    });
  });

  describe('deleteDataPoints', () => {
    it('should delete data points from a dataset', async () => {
      const datasetId = '1';
      const dataPointIds = ['dp1', 'dp2'];

      mockClient.v1.idk.evaluations.datasets[':datasetId'][
        'data-points'
      ].$delete.mockResolvedValue(mockResponse as unknown as Response);

      await datasetsApi.deleteDataPoints(datasetId, dataPointIds);

      expect(
        mockClient.v1.idk.evaluations.datasets[':datasetId']['data-points']
          .$delete,
      ).toHaveBeenCalledWith({
        param: { datasetId },
        query: { dataPointIds },
      });
    });

    it('should throw an error if the request fails', async () => {
      mockClient.v1.idk.evaluations.datasets[':datasetId'][
        'data-points'
      ].$delete.mockResolvedValue({
        ...mockResponse,
        ok: false,
      } as unknown as Response);

      await expect(datasetsApi.deleteDataPoints('1', ['dp1'])).rejects.toThrow(
        'Failed to delete data points',
      );
    });
  });
});
