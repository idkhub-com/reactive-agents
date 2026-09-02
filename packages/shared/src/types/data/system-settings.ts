import { z } from 'zod';

/**
 * Bounds on how long one skill-arbiter attempt may take. The arbiter answers
 * on the request path -- a request no skill matches closely waits for it -- so
 * the ceiling is generous for slow self-hosted models but not unbounded.
 */
export const DEFAULT_SKILL_ARBITER_TIMEOUT_MS = 15_000;
export const MIN_SKILL_ARBITER_TIMEOUT_MS = 1_000;
export const MAX_SKILL_ARBITER_TIMEOUT_MS = 600_000;

export const SystemSettings = z.object({
  id: z.uuid(),
  system_prompt_reflection_model_id: z.uuid().nullable(),
  evaluation_generation_model_id: z.uuid().nullable(),
  embedding_model_id: z.uuid().nullable(),
  judge_model_id: z.uuid().nullable(),
  /**
   * The model the skill arbiter asks when a request matches no skill closely.
   * Null defers to the system prompt reflection model.
   */
  skill_arbiter_model_id: z.uuid().nullable(),
  /** How long one arbiter attempt may take, in milliseconds. */
  skill_arbiter_timeout_ms: z.number().int().positive(),
  developer_mode: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SystemSettings = z.infer<typeof SystemSettings>;

export const SystemSettingsUpdateParams = z
  .object({
    system_prompt_reflection_model_id: z.uuid().nullable().optional(),
    evaluation_generation_model_id: z.uuid().nullable().optional(),
    embedding_model_id: z.uuid().nullable().optional(),
    judge_model_id: z.uuid().nullable().optional(),
    skill_arbiter_model_id: z.uuid().nullable().optional(),
    skill_arbiter_timeout_ms: z
      .number()
      .int()
      .min(MIN_SKILL_ARBITER_TIMEOUT_MS)
      .max(MAX_SKILL_ARBITER_TIMEOUT_MS)
      .optional(),
    developer_mode: z.boolean().optional(),
  })
  .strict();

export type SystemSettingsUpdateParams = z.infer<
  typeof SystemSettingsUpdateParams
>;
