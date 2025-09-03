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
]);
export type EvaluationMethodParameters = z.infer<
  typeof EvaluationMethodParameters
>;
export const EvaluationMethodRequest = z
  .object({
    agent_id: z.uuid(),
    dataset_id: z.uuid().optional(),
    log_id: z.uuid().optional(),
    evaluation_method: z.enum(EvaluationMethodName),
    parameters: EvaluationMethodParameters,
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      // Either dataset_id or log_id must be provided, but not both
      return (
        (data.dataset_id && !data.log_id) || (!data.dataset_id && data.log_id)
      );
    },
    {
      message: 'Either dataset_id or log_id must be provided, but not both',
      path: ['dataset_id'],
    },
  );
export type EvaluationMethodRequest = z.infer<typeof EvaluationMethodRequest>;

// Keep this for backward compatibility
export const SingleLogEvaluationRequest = EvaluationMethodRequest;
export type SingleLogEvaluationRequest = EvaluationMethodRequest;
