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
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import {
  KnowledgeRetentionEvaluationParameters,
  type KnowledgeRetentionEvaluationParameters as KnowledgeRetentionEvaluationParametersType,
} from '@shared/types/idkhub/evaluations/knowledge-retention';
import { evaluateKnowledgeRetention } from './service/evaluate';

// Simplified method configuration constant - only essential fields for standardization
const knowledgeRetentionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.KNOWLEDGE_RETENTION,
  name: 'Knowledge Retention',
  description:
    'Evaluates how well an AI system retains and recalls information from provided context',
} as const;

// Dataset evaluation function
async function runEvaluation(
  request: EvaluationMethodRequest,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsed = KnowledgeRetentionEvaluationParameters.safeParse(
    request.parameters,
  );
  if (!parsed.success) {
    throw new Error(
      `Invalid KnowledgeRetentionEvaluationParameters: ${parsed.error.message}`,
    );
  }
  const typedParams = parsed.data as KnowledgeRetentionEvaluationParametersType;

  // Use Zod defaults and apply business logic defaults after validation
  const params: KnowledgeRetentionEvaluationParametersType = {
    ...typedParams, // This will include the default threshold from schema
    model: typedParams.model ?? 'gpt-4o-mini',
    temperature: typedParams.temperature ?? 0.1,
    max_tokens: typedParams.max_tokens ?? 1000,
    timeout: typedParams.timeout ?? 30000,
    include_reason: typedParams.include_reason ?? true,
    strict_mode: typedParams.strict_mode ?? false,
    async_mode: typedParams.async_mode ?? true,
    verbose_mode: typedParams.verbose_mode ?? false,
    batch_size: typedParams.batch_size ?? 10,
    agent_id: request.agent_id, // Pass agent_id to internal function
  };

  // Create dataset evaluation input
  const input: DatasetQueryParams = {
    id: request.dataset_id,
    limit: typedParams.limit,
    offset: typedParams.offset,
  };

  // Run the evaluation - this will create the evaluation run internally
  const { evaluationRun } = await evaluateKnowledgeRetention(
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
export const knowledgeRetentionEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => knowledgeRetentionMethodConfig,
    evaluate: runEvaluation,
    getParameterSchema: KnowledgeRetentionEvaluationParameters,
  };
