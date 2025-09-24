import { z } from 'zod';

export enum VectorDistanceMetric {
  COSINE = 'cosine',
  L2 = 'l2',
  INNER_PRODUCT = 'inner_product',
}

export const SkillOptimizationEmbedding = z.object({
  id: z.uuid(),
  skill_optimization_id: z.uuid(),
  embedding: z.array(z.number()),
});
export type SkillOptimizationEmbedding = z.infer<
  typeof SkillOptimizationEmbedding
>;

export const SkillOptimizationEmbeddingWithScore =
  SkillOptimizationEmbedding.extend({
    score: z.number(),
  });

export type SkillOptimizationEmbeddingWithScore = z.infer<
  typeof SkillOptimizationEmbeddingWithScore
>;

export const SkillOptimizationEmbeddingQueryParams = z
  .object({
    ids: z.uuid().array().optional(),
    skill_optimization_ids: z.uuid().array().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillOptimizationEmbeddingQueryParams = z.infer<
  typeof SkillOptimizationEmbeddingQueryParams
>;

export const SkillOptimizationEmbeddingSearchParams = z
  .object({
    embedding: z.array(z.number()),
    limit: z.coerce.number().int().positive(),
    distance_metric: z.enum(VectorDistanceMetric),
  })
  .strict();

export type SkillOptimizationEmbeddingSearchParams = z.infer<
  typeof SkillOptimizationEmbeddingSearchParams
>;

export const SkillOptimizationsEmbeddingCreateParams = z
  .object({
    skill_optimization_id: z.uuid(),
    embedding: z.array(z.number()),
  })
  .strict();

export type SkillOptimizationsEmbeddingCreateParams = z.infer<
  typeof SkillOptimizationsEmbeddingCreateParams
>;
