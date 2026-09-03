import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import { z } from 'zod';

/**
 * Configuration for LLM Judge
 */
export const LLMJudgeConfigSchema = z.object({
  model: z.string().optional().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).optional().default(0.1),
  /**
   * What an evaluation wants instead of the resolved model's settings. Left
   * out, the settings apply; given, they win over them -- an evaluation's own
   * parameters are the more specific answer.
   */
  max_tokens: z.number().int().positive().optional(),
  reasoning_effort: z.enum(ReasoningEffort).nullish(),
  timeout: z.number().positive().optional().default(30000),
});

export type LLMJudgeConfig = z.infer<typeof LLMJudgeConfigSchema>;

/**
 * Result from LLM Judge evaluation
 */
export const LLMJudgeResult = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LLMJudgeResult = z.infer<typeof LLMJudgeResult>;

/**
 * Evaluation criteria structure
 */
export const EvaluationCriteriaSchema = z.object({
  criteria: z.array(z.string()),
  description: z.string().optional(),
});

export type EvaluationCriteria = z.infer<typeof EvaluationCriteriaSchema>;

/**
 * Input data for evaluation
 */
export const EvaluationInputSchema = z.object({
  text: z.string(),
  evaluationCriteria: EvaluationCriteriaSchema.optional(),
  /**
   * Explicit prompts, used verbatim when both are set. Without them the call
   * is scored by the criteria judge, which builds its own prompts around
   * `text`. The judge never re-derives a split from `text` itself.
   */
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
});

export type EvaluationInput = z.infer<typeof EvaluationInputSchema>;

/**
 * LLM Judge interface - generic evaluation with templates/prompts
 */
export interface LLMJudge {
  evaluate(input: EvaluationInput): Promise<LLMJudgeResult>;
  config: LLMJudgeConfig;
}
