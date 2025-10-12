import type { EvaluationMethodConnector } from '@server/types/connector';
import type { EvaluationMethodDetails } from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { KnowledgeRetentionEvaluationParameters } from '@shared/types/idkhub/evaluations/knowledge-retention';
import { evaluateLog } from './service/evaluate';

// Simplified method configuration constant - only essential fields for standardization
const knowledgeRetentionMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.KNOWLEDGE_RETENTION,
  name: 'Knowledge Retention',
  description:
    'Evaluates how well an AI system retains and recalls information from provided context',
} as const;

// Evaluation connector constant
export const knowledgeRetentionEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => knowledgeRetentionMethodConfig,
    evaluateLog,
    getParameterSchema: KnowledgeRetentionEvaluationParameters,
  };
