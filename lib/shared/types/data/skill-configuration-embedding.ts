import { z } from 'zod';

export enum VectorDistanceMetric {
  COSINE = 'cosine',
  L2 = 'l2',
  INNER_PRODUCT = 'inner_product',
}

export const SkillConfigurationEmbedding = z.object({
  id: z.uuid(),
  skill_configuration_id: z.uuid(),
  embedding: z.array(z.number()),
});
export type SkillConfigurationEmbedding = z.infer<
  typeof SkillConfigurationEmbedding
>;

export const SkillConfigurationEmbeddingWithScore =
  SkillConfigurationEmbedding.extend({
    score: z.number(),
  });

export type SkillConfigurationEmbeddingWithScore = z.infer<
  typeof SkillConfigurationEmbeddingWithScore
>;

export const SkillConfigurationEmbeddingQueryParams = z
  .object({
    ids: z.uuid().array().optional(),
    skill_configuration_ids: z.uuid().array().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillConfigurationEmbeddingQueryParams = z.infer<
  typeof SkillConfigurationEmbeddingQueryParams
>;

export const SkillConfigurationEmbeddingSearchParams = z
  .object({
    embedding: z.array(z.number()),
    limit: z.coerce.number().int().positive(),
    distance_metric: z.enum(VectorDistanceMetric),
  })
  .strict();

export type SkillConfigurationEmbeddingSearchParams = z.infer<
  typeof SkillConfigurationEmbeddingSearchParams
>;

export const SkillConfigurationEmbeddingCreateParams = z
  .object({
    skill_configuration_id: z.uuid(),
    embedding: z.array(z.number()),
  })
  .strict();

export type SkillConfigurationEmbeddingCreateParams = z.infer<
  typeof SkillConfigurationEmbeddingCreateParams
>;
