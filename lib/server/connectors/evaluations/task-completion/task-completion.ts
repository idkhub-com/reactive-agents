import { evaluateTaskCompletion } from '@server/connectors/evaluations/task-completion/service/evaluate';
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
import { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';

// Simplified method configuration constant - only essential fields for standardization
const taskCompletionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.TASK_COMPLETION,
  name: 'Task Completion',
  description:
    'Evaluates whether an AI agent successfully completed a given task using LLM-as-a-judge',
} as const;

// Dataset evaluation function
async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = TaskCompletionEvaluationParameters.parse(
    jobDetails.parameters,
  );

  // Run the evaluation - this will create the evaluation run internally
  const { evaluationRun } = await evaluateTaskCompletion(
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

// Evaluation connector constant
export const taskCompletionEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => taskCompletionMethodConfig,
  evaluate: runEvaluation,
  getParameterSchema: TaskCompletionEvaluationParameters,
};
