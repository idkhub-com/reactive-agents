import { z } from 'zod';

// Model type enum
export const ModelType = {
  TEXT: 'text',
  EMBED: 'embed',
} as const;

export type ModelType = (typeof ModelType)[keyof typeof ModelType];

export const ModelTypeSchema = z.enum(['text', 'embed']);

export const Model = z.object({
  id: z.uuid(),
  ai_provider_id: z.uuid(),
  model_name: z.string().min(1),
  model_type: ModelTypeSchema,
  embedding_dimensions: z.number().int().positive().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type Model = z.infer<typeof Model>;

export const ModelQueryParams = z
  .object({
    id: z.uuid().optional(),
    ai_provider_id: z.uuid().optional(),
    model_name: z.string().min(1).optional(),
    model_type: ModelTypeSchema.optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type ModelQueryParams = z.infer<typeof ModelQueryParams>;

export const ModelCreateParams = z
  .object({
    ai_provider_id: z.uuid(),
    model_name: z.string().min(1),
    model_type: ModelTypeSchema.default('text'),
    embedding_dimensions: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // embedding_dimensions required for embed models, must be null for text models
      if (data.model_type === 'embed') {
        return data.embedding_dimensions != null;
      }
      return data.embedding_dimensions == null;
    },
    {
      message:
        'embedding_dimensions is required for embed models and must not be set for text models',
      path: ['embedding_dimensions'],
    },
  );

export type ModelCreateParams = z.infer<typeof ModelCreateParams>;

export const ModelUpdateParams = z
  .object({
    model_name: z.string().min(1).optional(),
    model_type: ModelTypeSchema.optional(),
    embedding_dimensions: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['model_name', 'model_type', 'embedding_dimensions'];
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
