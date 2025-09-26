import { z } from 'zod';

// Base result that all evaluations share
export const BaseLLMJudgeResultSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string().min(10, 'Reasoning too short'),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Task completion specific result
export const TaskCompletionResultSchema = BaseLLMJudgeResultSchema.extend({
  metadata: z.object({
    task: z.string(),
    outcome: z.string(),
    tools_used: z.array(z.string()).optional(),
    extraction_method: z
      .enum(['structured', 'fallback', 'pattern_match'])
      .optional(),
  }),
});

// Argument correctness specific result
export const ArgumentCorrectnessResultSchema = BaseLLMJudgeResultSchema.extend({
  metadata: z.object({
    per_tool: z.array(
      z.object({
        name: z.string(),
        correct: z.boolean(),
        explanation: z.string().optional(),
      }),
    ),
    total_tools: z.number(),
    correct_tools: z.number(),
  }),
});

// Role adherence specific result
export const RoleAdherenceResultSchema = BaseLLMJudgeResultSchema.extend({
  metadata: z.object({
    violations: z.array(z.string()),
    adherence_level: z.number().min(0).max(1),
    strict_mode: z.boolean().optional(),
  }),
});

// Turn relevancy specific result
export const TurnRelevancyResultSchema = BaseLLMJudgeResultSchema.extend({
  metadata: z.object({
    relevant: z.boolean(),
    relevance_reasons: z.array(z.string()),
    strict_mode: z.boolean().optional(),
  }),
});

// Knowledge retention specific result
export const KnowledgeRetentionResultSchema = BaseLLMJudgeResultSchema.extend({
  metadata: z.object({
    extracted_knowledge: z.array(z.string()),
    assistant_turns_without_attrition: z.number(),
    total_assistant_turns: z.number(),
    retention_accuracy: z.number().min(0).max(1),
    context_consistency: z.number().min(0).max(1),
  }),
});

// Conversation completeness specific result
export const ConversationCompletenessResultSchema =
  BaseLLMJudgeResultSchema.extend({
    metadata: z.object({
      user_intentions: z.array(z.string()),
      satisfied_intentions: z.array(z.string()),
      completeness_score: z.number().min(0).max(1),
    }),
  });

// Error/fallback result
export const ErrorResultSchema = BaseLLMJudgeResultSchema.extend({
  score: z.literal(0.5),
  reasoning: z.string(),
  metadata: z.object({
    fallback: z.literal(true),
    error_type: z.enum([
      'no_api_key',
      'network_error',
      'parse_error',
      'timeout_error',
      'api_error',
      'unknown_error',
    ]),
    error_details: z.string().optional(),
    retry_info: z
      .object({
        retry_count: z.number(),
        max_retries: z.number(),
      })
      .optional(),
  }),
});

// Discriminated union for all possible results
export const UnifiedLLMJudgeResultSchema = z.discriminatedUnion(
  'evaluation_type',
  [
    z.object({
      evaluation_type: z.literal('task_completion'),
      ...TaskCompletionResultSchema.shape,
    }),
    z.object({
      evaluation_type: z.literal('argument_correctness'),
      ...ArgumentCorrectnessResultSchema.shape,
    }),
    z.object({
      evaluation_type: z.literal('role_adherence'),
      ...RoleAdherenceResultSchema.shape,
    }),
    z.object({
      evaluation_type: z.literal('turn_relevancy'),
      ...TurnRelevancyResultSchema.shape,
    }),
    z.object({
      evaluation_type: z.literal('knowledge_retention'),
      ...KnowledgeRetentionResultSchema.shape,
    }),
    z.object({
      evaluation_type: z.literal('conversation_completeness'),
      ...ConversationCompletenessResultSchema.shape,
    }),
    z.object({
      evaluation_type: z.literal('error'),
      ...ErrorResultSchema.shape,
    }),
  ],
);

export type UnifiedLLMJudgeResult = z.infer<typeof UnifiedLLMJudgeResultSchema>;
export type TaskCompletionResult = z.infer<
  typeof TaskCompletionResultSchema
> & { evaluation_type: 'task_completion' };
export type ArgumentCorrectnessResult = z.infer<
  typeof ArgumentCorrectnessResultSchema
> & { evaluation_type: 'argument_correctness' };
export type RoleAdherenceResult = z.infer<typeof RoleAdherenceResultSchema> & {
  evaluation_type: 'role_adherence';
};
export type TurnRelevancyResult = z.infer<typeof TurnRelevancyResultSchema> & {
  evaluation_type: 'turn_relevancy';
};
export type KnowledgeRetentionResult = z.infer<
  typeof KnowledgeRetentionResultSchema
> & { evaluation_type: 'knowledge_retention' };
export type ConversationCompletenessResult = z.infer<
  typeof ConversationCompletenessResultSchema
> & { evaluation_type: 'conversation_completeness' };
export type ErrorResult = z.infer<typeof ErrorResultSchema> & {
  evaluation_type: 'error';
};
