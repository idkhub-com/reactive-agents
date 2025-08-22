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
import type { TurnRelevancyEvaluationParameters as TurnRelevancyEvaluationParametersType } from '@shared/types/idkhub/evaluations/turn-relevancy';
import { TurnRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/turn-relevancy';

const methodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.TURN_RELEVANCY,
  name: 'Turn Relevancy',
  description:
    'Evaluates whether a conversation turn is relevant to the prior context',
} as const;

async function runEvaluation(
  request: EvaluationMethodRequest,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsed = TurnRelevancyEvaluationParameters.safeParse(
    request.parameters,
  );
  if (!parsed.success) {
    throw new Error(
      `Invalid TurnRelevancyEvaluationParameters: ${parsed.error.message}`,
    );
  }
  const typedParams = parsed.data as TurnRelevancyEvaluationParametersType;

  const params: TurnRelevancyEvaluationParametersType = {
    threshold: typedParams.threshold ?? 0.5,
    model: typedParams.model ?? 'gpt-4o',
    temperature: typedParams.temperature ?? 0.1,
    max_tokens: typedParams.max_tokens ?? 1000,
    include_reason: typedParams.include_reason !== false,
    strict_mode: typedParams.strict_mode ?? false,
    async_mode: typedParams.async_mode !== false,
    verbose_mode: typedParams.verbose_mode ?? false,
    batch_size: typedParams.batch_size ?? 10,
    limit: typedParams.limit,
    offset: typedParams.offset,
    agent_id: request.agent_id,
    dataset_id: request.dataset_id,
    conversation_history: typedParams.conversation_history,
    current_turn: typedParams.current_turn,
    instructions: typedParams.instructions,
  };

  const input: DatasetQueryParams = {
    id: request.dataset_id,
    limit: typedParams.limit,
    offset: typedParams.offset,
  };

  // Use the new service implementation (following same pattern as task completion and argument correctness)
  const { evaluateTurnRelevancyDataset } = await import('./service/evaluate');

  const { evaluationRun } = await evaluateTurnRelevancyDataset(
    input,
    params,
    userDataStorageConnector,
    {
      name: request.name,
      description: request.description,
    },
  );

  return evaluationRun;
}

export const turnRelevancyEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => methodConfig,
  evaluate: runEvaluation,
  getParameterSchema: TurnRelevancyEvaluationParameters,
};
