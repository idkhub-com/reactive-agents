import { z } from 'zod';
import { ToolUsageSchema } from '../tool-correctness/types';

/**
 * Task completion template data structure
 */
export const TaskCompletionTemplateData = z.object({
  task: z.string().optional(),
  output: z.string().optional(),
  outcome: z.string().optional(),
  tool_usage: z.array(ToolUsageSchema).optional(),
  strict_mode: z.boolean().optional().default(false),
  verbose_mode: z.boolean().optional().default(true),
  include_reason: z.boolean().optional().default(true),
});

export type TaskCompletionTemplateData = z.infer<
  typeof TaskCompletionTemplateData
>;

/**
 * Task completion template configuration
 */
export const TaskCompletionTemplateConfig = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});

export type TaskCompletionTemplateConfig = z.infer<
  typeof TaskCompletionTemplateConfig
>;

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
// Note: model is configured via evaluation.model_id, not in parameters
export const TaskCompletionEvaluationParameters =
  TaskCompletionEvaluationAIParameters.extend({
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
