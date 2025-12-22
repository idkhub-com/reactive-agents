import { z } from 'zod';

/**
 * Models.dev API model modalities (input/output types)
 */
export const ModelsDevModalitiesSchema = z.object({
  input: z.array(z.string()),
  output: z.array(z.string()),
});

export type ModelsDevModalities = z.infer<typeof ModelsDevModalitiesSchema>;

/**
 * Models.dev API model cost information
 */
export const ModelsDevCostSchema = z.object({
  input: z.number().optional(),
  output: z.number().optional(),
  cache_read: z.number().optional(),
});

export type ModelsDevCost = z.infer<typeof ModelsDevCostSchema>;

/**
 * Models.dev API model limits
 */
export const ModelsDevLimitSchema = z.object({
  context: z.number().optional(),
  output: z.number().optional(),
});

export type ModelsDevLimit = z.infer<typeof ModelsDevLimitSchema>;

/**
 * Models.dev API individual model schema
 * Note: The id field may not always be present in the API response,
 * so we make it optional and use the key from the parent object instead
 */
export const ModelsDevModelSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  attachment: z.boolean().optional(),
  reasoning: z.boolean().optional(),
  tool_call: z.boolean().optional(),
  temperature: z.boolean().optional(),
  knowledge: z.string().optional(),
  release_date: z.string().optional(),
  last_updated: z.string().optional(),
  modalities: ModelsDevModalitiesSchema.optional(),
  open_weights: z.boolean().optional(),
  cost: ModelsDevCostSchema.optional(),
  limit: ModelsDevLimitSchema.optional(),
});

export type ModelsDevModel = z.infer<typeof ModelsDevModelSchema>;

/**
 * Models.dev API provider schema
 */
export const ModelsDevProviderSchema = z.object({
  id: z.string(),
  env: z.array(z.string()).optional(),
  npm: z.string().optional(),
  api: z.string().optional(),
  name: z.string().optional(),
  doc: z.string().optional(),
  models: z.record(z.string(), ModelsDevModelSchema),
});

export type ModelsDevProvider = z.infer<typeof ModelsDevProviderSchema>;

/**
 * Models.dev API response schema (top-level object with provider IDs as keys)
 */
export const ModelsDevResponseSchema = z.record(
  z.string(),
  ModelsDevProviderSchema,
);

export type ModelsDevResponse = z.infer<typeof ModelsDevResponseSchema>;

/**
 * Parse and validate models.dev API response
 */
export const parseModelsDevResponse = (data: unknown): ModelsDevResponse => {
  return ModelsDevResponseSchema.parse(data);
};

/**
 * Flatten all models from all providers into a single array with provider info
 */
export interface FlattenedModel {
  model: ModelsDevModel;
  providerId: string;
  providerName: string | undefined;
}

/**
 * Flatten models.dev response into an array of models with provider information
 * Ensures model.id is always set from the key
 */
export const flattenModelsDevResponse = (
  response: ModelsDevResponse,
): FlattenedModel[] => {
  const flattened: FlattenedModel[] = [];

  for (const [providerId, provider] of Object.entries(response)) {
    for (const [modelId, model] of Object.entries(provider.models)) {
      flattened.push({
        model: { ...model, id: modelId },
        providerId,
        providerName: provider.name,
      });
    }
  }

  return flattened;
};
