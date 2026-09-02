import z from 'zod';

export interface KnowledgeRetentionResult {
  score: number | null;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeRetentionAverageResult {
  average_score: number;
  total_logs: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}

// AI-modifiable parameters - none needed, evaluation works automatically
export const KnowledgeRetentionEvaluationAIParameters = z.object({}).strict();

// Full parameters including user-modifiable settings
// Note: model is configured via evaluation.model_id, not in parameters
export const KnowledgeRetentionEvaluationParameters =
  KnowledgeRetentionEvaluationAIParameters.extend({
    threshold: z.number().min(0).max(1).default(0.7),
    temperature: z.number().min(0).max(2).default(0.1),
    /**
     * Reaches the model now, where it used to be computed and dropped, so the
     * value has to cover what a reasoning model spends before it writes a
     * word: the judge's own answer is a few hundred tokens, but glm-5.3-flash
     * was measured burning 1100-2700 on reasoning alone. A cap below that
     * returns an empty completion rather than a short one.
     */
    max_tokens: z.number().int().positive().default(4000),
    include_reason: z.boolean().default(true),
    strict_mode: z.boolean().default(false),
    async_mode: z.boolean().default(false),
    verbose_mode: z.boolean().default(false),
    batch_size: z.number().int().positive().default(10),
  });

export type KnowledgeRetentionEvaluationParameters = z.infer<
  typeof KnowledgeRetentionEvaluationParameters
>;
