import { evaluateLog } from '@server/connectors/evaluations/task-completion/service/evaluate';
import type { EvaluationMethodConnector } from '@server/types/connector';
import type { EvaluationMethodDetails } from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';

// Simplified method configuration constant - only essential fields for standardization
const taskCompletionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.TASK_COMPLETION,
  name: 'Task Completion',
  description:
    'Evaluates whether an AI agent successfully completed a given task using LLM-as-a-judge',
} as const;

// Evaluation connector constant
export const taskCompletionEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => taskCompletionMethodConfig,
  evaluateLog,
  getParameterSchema: TaskCompletionEvaluationParameters,
};
