import { AnswerRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/answer-relevancy';
import { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';
import { FaithfulnessEvaluationParameters } from '@shared/types/idkhub/evaluations/faithfulness';
import { z } from 'zod';
import { ConversationCompletenessEvaluationParameters } from './conversation-completeness';
import { KnowledgeRetentionEvaluationParameters } from './knowledge-retention';
import { RoleAdherenceEvaluationParameters } from './role-adherence';
import { TaskCompletionEvaluationParameters } from './task-completion';
import { ToolCorrectnessEvaluationParameters } from './tool-correctness';
import { TurnRelevancyEvaluationParameters } from './turn-relevancy';

export enum EvaluationMethodName {
  TASK_COMPLETION = 'task_completion',
  ARGUMENT_CORRECTNESS = 'argument_correctness',
  ROLE_ADHERENCE = 'role_adherence',
  TURN_RELEVANCY = 'turn_relevancy',
  TOOL_CORRECTNESS = 'tool_correctness',
  KNOWLEDGE_RETENTION = 'knowledge_retention',
  CONVERSATION_COMPLETENESS = 'conversation_completeness',
  ANSWER_RELEVANCY = 'answer_relevancy',
  FAITHFULNESS = 'faithfulness',
}

export const EvaluationMethodDetails = z.object({
  method: z.enum(EvaluationMethodName),
  name: z.string(),
  description: z.string(),
});
export type EvaluationMethodDetails = z.infer<typeof EvaluationMethodDetails>;

export const EvaluationMethodParameters = z.union([
  TaskCompletionEvaluationParameters,
  ArgumentCorrectnessEvaluationParameters,
  RoleAdherenceEvaluationParameters,
  TurnRelevancyEvaluationParameters,
  ToolCorrectnessEvaluationParameters,
  KnowledgeRetentionEvaluationParameters,
  ConversationCompletenessEvaluationParameters,
  AnswerRelevancyEvaluationParameters,
  FaithfulnessEvaluationParameters,
]);
export type EvaluationMethodParameters = z.infer<
  typeof EvaluationMethodParameters
>;

export const EvaluationRunJobDetails = z.object({
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  dataset_id: z.uuid(),
  evaluation_method: z.enum(EvaluationMethodName),
  parameters: EvaluationMethodParameters,
  name: z.string().optional(),
  description: z.string().optional(),
});
export type EvaluationRunJobDetails = z.infer<typeof EvaluationRunJobDetails>;
