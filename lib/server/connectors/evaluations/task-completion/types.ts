import { z } from 'zod';
import { ToolUsageSchema } from '../tool-correctness/types';

// Tool call structure
export const TaskCompletionToolCallSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  input: z.unknown(),
});
export type TaskCompletionToolCall = z.infer<
  typeof TaskCompletionToolCallSchema
>;
/**
 * Task completion template data structure
 */
export const TaskCompletionTemplateDataSchema = z.object({
  task: z.string().optional(),
  output: z.string().optional(),
  outcome: z.string().optional(),
  tool_usage: z.array(ToolUsageSchema).optional(),
  strict_mode: z.boolean().optional().default(false),
  verbose_mode: z.boolean().optional().default(true),
  include_reason: z.boolean().optional().default(true),
});

export type TaskCompletionTemplateData = z.infer<
  typeof TaskCompletionTemplateDataSchema
>;

/**
 * Task completion template configuration
 */
export const TaskCompletionTemplateConfigSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});

export type TaskCompletionTemplateConfig = z.infer<
  typeof TaskCompletionTemplateConfigSchema
>;

/**
 * Task completion evaluation criteria (for validation)
 */
export const TaskCompletionCriteriaSchema = z.object({
  task_understood: z.boolean(),
  outcome_achieved: z.boolean(),
  completion_quality: z.number().min(0).max(1),
  tool_usage_appropriate: z.boolean().nullable(),
});

export type TaskCompletionCriteria = z.infer<
  typeof TaskCompletionCriteriaSchema
>;

/**
 * Task completion evaluation result (from LLM)
 */
export const TaskCompletionResultSchema = z.object({
  criteria: TaskCompletionCriteriaSchema,
  score: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  overall_success: z.boolean(),
});

export type TaskCompletionResult = z.infer<typeof TaskCompletionResultSchema>;

/**
 * Task completion metadata for generic evaluation system
 */
export type TaskCompletionMetadata = {
  actual_output?: Record<string, unknown>;
  // tools_called?: TaskCompletionToolCall[];
  criteria?: {
    criteria: string[];
    task_type?:
      | 'api_completion'
      | 'code'
      | 'conversation'
      | 'general'
      | 'response';
    description?: string;
    strict_mode?: boolean;
    verbose_mode?: boolean;
    include_reason?: boolean;
  };
  overall_success?: boolean;
  parsed_with_schema?: boolean;
};

/**
 * Task completion scoring guidelines specific to this evaluation method
 */
export const taskCompletionScoringGuidelines = {
  perfect:
    '1.0: Perfect completion - task fully understood and executed flawlessly',
  excellent:
    '0.9: Excellent completion - minor issues but exceeds expectations',
  good: '0.7-0.8: Good completion - meets requirements with quality execution',
  adequate: '0.5-0.6: Adequate completion - basic requirements met',
  poor: '0.3-0.4: Poor completion - significant issues or partial completion',
  failed: '0.0-0.2: Failed completion - task not understood or not completed',
} as const;

export const taskCompletionScoringText = Object.values(
  taskCompletionScoringGuidelines,
).join('\n- ');

// --- AVERAGE RESULT TYPES ---

export interface TaskCompletionAverageResult {
  average_score: number;
  total_logs: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}

// Default evaluation model - can be overridden by users
export const TASK_COMPLETION_EVALUATION_MODEL_DEFAULT = 'gpt-5-mini';

// AI-modifiable parameters - what the AI can set when creating evaluations
export const TaskCompletionEvaluationAIParameters = z.object({
  task: z
    .string()
    .describe(
      'The expected task that the model should complete. The evaluation score will be based on how well the model completes the task.',
    ),
  threshold: z.number().min(0).max(1).default(0.7),
});

// Full parameters including user-modifiable advanced settings
export const TaskCompletionEvaluationParameters =
  TaskCompletionEvaluationAIParameters.extend({
    model: z.string().default(TASK_COMPLETION_EVALUATION_MODEL_DEFAULT),
    include_reason: z.boolean().default(true),
    strict_mode: z.boolean().default(false),
    async_mode: z.boolean().default(true),
    verbose_mode: z.boolean().default(false),
    temperature: z.number().min(0).max(1).default(0.1),
    max_tokens: z.number().positive().default(1000),
    batch_size: z.number().positive().default(10),
  });

export type TaskCompletionEvaluationParameters = z.infer<
  typeof TaskCompletionEvaluationParameters
>;
