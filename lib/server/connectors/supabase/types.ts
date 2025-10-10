import { z } from 'zod';

export const DatasetLogBridge = z.object({
  dataset_id: z.uuid(),
  log_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});
export type DatasetLogBridge = z.infer<typeof DatasetLogBridge>;

export const DatasetLogBridgeCreateParams = z
  .object({
    dataset_id: z.uuid(),
    log_id: z.uuid(),
  })
  .strict();

export type DatasetLogBridgeCreateParams = z.infer<
  typeof DatasetLogBridgeCreateParams
>;

export const SkillModelBridge = z.object({
  skill_id: z.uuid(),
  model_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});
export type SkillModelBridge = z.infer<typeof SkillModelBridge>;

export const SkillModelBridgeQueryParams = z
  .object({
    skill_id: z.uuid().optional(),
    model_id: z.uuid().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillModelBridgeQueryParams = z.infer<
  typeof SkillModelBridgeQueryParams
>;

export const SkillModelBridgeCreateParams = z
  .object({
    skill_id: z.uuid(),
    model_id: z.uuid(),
  })
  .strict();

export type SkillModelBridgeCreateParams = z.infer<
  typeof SkillModelBridgeCreateParams
>;
