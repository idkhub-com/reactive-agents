import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';

import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations';
import { ConversationCompletenessEvaluationParameters } from '@shared/types/idkhub/evaluations/conversation-completeness';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import {
  evaluateConversationCompletenessMain,
  evaluateOneLogForConversationCompleteness,
} from './service/evaluate';

// Simplified method configuration constant - only essential fields for standardization
const conversationCompletenessMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
  name: 'Conversation Completeness',
  description:
    'Evaluates how well an AI assistant completes conversations by satisfying user needs throughout the interaction',
} as const;

// Dataset evaluation function
async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = ConversationCompletenessEvaluationParameters.parse(
    jobDetails.parameters,
  );

  const { evaluationRun } = await evaluateConversationCompletenessMain(
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
  await evaluateOneLogForConversationCompleteness(
    evaluationRunId,
    log,
    userDataStorageConnector,
  );
}

// Evaluation connector constant
export const conversationCompletenessEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => conversationCompletenessMethodConfig,
    evaluate: runEvaluation,
    evaluateOneLog,
    getParameterSchema: ConversationCompletenessEvaluationParameters,
  };
