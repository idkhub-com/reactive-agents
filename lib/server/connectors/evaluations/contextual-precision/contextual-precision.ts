import {
  evaluateContextualPrecision,
  evaluateOneLogForContextualPrecision,
} from '@server/connectors/evaluations/contextual-precision/service/evaluate';
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
import { ContextualPrecisionEvaluationParameters } from '@shared/types/idkhub/evaluations/contextual-precision';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

const contextualPrecisionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.CONTEXTUAL_PRECISION,
  name: 'Contextual Precision',
  description:
    "Evaluates whether an AI assistant's answer demonstrates precision in using only relevant information from the context using LLM-as-a-judge",
} as const;

async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = ContextualPrecisionEvaluationParameters.parse(
    jobDetails.parameters,
  );

  const { evaluationRun } = await evaluateContextualPrecision(
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
  await evaluateOneLogForContextualPrecision(
    evaluationRunId,
    log,
    userDataStorageConnector,
  );
}

export const contextualPrecisionEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => contextualPrecisionMethodConfig,
    evaluate: runEvaluation,
    evaluateOneLog,
    getParameterSchema: ContextualPrecisionEvaluationParameters,
  };
