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
import { TurnRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/turn-relevancy';

import {
  evaluateOneLogForTurnRelevancy,
  evaluateTurnRelevancyDataset,
} from './service/evaluate';

const methodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.TURN_RELEVANCY,
  name: 'Turn Relevancy',
  description:
    'Evaluates whether a conversation turn is relevant to the prior context',
} as const;

async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = TurnRelevancyEvaluationParameters.parse(
    jobDetails.parameters,
  );

  const { evaluationRun } = await evaluateTurnRelevancyDataset(
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

export const turnRelevancyEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => methodConfig,
  evaluate: runEvaluation,
  evaluateOneLog: evaluateOneLogForTurnRelevancy,
  getParameterSchema: TurnRelevancyEvaluationParameters,
};
