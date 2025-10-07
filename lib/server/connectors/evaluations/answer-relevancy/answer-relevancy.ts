import {
  evaluateAnswerRelevancy,
  evaluateOneLogForAnswerRelevancy,
} from '@server/connectors/evaluations/answer-relevancy/service/evaluate';
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
import { AnswerRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/answer-relevancy';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

// Simplified method configuration constant - only essential fields for standardization
const answerRelevancyMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.ANSWER_RELEVANCY,
  name: 'Answer Relevancy',
  description:
    "Evaluates whether an AI assistant's answer is relevant to the user's question using LLM-as-a-judge",
} as const;

// Dataset evaluation function
async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = AnswerRelevancyEvaluationParameters.parse(
    jobDetails.parameters,
  );

  // Run the evaluation - this will create the evaluation run internally
  const { evaluationRun } = await evaluateAnswerRelevancy(
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

  // Verify we have a valid evaluation run from the internal function
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
  await evaluateOneLogForAnswerRelevancy(
    evaluationRunId,
    log,
    userDataStorageConnector,
  );
}

// Evaluation connector constant
export const answerRelevancyEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => answerRelevancyMethodConfig,
  evaluate: runEvaluation,
  evaluateOneLog,
  getParameterSchema: AnswerRelevancyEvaluationParameters,
};
