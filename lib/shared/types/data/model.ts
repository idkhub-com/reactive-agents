import { z } from 'zod';

export const Model = z.object({
  id: z.uuid(),
  ai_provider_id: z.uuid(),
  model_name: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Model = z.infer<typeof Model>;

export const ModelQueryParams = z
  .object({
    id: z.uuid().optional(),
    ai_provider_id: z.uuid().optional(),
    model_name: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type ModelQueryParams = z.infer<typeof ModelQueryParams>;

export const ModelCreateParams = z
  .object({
    ai_provider_id: z.uuid(),
    model_name: z.string().min(1),
  })
  .strict();

export type ModelCreateParams = z.infer<typeof ModelCreateParams>;

export const ModelUpdateParams = z
  .object({
    model_name: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['model_name'];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['model_name'],
    },
  );

export type ModelUpdateParams = z.infer<typeof ModelUpdateParams>;
