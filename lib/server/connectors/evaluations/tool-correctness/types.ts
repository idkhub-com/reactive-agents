import { z } from 'zod';

export const ToolCall = z.object({
  name: z.string(),
  input_parameters: z.record(z.string(), z.unknown()).optional(),
  output: z.unknown().optional(),
});
export type ToolCall = z.infer<typeof ToolCall>;

/**
 * Tool usage information for task completion evaluation
 */
export const ToolUsageSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  success: z.boolean(),
});

export type ToolUsage = z.infer<typeof ToolUsageSchema>;

// Default evaluation model - can be overridden by users
export const TOOL_CORRECTNESS_EVALUATION_MODEL_DEFAULT = 'gpt-5-mini';

// AI-modifiable parameters - none needed, evaluation works automatically
export const ToolCorrectnessEvaluationAIParameters = z.object({}).strict();

// Full parameters including user-modifiable settings
export const ToolCorrectnessEvaluationParameters =
  ToolCorrectnessEvaluationAIParameters.extend({
    threshold: z.number().min(0).max(1).default(0.5),
    model: z.string().default(TOOL_CORRECTNESS_EVALUATION_MODEL_DEFAULT),
    evaluation_params: z
      .array(z.enum(['INPUT_PARAMETERS', 'OUTPUT']))
      .default([]),
    include_reason: z.boolean().default(true),
    strict_mode: z.boolean().default(false),
    verbose_mode: z.boolean().default(false),
    should_consider_ordering: z.boolean().default(false),
    should_exact_match: z.boolean().default(false),
  });

export type ToolCorrectnessEvaluationParameters = z.infer<
  typeof ToolCorrectnessEvaluationParameters
>;
