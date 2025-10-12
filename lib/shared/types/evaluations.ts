import { z } from 'zod';

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
