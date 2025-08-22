import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';

import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations';
import {
  ConversationCompletenessEvaluationParameters,
  type ConversationCompletenessEvaluationParameters as ConversationCompletenessEvaluationParametersType,
} from '@shared/types/idkhub/evaluations/conversation-completeness';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { evaluateConversationCompletenessMain } from './service/evaluate';

// Simplified method configuration constant - only essential fields for standardization
const conversationCompletenessMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
  name: 'Conversation Completeness',
  description:
    'Evaluates how well an AI assistant completes conversations by satisfying user needs throughout the interaction',
} as const;

// Dataset evaluation function
async function runEvaluation(
  request: EvaluationMethodRequest,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsed = ConversationCompletenessEvaluationParameters.safeParse(
    request.parameters,
  );
  if (!parsed.success) {
    throw new Error(
      `Invalid ConversationCompletenessEvaluationParameters: ${parsed.error.message}`,
    );
  }
  const typedParams =
    parsed.data as ConversationCompletenessEvaluationParametersType;

  // Extract parameters from the request using Zod schema
  const params: ConversationCompletenessEvaluationParametersType = {
    model: typedParams.model ?? 'gpt-4o-mini',
    temperature: typedParams.temperature ?? 0.1,
    max_tokens: typedParams.max_tokens ?? 1000,
    timeout: typedParams.timeout ?? 30000,
    batch_size: typedParams.batch_size ?? 10,
    async_mode: typedParams.async_mode !== false,
    verbose_mode: typedParams.verbose_mode ?? false,
    agent_id: request.agent_id, // Pass agent_id to internal function
  };

  // Create dataset evaluation input
  const input: { id: string; limit?: number; offset?: number } = {
    id: request.dataset_id,
    limit: typedParams.limit,
    offset: typedParams.offset,
  };

  // Run the evaluation - this will create the evaluation run internally
  const { evaluationRun } = await evaluateConversationCompletenessMain(
    input,
    params,
    userDataStorageConnector,
    {
      name: request.name,
      description: request.description,
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

// Evaluation connector constant
export const conversationCompletenessEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => conversationCompletenessMethodConfig,
    evaluate: runEvaluation,
    getParameterSchema: ConversationCompletenessEvaluationParameters,
  };
