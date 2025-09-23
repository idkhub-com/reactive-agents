import type { EmbeddingsStorageConnector } from '@server/types/connector';

import {
  SkillConfigurationEmbedding,
  type SkillConfigurationEmbeddingQueryParams,
  type SkillConfigurationEmbeddingSearchParams,
  SkillConfigurationEmbeddingWithScore,
} from '@shared/types/data/skill-configuration-embedding';
import { z } from 'zod';
import {
  deleteFromSupabase,
  insertIntoSupabase,
  rpcFunctionWithResponse,
  selectFromSupabase,
} from './base';

export const supabaseEmbeddingsStorageConnector: EmbeddingsStorageConnector = {
  getSkillConfigurationEmbeddings: async (
    queryParams: SkillConfigurationEmbeddingQueryParams,
  ): Promise<SkillConfigurationEmbedding[]> => {
    const postgRESTQuery: Record<string, string> = {
      order: 'start_time.desc',
    };

    if (queryParams.ids) {
      postgRESTQuery.id = `in.(${queryParams.ids.join(',')})`;
    }
    if (queryParams.skill_configuration_ids) {
      postgRESTQuery.skill_configuration_ids = `in.(${queryParams.skill_configuration_ids.join(',')})`;
    }
    if (queryParams.limit) {
      postgRESTQuery.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTQuery.offset = queryParams.offset.toString();
    }

    const embeddings = await selectFromSupabase(
      'skill_configuration_embeddings',
      postgRESTQuery,
      z.array(SkillConfigurationEmbedding),
    );

    return embeddings;
  },

  /**
   * Search for logs with similar embeddings using k-nearest neighbor
   */
  searchSimilarSkillConfigurationEmbeddings: async (
    searchParams: SkillConfigurationEmbeddingSearchParams,
  ): Promise<SkillConfigurationEmbeddingWithScore[]> => {
    const skillConfigurationEmbeddings = await rpcFunctionWithResponse(
      'search_similar_configurations',
      {
        query_embedding: searchParams.embedding,
        similarity_limit: searchParams.limit,
        distance_metric: searchParams.distance_metric,
      },
      z.array(SkillConfigurationEmbeddingWithScore),
    );

    return skillConfigurationEmbeddings;
  },

  createSkillConfigurationEmbedding: async (
    embedding: SkillConfigurationEmbedding,
  ): Promise<SkillConfigurationEmbedding> => {
    const insertedEmbedding = await insertIntoSupabase(
      'skill_configuration_embeddings',
      embedding,
      z.array(SkillConfigurationEmbedding),
    );
    return insertedEmbedding[0];
  },
  deleteEmbedding: async (id: string) => {
    await deleteFromSupabase('skill_configuration_embeddings', {
      id: `eq.${id}`,
    });
  },
};
