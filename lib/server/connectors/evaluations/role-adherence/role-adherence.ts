import { evaluateRoleAdherenceDataset } from '@server/connectors/evaluations/role-adherence/service/evaluate';
import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import {
  RoleAdherenceEvaluationParameters,
  type RoleAdherenceEvaluationParameters as RoleAdherenceEvaluationParametersType,
} from '@shared/types/idkhub/evaluations/role-adherence';

const roleAdherenceMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.ROLE_ADHERENCE,
  name: 'Role Adherence',
  description:
    'Evaluates whether assistant output adheres to a specified role and constraints using LLM-as-a-judge',
} as const;

async function runEvaluation(
  request: EvaluationMethodRequest,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsed = RoleAdherenceEvaluationParameters.safeParse(
    request.parameters,
  );
  if (!parsed.success) {
    throw new Error(
      `Invalid RoleAdherenceEvaluationParameters: ${parsed.error.message}`,
    );
  }
  const typedParams = parsed.data as RoleAdherenceEvaluationParametersType;

  const params: RoleAdherenceEvaluationParametersType = {
    threshold: typedParams.threshold ?? 0.5,
    model: typedParams.model ?? 'gpt-4o',
    temperature: typedParams.temperature ?? 0.1,
    max_tokens: typedParams.max_tokens ?? 1000,
    include_reason: typedParams.include_reason !== false,
    strict_mode: typedParams.strict_mode ?? false,
    async_mode: typedParams.async_mode !== false,
    verbose_mode: typedParams.verbose_mode ?? false,
    batch_size: typedParams.batch_size ?? 10,
    role_definition: typedParams.role_definition,
    assistant_output: typedParams.assistant_output,
    instructions: typedParams.instructions,
    limit: typedParams.limit,
    offset: typedParams.offset,
    agent_id: request.agent_id,
  };

  const input: DatasetQueryParams = {
    id: request.dataset_id,
    limit: typedParams.limit,
    offset: typedParams.offset,
  };

  const { evaluationRun } = await evaluateRoleAdherenceDataset(
    input,
    params,
    userDataStorageConnector,
    {
      name: request.name,
      description: request.description,
    },
  );
  if (!evaluationRun) {
    throw new Error(
      'Internal evaluation function failed to create evaluation run',
    );
  }
  return evaluationRun;
}

export const roleAdherenceEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => roleAdherenceMethodConfig,
  evaluate: runEvaluation,
  getParameterSchema: RoleAdherenceEvaluationParameters,
};
