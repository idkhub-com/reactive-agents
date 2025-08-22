import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationMethodName,
  EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName as Names } from '@shared/types/idkhub/evaluations';
import {
  ArgumentCorrectnessEvaluationParameters,
  type ArgumentCorrectnessEvaluationParameters as ArgumentCorrectnessEvaluationParametersType,
} from '@shared/types/idkhub/evaluations/argument-correctness';

import { evaluateArgumentCorrectness } from './service/evaluate';

const methodConfig: EvaluationMethodDetails = {
  method: Names.ARGUMENT_CORRECTNESS as unknown as EvaluationMethodName,
  name: 'Argument Correctness',
  description:
    'Evaluates whether an agent generated correct tool call arguments given the input and task using LLM-as-a-judge',
} as const;

async function runEvaluation(
  request: EvaluationMethodRequest,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsed = ArgumentCorrectnessEvaluationParameters.safeParse(
    request.parameters,
  );
  if (!parsed.success) {
    throw new Error(
      `Invalid ArgumentCorrectnessEvaluationParameters: ${parsed.error.message}`,
    );
  }
  const typedParams =
    parsed.data as ArgumentCorrectnessEvaluationParametersType;

  const params: ArgumentCorrectnessEvaluationParametersType = {
    threshold: typedParams.threshold || 0.5,
    model: typedParams.model || 'gpt-4o',
    temperature: typedParams.temperature || 0.1,
    max_tokens: typedParams.max_tokens || 1000,
    include_reason: typedParams.include_reason !== false,
    strict_mode: typedParams.strict_mode || false,
    async_mode: typedParams.async_mode !== false,
    verbose_mode: typedParams.verbose_mode || false,
    batch_size: typedParams.batch_size || 10,
    input: typedParams.input,
    actual_output: typedParams.actual_output,
    tools_called: typedParams.tools_called,
    limit: typedParams.limit,
    offset: typedParams.offset,
    agent_id: request.agent_id,
  };

  const input: DatasetQueryParams = {
    id: request.dataset_id,
    limit: typedParams.limit,
    offset: typedParams.offset,
  };

  const { evaluationRun } = await evaluateArgumentCorrectness(
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

export const argumentCorrectnessEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => methodConfig,
    evaluate: runEvaluation,
    getParameterSchema: ArgumentCorrectnessEvaluationParameters,
  };
