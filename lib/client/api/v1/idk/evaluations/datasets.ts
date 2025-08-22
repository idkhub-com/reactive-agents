import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  DataPoint,
  type DataPointCreateParams,
  type DataPointQueryParams,
  Dataset,
  type DatasetCreateParams,
  type DatasetQueryParams,
  type DatasetUpdateParams,
} from '@shared/types/data';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function getDatasets(
  params: DatasetQueryParams,
): Promise<Dataset[]> {
  const response = await client.v1.idk.evaluations.datasets.$get({
    query: {
      id: params.id,
      agent_id: params.agent_id,
      name: params.name,
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to query datasets');
  }

  return Dataset.array().parse(await response.json());
}

export async function createDataset(
  params: DatasetCreateParams,
): Promise<Dataset> {
  const response = await client.v1.idk.evaluations.datasets.$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create dataset');
  }

  return Dataset.parse(await response.json());
}

export async function updateDataset(
  datasetId: string,
  params: DatasetUpdateParams,
): Promise<Dataset> {
  const response = await client.v1.idk.evaluations.datasets[
    ':datasetId'
  ].$patch({
    param: {
      datasetId,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update dataset');
  }

  return Dataset.parse(await response.json());
}

export async function deleteDataset(id: string): Promise<void> {
  const response = await client.v1.idk.evaluations.datasets[
    ':datasetId'
  ].$delete({
    param: {
      datasetId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete dataset');
  }
}

export async function getDatasetDataPoints(
  datasetId: string,
  queryParams: DataPointQueryParams,
): Promise<DataPoint[]> {
  const response = await client.v1.idk.evaluations.datasets[':datasetId'][
    'data-points'
  ].$get({
    param: {
      datasetId,
    },
    query: {
      ids: queryParams.ids,
      method: queryParams.method?.toString(),
      endpoint: queryParams.endpoint?.toString(),
      function_name: queryParams.function_name?.toString(),
      is_golden: queryParams.is_golden?.toString(),
      limit: queryParams.limit?.toString(),
      offset: queryParams.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get dataset');
  }

  return DataPoint.array().parse(await response.json());
}

export async function addDataPoints(
  datasetId: string,
  dataPointCreateParams: DataPointCreateParams[],
  options?: { signal?: AbortSignal },
): Promise<DataPoint[]> {
  const response = await client.v1.idk.evaluations.datasets[':datasetId'][
    'data-points'
  ].$post(
    {
      param: {
        datasetId,
      },
      json: dataPointCreateParams,
    },
    {
      init: options?.signal ? { signal: options.signal } : undefined,
    },
  );

  if (!response.ok) {
    throw new Error('Failed to add data points');
  }

  return DataPoint.array().parse(await response.json());
}

export async function deleteDataPoints(
  datasetId: string,
  dataPointIds: string[],
): Promise<void> {
  const response = await client.v1.idk.evaluations.datasets[':datasetId'][
    'data-points'
  ].$delete({
    param: {
      datasetId,
    },
    query: {
      dataPointIds,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete data points');
  }
}
