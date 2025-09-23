import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  Dataset,
  type DatasetCreateParams,
  type DatasetQueryParams,
  type DatasetUpdateParams,
  Log,
  type LogsQueryParams,
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

export async function getDatasetLogs(
  datasetId: string,
  queryParams: LogsQueryParams,
): Promise<Log[]> {
  const response = await client.v1.idk.evaluations.datasets[
    ':datasetId'
  ].logs.$get({
    param: {
      datasetId,
    },
    query: {
      id: queryParams.id,
      agent_id: queryParams.agent_id,
      skill_id: queryParams.skill_id,
      app_id: queryParams.app_id,
      after: queryParams.after?.toString(),
      before: queryParams.before?.toString(),
      method: queryParams.method,
      endpoint: queryParams.endpoint,
      function_name: queryParams.function_name,
      status: queryParams.status?.toString(),
      cache_status: queryParams.cache_status,
      embedding_not_null: queryParams.embedding_not_null ? 'true' : 'false',
      limit: queryParams.limit?.toString(),
      offset: queryParams.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get dataset logs');
  }

  return Log.array().parse(await response.json());
}

export async function addDatasetLogs(
  datasetId: string,
  logIds: string[],
  options?: { signal?: AbortSignal },
): Promise<void> {
  const response = await client.v1.idk.evaluations.datasets[
    ':datasetId'
  ].logs.$post(
    {
      param: {
        datasetId,
      },
      json: { logIds },
    },
    {
      init: options?.signal ? { signal: options.signal } : undefined,
    },
  );

  if (!response.ok) {
    throw new Error('Failed to add logs to dataset');
  }
}

export async function deleteDatasetLogs(
  datasetId: string,
  logIds: string[],
): Promise<void> {
  const response = await client.v1.idk.evaluations.datasets[
    ':datasetId'
  ].logs.$delete({
    param: {
      datasetId,
    },
    query: {
      logIds,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete logs from dataset');
  }
}
