import { z } from 'zod';

/**
 * Bounds on how long one attempt at an internal skill call may take.
 *
 * Every internal skill -- judging, embedding, prompt generation, routing --
 * is an ordinary gateway request this server sends to its own `/v1`, and each
 * one has a timeout of its own beside the model it asks. They share bounds
 * because the thing being bounded is the same: one call to a model, retried
 * once by the client. The ceiling is generous for slow self-hosted models but
 * not unbounded, and the floor keeps a mistyped value from disabling a
 * feature outright.
 *
 * A timeout that is too short is not a small problem. Compaction, the arbiter
 * and skill naming all answer on the request path, so the caller waits out
 * every attempt before the fallback; the rest hold an optimizer lock while
 * they run. That is why these are settings rather than constants: the right
 * value depends on the model, and a self-hosted one can be an order of
 * magnitude slower than a hosted one at the same job.
 */
export const MIN_INTERNAL_TIMEOUT_MS = 1_000;
export const MAX_INTERNAL_TIMEOUT_MS = 600_000;

/** Kept under their old names for `Agent`'s per-agent arbiter override. */
export const MIN_SKILL_ARBITER_TIMEOUT_MS = MIN_INTERNAL_TIMEOUT_MS;
export const MAX_SKILL_ARBITER_TIMEOUT_MS = MAX_INTERNAL_TIMEOUT_MS;

/**
 * Defaults, one per setting, chosen from what the call actually does rather
 * than from one number for everything.
 *
 * The two on the request path are short, because a caller waits for them. The
 * generation calls are long, because they write a system prompt or a set of
 * evaluations from scratch. Embedding is the shortest: it is one forward pass,
 * and it is on the request path too.
 */
export const DEFAULT_SKILL_ARBITER_TIMEOUT_MS = 15_000;
export const DEFAULT_INTENT_COMPACTION_TIMEOUT_MS = 60_000;
export const DEFAULT_SYSTEM_PROMPT_REFLECTION_TIMEOUT_MS = 120_000;
export const DEFAULT_EVALUATION_GENERATION_TIMEOUT_MS = 120_000;
export const DEFAULT_JUDGE_TIMEOUT_MS = 60_000;
export const DEFAULT_EMBEDDING_TIMEOUT_MS = 30_000;

const timeout = () => z.number().int().positive();
const timeoutUpdate = () =>
  z
    .number()
    .int()
    .min(MIN_INTERNAL_TIMEOUT_MS)
    .max(MAX_INTERNAL_TIMEOUT_MS)
    .optional();

export const SystemSettings = z.object({
  id: z.uuid(),
  system_prompt_reflection_model_id: z.uuid().nullable(),
  /**
   * How long one attempt may take at the calls this model serves: seeding a
   * new skill's system prompt, reflecting on an existing one, and naming a
   * skill the gateway creates.
   */
  system_prompt_reflection_timeout_ms: timeout(),
  evaluation_generation_model_id: z.uuid().nullable(),
  /** How long one attempt at generating a skill's evaluations may take. */
  evaluation_generation_timeout_ms: timeout(),
  embedding_model_id: z.uuid().nullable(),
  /**
   * How long one embedding call may take. On the request path -- routing
   * embeds every request's intent -- so this is the shortest of them.
   */
  embedding_timeout_ms: timeout(),
  judge_model_id: z.uuid().nullable(),
  /** How long one judging attempt may take, task extraction included. */
  judge_timeout_ms: timeout(),
  /**
   * The model the skill arbiter asks when a request matches no skill closely.
   * Null defers to the system prompt reflection model.
   */
  skill_arbiter_model_id: z.uuid().nullable(),
  /** How long one arbiter attempt may take, in milliseconds. */
  skill_arbiter_timeout_ms: timeout(),
  /**
   * The model that compacts a system prompt too long to embed whole before
   * routing embeds it. Null defers to the system prompt reflection model.
   */
  intent_compaction_model_id: z.uuid().nullable(),
  /** How long one compaction attempt may take, in milliseconds. */
  intent_compaction_timeout_ms: timeout(),
  developer_mode: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SystemSettings = z.infer<typeof SystemSettings>;

/** The settings that bound one internal call, for code that maps over them. */
export const TIMEOUT_SETTINGS = [
  'system_prompt_reflection_timeout_ms',
  'evaluation_generation_timeout_ms',
  'embedding_timeout_ms',
  'judge_timeout_ms',
  'skill_arbiter_timeout_ms',
  'intent_compaction_timeout_ms',
] as const;
export type TimeoutSetting = (typeof TIMEOUT_SETTINGS)[number];

export const SystemSettingsUpdateParams = z
  .object({
    system_prompt_reflection_model_id: z.uuid().nullable().optional(),
    system_prompt_reflection_timeout_ms: timeoutUpdate(),
    evaluation_generation_model_id: z.uuid().nullable().optional(),
    evaluation_generation_timeout_ms: timeoutUpdate(),
    embedding_model_id: z.uuid().nullable().optional(),
    embedding_timeout_ms: timeoutUpdate(),
    judge_model_id: z.uuid().nullable().optional(),
    judge_timeout_ms: timeoutUpdate(),
    skill_arbiter_model_id: z.uuid().nullable().optional(),
    skill_arbiter_timeout_ms: timeoutUpdate(),
    intent_compaction_model_id: z.uuid().nullable().optional(),
    intent_compaction_timeout_ms: timeoutUpdate(),
    developer_mode: z.boolean().optional(),
  })
  .strict();

export type SystemSettingsUpdateParams = z.infer<
  typeof SystemSettingsUpdateParams
>;
