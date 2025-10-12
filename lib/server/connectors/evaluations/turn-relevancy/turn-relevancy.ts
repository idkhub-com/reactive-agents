import type { EvaluationMethodConnector } from '@server/types/connector';
import type { EvaluationMethodDetails } from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { TurnRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/turn-relevancy';

import { evaluateLog } from './service/evaluate';

const methodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.TURN_RELEVANCY,
  name: 'Turn Relevancy',
  description:
    'Evaluates whether a conversation turn is relevant to the prior context',
} as const;

export const turnRelevancyEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => methodConfig,
  evaluateLog,
  getParameterSchema: TurnRelevancyEvaluationParameters,
};
