import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import type {
  EvaluationMethodDetails,
  EvaluationMethodName,
  EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

// The API now returns the JSON schema directly
export type EvaluationMethodSchema = Record<string, unknown>;

export interface EvaluationExecutionResponse {
  evaluation_run_id: string;
  status: string;
  message: string;
}

/**
 * Get all available evaluation methods
 */
export async function getEvaluationMethods(): Promise<
  EvaluationMethodDetails[]
> {
  const response = await client.v1.idk.evaluations.methods.$get();

  if (!response.ok) {
    throw new Error('Failed to fetch evaluation methods');
  }

  return response.json();
}

/**
 * Get details for a specific evaluation method
 */
export async function getEvaluationMethodDetails(
  method: EvaluationMethodName,
): Promise<EvaluationMethodDetails> {
  const response = await client.v1.idk.evaluations.methods[':method'].$get({
    param: { method },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch details for method: ${method}`);
  }

  return response.json();
}

/**
 * Get schema for a specific evaluation method
 */
export async function getEvaluationMethodSchema(
  method: EvaluationMethodName,
): Promise<EvaluationMethodSchema> {
  const response = await client.v1.idk.evaluations.methods[
    ':method'
  ].schema.$get({
    param: { method },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch schema for method: ${method}`);
  }

  return response.json() as Promise<EvaluationMethodSchema>;
}

/**
 * Execute an evaluation
 */
export async function executeEvaluation(
  request: EvaluationMethodRequest,
): Promise<EvaluationExecutionResponse> {
  const response = await client.v1.idk.evaluations.methods.execute.$post({
    json: request,
  });

  if (!response.ok) {
    throw new Error('Failed to execute evaluation');
  }

  return response.json() as Promise<EvaluationExecutionResponse>;
}
