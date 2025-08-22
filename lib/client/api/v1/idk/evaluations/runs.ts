import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  DataPointOutput,
  type DataPointOutputQueryParams,
} from '@shared/types/data/data-point-output';
import {
  EvaluationRun,
  type EvaluationRunCreateParams,
  type EvaluationRunQueryParams,
  type EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';

import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function queryEvaluationRuns(
  params: EvaluationRunQueryParams,
): Promise<EvaluationRun[]> {
  const response = await client.v1.idk.evaluations.runs.$get({
    query: {
      id: params.id,
      dataset_id: params.dataset_id,
      agent_id: params.agent_id,
      evaluation_method: params.evaluation_method,
      name: params.name,
      status: params.status,
      limit: params.limit !== undefined ? params.limit.toString() : undefined,
      offset:
        params.offset !== undefined ? params.offset.toString() : undefined,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to query evaluation runs');
  }

  return EvaluationRun.array().parse(await response.json());
}

export async function getEvaluationRun(id: string): Promise<EvaluationRun> {
  const response = await client.v1.idk.evaluations.runs[':runId'].$get({
    param: {
      runId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get evaluation run');
  }

  return EvaluationRun.parse(await response.json());
}

export async function createEvaluationRun(
  params: EvaluationRunCreateParams,
): Promise<EvaluationRun> {
  const response = await client.v1.idk.evaluations.runs.$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create evaluation run');
  }

  return EvaluationRun.parse(await response.json());
}

export async function updateEvaluationRun(
  evaluationRunId: string,
  params: EvaluationRunUpdateParams,
): Promise<EvaluationRun> {
  const response = await client.v1.idk.evaluations.runs[
    ':evaluationRunId'
  ].$patch({
    param: {
      evaluationRunId,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update evaluation run');
  }

  return EvaluationRun.parse(await response.json());
}

export async function deleteEvaluationRun(id: string): Promise<void> {
  const response = await client.v1.idk.evaluations.runs[
    ':evaluationRunId'
  ].$delete({
    param: {
      evaluationRunId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete evaluation run');
  }
}

export async function getDataPointOutputs(
  evaluationRunId: string,
  queryParams: DataPointOutputQueryParams,
): Promise<DataPointOutput[]> {
  const response = await client.v1.idk.evaluations.runs[':evaluationRunId'][
    'data-point-outputs'
  ].$get({
    param: {
      evaluationRunId,
    },
    query: {
      ids: queryParams.ids,
      data_point_ids: queryParams.data_point_ids,
      score_min: queryParams.score_min?.toString(),
      score_max: queryParams.score_max?.toString(),
      limit: queryParams.limit?.toString(),
      offset: queryParams.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get evaluation run outputs');
  }

  return DataPointOutput.array().parse(await response.json());
}
