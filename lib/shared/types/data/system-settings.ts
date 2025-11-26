import { z } from 'zod';

export const SystemSettings = z.object({
  id: z.uuid(),
  system_prompt_reflection_model_id: z.uuid().nullable(),
  evaluation_generation_model_id: z.uuid().nullable(),
  embedding_model_id: z.uuid().nullable(),
  judge_model_id: z.uuid().nullable(),
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
    developer_mode: z.boolean().optional(),
  })
  .strict();

export type SystemSettingsUpdateParams = z.infer<
  typeof SystemSettingsUpdateParams
>;
