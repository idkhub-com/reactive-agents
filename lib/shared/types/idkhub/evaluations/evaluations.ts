import { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';
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
}

export const EvaluationMethodDetails = z.object({
  method: z.nativeEnum(EvaluationMethodName),
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
]);
export type EvaluationMethodParameters = z.infer<
  typeof EvaluationMethodParameters
>;
export const EvaluationMethodRequest = z.object({
  agent_id: z.string().uuid(),
  dataset_id: z.string().uuid(),
  evaluation_method: z.nativeEnum(EvaluationMethodName),
  parameters: EvaluationMethodParameters,
  name: z.string().optional(),
  description: z.string().optional(),
});
export type EvaluationMethodRequest = z.infer<typeof EvaluationMethodRequest>;
