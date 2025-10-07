import {
  evaluateFaithfulness,
  evaluateOneLogForFaithfulness,
} from '@server/connectors/evaluations/faithfulness/service/evaluate';
import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { FaithfulnessEvaluationParameters } from '@shared/types/idkhub/evaluations/faithfulness';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

const faithfulnessMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.FAITHFULNESS,
  name: 'Faithfulness',
  description:
    "Evaluates whether an AI assistant's answer is faithful to the provided context using LLM-as-a-judge",
} as const;

async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = FaithfulnessEvaluationParameters.parse(
    jobDetails.parameters,
  );

  const { evaluationRun } = await evaluateFaithfulness(
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

  if (!evaluationRun) {
    throw new Error(
      'Internal evaluation function failed to create evaluation run',
    );
  }

  return evaluationRun;
}

async function evaluateOneLog(
  evaluationRunId: string,
  log: IdkRequestLog,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  await evaluateOneLogForFaithfulness(
    evaluationRunId,
    log,
    userDataStorageConnector,
  );
}

export const faithfulnessEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => faithfulnessMethodConfig,
  evaluate: runEvaluation,
  evaluateOneLog,
  getParameterSchema: FaithfulnessEvaluationParameters,
};
