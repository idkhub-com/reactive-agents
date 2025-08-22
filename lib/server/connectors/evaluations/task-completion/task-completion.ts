import { evaluateTaskCompletion } from '@server/connectors/evaluations/task-completion/service/evaluate';
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
import {
  TaskCompletionEvaluationParameters,
  type TaskCompletionEvaluationParameters as TaskCompletionEvaluationParametersType,
} from '@shared/types/idkhub/evaluations/task-completion';

// Simplified method configuration constant - only essential fields for standardization
const taskCompletionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.TASK_COMPLETION,
  name: 'Task Completion',
  description:
    'Evaluates whether an AI agent successfully completed a given task using LLM-as-a-judge',
} as const;

// Dataset evaluation function
async function runEvaluation(
  request: EvaluationMethodRequest,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsed = TaskCompletionEvaluationParameters.safeParse(
    request.parameters,
  );
  if (!parsed.success) {
    throw new Error(
      `Invalid TaskCompletionEvaluationParameters: ${parsed.error.message}`,
    );
  }
  const typedParams = parsed.data as TaskCompletionEvaluationParametersType;

  // Extract parameters from the request using Zod schema
  const params: TaskCompletionEvaluationParametersType = {
    threshold: typedParams.threshold ?? 0.5,
    model: typedParams.model ?? 'gpt-4o',
    temperature: typedParams.temperature ?? 0.1,
    max_tokens: typedParams.max_tokens ?? 1000,
    include_reason: typedParams.include_reason !== false,
    strict_mode: typedParams.strict_mode ?? false,
    async_mode: typedParams.async_mode !== false,
    verbose_mode: typedParams.verbose_mode ?? false,
    batch_size: typedParams.batch_size ?? 10,
    task: typedParams.task,
    input: typedParams.input,
    actual_output: typedParams.actual_output,
    tools_called: typedParams.tools_called,
    limit: typedParams.limit,
    offset: typedParams.offset,
    agent_id: request.agent_id, // Pass agent_id to internal function
  };

  // Create dataset evaluation input
  const input: DatasetQueryParams = {
    id: request.dataset_id,
    limit: typedParams.limit,
    offset: typedParams.offset,
  };

  // Run the evaluation - this will create the evaluation run internally
  const { evaluationRun } = await evaluateTaskCompletion(
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
export const taskCompletionEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => taskCompletionMethodConfig,
  evaluate: runEvaluation,
  getParameterSchema: TaskCompletionEvaluationParameters,
};
