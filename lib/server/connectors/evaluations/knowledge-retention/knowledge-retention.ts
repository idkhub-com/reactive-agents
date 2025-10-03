import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { KnowledgeRetentionEvaluationParameters } from '@shared/types/idkhub/evaluations/knowledge-retention';
import {
  evaluateKnowledgeRetention,
  evaluateOneLogForKnowledgeRetention,
} from './service/evaluate';

// Simplified method configuration constant - only essential fields for standardization
const knowledgeRetentionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.KNOWLEDGE_RETENTION,
  name: 'Knowledge Retention',
  description:
    'Evaluates how well an AI system retains and recalls information from provided context',
} as const;

// Dataset evaluation function
async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = KnowledgeRetentionEvaluationParameters.parse(
    jobDetails.parameters,
  );

  // Run the evaluation - this will create the evaluation run internally
  const { evaluationRun } = await evaluateKnowledgeRetention(
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

// Evaluation connector constant
export const knowledgeRetentionEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => knowledgeRetentionMethodConfig,
    evaluate: runEvaluation,
    evaluateOneLog: evaluateOneLogForKnowledgeRetention,
    getParameterSchema: KnowledgeRetentionEvaluationParameters,
  };
