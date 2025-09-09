import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationMethodName,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName as Names } from '@shared/types/idkhub/evaluations';
import { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

import {
  evaluateArgumentCorrectness,
  evaluateOneLogForArgumentCorrectness,
} from './service/evaluate';

const methodConfig: EvaluationMethodDetails = {
  method: Names.ARGUMENT_CORRECTNESS as unknown as EvaluationMethodName,
  name: 'Argument Correctness',
  description:
    'Evaluates whether an agent generated correct tool call arguments given the input and task using LLM-as-a-judge',
} as const;

async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = ArgumentCorrectnessEvaluationParameters.parse(
    jobDetails.parameters,
  );

  const { evaluationRun } = await evaluateArgumentCorrectness(
    jobDetails.agent_id,
    jobDetails.skill_id,
    jobDetails.dataset_id,
    parsedParams,
    userDataStorageConnector,
    {
      name: jobDetails.name,
      description: jobDetails.description,
    },
  );

  return evaluationRun;
}

async function evaluateOneLog(
  evaluationRunId: string,
  log: IdkRequestLog,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  await evaluateOneLogForArgumentCorrectness(
    evaluationRunId,
    log,
    userDataStorageConnector,
  );
}

export const argumentCorrectnessEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => methodConfig,
    evaluate: runEvaluation,
    evaluateOneLog,
    getParameterSchema: ArgumentCorrectnessEvaluationParameters,
  };
