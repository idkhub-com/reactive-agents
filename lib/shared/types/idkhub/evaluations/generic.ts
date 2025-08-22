import { z } from 'zod';

/**
 * Generic evaluation result that all evaluation methods should implement
 */
export const GenericEvaluationResultSchema = z.object({
  score: z.number().min(0).max(1),
  reasoning: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type GenericEvaluationResult<T = Record<string, unknown>> = z.infer<
  typeof GenericEvaluationResultSchema
> & {
  metadata?: T;
};

/**
 * Generic evaluation input that all evaluation methods should implement
 */
export const GenericEvaluationInputSchema = z.object({
  text: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type GenericEvaluationInput<T = Record<string, unknown>> = z.infer<
  typeof GenericEvaluationInputSchema
> & {
  metadata?: T;
};

/**
 * Generic evaluator interface that all evaluation methods should implement
 */
export interface GenericEvaluator<T = Record<string, unknown>> {
  evaluate(
    input: GenericEvaluationInput<T>,
  ): Promise<GenericEvaluationResult<T>>;
  config: Record<string, unknown>;
}
