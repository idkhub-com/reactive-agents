import type { EmbeddingsStorageConnector } from '@server/types/connector';

import {
  SkillOptimizationEmbedding,
  type SkillOptimizationEmbeddingQueryParams,
  type SkillOptimizationEmbeddingSearchParams,
  SkillOptimizationEmbeddingWithScore,
} from '@shared/types/data/skill-optimization-embedding';
import { z } from 'zod';
import {
  deleteFromSupabase,
  insertIntoSupabase,
  rpcFunctionWithResponse,
  selectFromSupabase,
} from './base';

export const supabaseEmbeddingsStorageConnector: EmbeddingsStorageConnector = {
  getSkillConfigurationEmbeddings: async (
    queryParams: SkillOptimizationEmbeddingQueryParams,
  ): Promise<SkillOptimizationEmbedding[]> => {
    const postgRESTQuery: Record<string, string> = {
      order: 'start_time.desc',
    };

    if (queryParams.ids) {
      postgRESTQuery.id = `in.(${queryParams.ids.join(',')})`;
    }
    if (queryParams.skill_optimization_ids) {
      postgRESTQuery.skill_optimization_ids = `in.(${queryParams.skill_optimization_ids.join(',')})`;
    }
    if (queryParams.limit) {
      postgRESTQuery.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTQuery.offset = queryParams.offset.toString();
    }

    const embeddings = await selectFromSupabase(
      'skill_optimization_embeddings',
      postgRESTQuery,
      z.array(SkillOptimizationEmbedding),
    );

    return embeddings;
  },

  /**
   * Search for logs with similar embeddings using k-nearest neighbor
   */
  searchSimilarSkillConfigurationEmbeddings: async (
    searchParams: SkillOptimizationEmbeddingSearchParams,
  ): Promise<SkillOptimizationEmbeddingWithScore[]> => {
    const skillConfigurationEmbeddings = await rpcFunctionWithResponse(
      'search_similar_configurations',
      {
        query_embedding: searchParams.embedding,
        similarity_limit: searchParams.limit,
        distance_metric: searchParams.distance_metric,
      },
      z.array(SkillOptimizationEmbeddingWithScore),
    );

    return skillConfigurationEmbeddings;
  },

  createSkillConfigurationEmbedding: async (
    embedding: SkillOptimizationEmbedding,
  ): Promise<SkillOptimizationEmbedding> => {
    const insertedEmbedding = await insertIntoSupabase(
      'skill_optimization_embeddings',
      embedding,
      z.array(SkillOptimizationEmbedding),
    );
    return insertedEmbedding[0];
  },
  deleteEmbedding: async (id: string) => {
    await deleteFromSupabase('skill_optimization_embeddings', {
      id: `eq.${id}`,
    });
  },
};
