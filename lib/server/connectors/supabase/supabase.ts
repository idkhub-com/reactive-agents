import { DatasetDataPointBridge } from '@server/connectors/supabase/types';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@server/constants';
import type {
  CacheStorageConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { generateObjectHash } from '@server/utils/hashing';
import {
  Agent,
  type AgentCreateParams,
  type AgentQueryParams,
  type AgentUpdateParams,
} from '@shared/types/data/agent';
import {
  DataPoint,
  type DataPointCreateParams,
  type DataPointQueryParams,
  type DataPointUpdateParams,
} from '@shared/types/data/data-point';
import {
  DataPointOutput,
  type DataPointOutputCreateParams,
  type DataPointOutputQueryParams,
} from '@shared/types/data/data-point-output';
import {
  Dataset,
  type DatasetCreateParams,
  type DatasetQueryParams,
  type DatasetUpdateParams,
} from '@shared/types/data/dataset';
import {
  EvaluationRun,
  type EvaluationRunCreateParams,
  type EvaluationRunQueryParams,
  type EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';
import {
  Feedback,
  type FeedbackQueryParams,
} from '@shared/types/data/feedback';
import {
  ImprovedResponse,
  type ImprovedResponseQueryParams,
  type ImprovedResponseUpdateParams,
} from '@shared/types/data/improved-response';
import type { LogsQueryParams } from '@shared/types/data/log';
import type { SkillQueryParams } from '@shared/types/data/skill';
import {
  Skill,
  type SkillCreateParams,
  type SkillUpdateParams,
} from '@shared/types/data/skill';
import {
  Tool,
  type ToolCreateParams,
  type ToolQueryParams,
} from '@shared/types/data/tool';
import { IdkRequestLog } from '@shared/types/idkhub/observability';
import { CachedValue } from '@shared/types/middleware/cache';
import { z } from 'zod';

const checkEnvironmentVariables = (): void => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not set');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }
};

const selectFromSupabase = async <T extends z.ZodTypeAny>(
  table: string,
  queryParams: Record<string, string | undefined>,
  schema: T,
): Promise<z.infer<T>> => {
  checkEnvironmentVariables();

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      apiKey: SUPABASE_SERVICE_ROLE_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to fetch from Supabase:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  const data = await response.json();
  try {
    const parsedData = schema.parse(data);
    return parsedData;
  } catch (error) {
    throw new Error(`Failed to parse data from Supabase: ${error}`);
  }
};

const insertIntoSupabase = async <
  InputSchema extends z.ZodTypeAny,
  OutputSchema extends z.ZodTypeAny | null,
>(
  table: string,
  data: z.infer<InputSchema>,
  schema: OutputSchema,
  upsert = false,
): Promise<
  // If schema is not provided, return void
  OutputSchema extends z.ZodTypeAny ? z.infer<OutputSchema> : void
> => {
  checkEnvironmentVariables();

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

  const preferArr = [];

  if (upsert) {
    preferArr.push('resolution=merge-duplicates');
  }

  if (schema) {
    preferArr.push('return=representation');
  }

  const prefer = preferArr.join(', ');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      apiKey: SUPABASE_SERVICE_ROLE_KEY!,
      Prefer: prefer,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to insert into Supabase:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  if (!schema) {
    return undefined as OutputSchema extends z.ZodTypeAny ? never : undefined;
  }

  const rawInsertedData = await response.json();
  try {
    return schema.parse(rawInsertedData);
  } catch (error) {
    throw new Error(`Failed to parse data from Supabase: ${error}`);
  }
};

const updateInSupabase = async <
  InputSchema extends z.ZodTypeAny,
  OutputSchema extends z.ZodTypeAny,
>(
  table: string,
  id: string,
  data: z.infer<InputSchema>,
  schema: OutputSchema | null,
): Promise<
  // If schema is not provided, return void
  OutputSchema extends z.ZodTypeAny ? z.infer<OutputSchema> : void
> => {
  checkEnvironmentVariables();

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('id', `eq.${id}`);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      apiKey: SUPABASE_SERVICE_ROLE_KEY!,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to update in Supabase:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }

  const rawUpdatedData = await response.json();
  try {
    if (!schema) {
      return undefined as OutputSchema extends z.ZodTypeAny ? never : undefined;
    }
    return schema.parse(rawUpdatedData);
  } catch (error) {
    throw new Error(`Failed to parse data from Supabase: ${error}`);
  }
};

const deleteFromSupabase = async (
  table: string,
  params: Record<string, string>,
): Promise<void> => {
  checkEnvironmentVariables();

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      apiKey: SUPABASE_SERVICE_ROLE_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(
      `\
Failed to delete from Supabase:
${response.status} - ${response.statusText}
${await response.text()}`,
    );
  }
};

/**
 * Deletes orphaned data points from the database.
 *
 * Not super efficient, but we can optimize it later.
 *
 * @param dataPointIds - The data point ids to check for orphaned data points.
 * @returns void
 */
async function deleteOrphanedDataPoints(dataPointIds: string[]): Promise<void> {
  const neededDataPoints = await selectFromSupabase(
    'dataset_data_point_bridge',
    { data_point_id: `in.(${dataPointIds.join(',')})` },
    z.array(DatasetDataPointBridge),
  );

  // If a bridge record is not in the neededDataPoints, it is orphaned
  const orphanedDataPoints = dataPointIds.filter(
    (dataPointId) =>
      !neededDataPoints.some(
        (bridgeRecord) => bridgeRecord.data_point_id === dataPointId,
      ),
  );

  if (orphanedDataPoints.length === 0) {
    return;
  }

  await deleteFromSupabase('data_points', {
    id: `in.(${orphanedDataPoints.join(',')})`,
  });
}

export const supabaseUserDataStorageConnector: UserDataStorageConnector = {
  getFeedback: async (
    queryParams: FeedbackQueryParams,
  ): Promise<Feedback[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }

    if (queryParams.log_id) {
      postgrestParams.log_id = `eq.${queryParams.log_id}`;
    }

    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }

    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const feedbacks = await selectFromSupabase(
      'feedbacks',
      postgrestParams,
      z.array(Feedback),
    );
    return feedbacks;
  },
  createFeedback: async (feedback: Feedback): Promise<Feedback> => {
    const insertedFeedback = await insertIntoSupabase(
      'feedbacks',
      feedback,
      z.array(Feedback),
    );
    return insertedFeedback[0];
  },
  deleteFeedback: async (id: string): Promise<void> => {
    await deleteFromSupabase('feedbacks', { id: `eq.${id}` });
  },

  getImprovedResponse: async (
    params: ImprovedResponseQueryParams,
  ): Promise<ImprovedResponse[]> => {
    const postgrestParams: Record<string, string> = {};

    if (params.id) {
      postgrestParams.id = `eq.${params.id}`;
    }

    if (params.agent_id) {
      postgrestParams.agent_id = `eq.${params.agent_id}`;
    }

    if (params.skill_id) {
      postgrestParams.skill_id = `eq.${params.skill_id}`;
    }

    if (params.log_id) {
      postgrestParams.log_id = `eq.${params.log_id}`;
    }

    const responses = await selectFromSupabase(
      'improved_responses',
      postgrestParams,
      z.array(ImprovedResponse),
    );

    return responses;
  },

  createImprovedResponse: async (
    improvedResponse: ImprovedResponse,
  ): Promise<ImprovedResponse> => {
    const insertedResponse = await insertIntoSupabase(
      'improved_responses',
      improvedResponse,
      z.array(ImprovedResponse),
    );

    // Compute content hash from the related log and set is_golden for matching data points
    const logs = await selectFromSupabase(
      'logs',
      { id: `eq.${improvedResponse.log_id}` },
      z.array(IdkRequestLog),
    );
    if (logs.length > 0) {
      const base = `${logs[0].function_name}-${JSON.stringify(
        logs[0].ai_provider_request_log?.request_body || {},
      )}`;
      const encoded = new TextEncoder().encode(base);
      const digest = await crypto.subtle.digest({ name: 'SHA-256' }, encoded);
      const contentHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Primary: update rows matching content hash
      const urlByContent = new URL(`${SUPABASE_URL}/rest/v1/data_points`);
      urlByContent.searchParams.set('hash', `eq.${contentHash}`);
      await fetch(urlByContent, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ is_golden: true }),
      });

      // Legacy: also update rows where hash equals the log_id
      const urlByLegacy = new URL(`${SUPABASE_URL}/rest/v1/data_points`);
      urlByLegacy.searchParams.set('hash', `eq.${improvedResponse.log_id}`);
      await fetch(urlByLegacy, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ is_golden: true }),
      });
    }

    return insertedResponse[0];
  },

  updateImprovedResponse: async (
    id: string,
    update: ImprovedResponseUpdateParams,
  ): Promise<ImprovedResponse> => {
    const updatedResponse = await updateInSupabase(
      'improved_responses',
      id,
      update,
      z.array(ImprovedResponse),
    );

    return updatedResponse[0];
  },

  deleteImprovedResponse: async (id: string): Promise<void> => {
    // First get the improved response to find its log_id
    const improvedResponse = await selectFromSupabase(
      'improved_responses',
      { id: `eq.${id}` },
      z.array(ImprovedResponse),
    );

    if (improvedResponse.length === 0) {
      throw new Error('Improved response not found');
    }

    const logId = improvedResponse[0].log_id;

    // Delete the improved response
    await deleteFromSupabase('improved_responses', { id: `eq.${id}` });

    // Check if there are any other improved responses for this log_id
    const remainingResponses = await selectFromSupabase(
      'improved_responses',
      { log_id: `eq.${logId}` },
      z.array(ImprovedResponse),
    );

    // If no other improved responses exist for this log_id, set is_golden = false
    if (remainingResponses.length === 0) {
      const logs = await selectFromSupabase(
        'logs',
        { id: `eq.${logId}` },
        z.array(IdkRequestLog),
      );
      if (logs.length > 0) {
        const base = `${logs[0].function_name}-${JSON.stringify(
          logs[0].ai_provider_request_log?.request_body || {},
        )}`;
        const encoded = new TextEncoder().encode(base);
        const digest = await crypto.subtle.digest({ name: 'SHA-256' }, encoded);
        const contentHash = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        // Primary: update rows matching content hash
        const urlByContent = new URL(`${SUPABASE_URL}/rest/v1/data_points`);
        urlByContent.searchParams.set('hash', `eq.${contentHash}`);
        await fetch(urlByContent, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ is_golden: false }),
        });

        // Legacy: also update rows where hash equals the log_id
        const urlByLegacy = new URL(`${SUPABASE_URL}/rest/v1/data_points`);
        urlByLegacy.searchParams.set('hash', `eq.${logId}`);
        await fetch(urlByLegacy, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ is_golden: false }),
        });
      }
    }
  },

  getAgents: async (queryParams: AgentQueryParams): Promise<Agent[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.name) {
      postgrestParams.name = `eq.${queryParams.name}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const agents = await selectFromSupabase(
      'agents',
      postgrestParams,
      z.array(Agent),
    );

    return agents;
  },

  createAgent: async (agent: AgentCreateParams): Promise<Agent> => {
    const insertedAgent = await insertIntoSupabase(
      'agents',
      agent,
      z.array(Agent),
    );
    return insertedAgent[0];
  },

  updateAgent: async (
    id: string,
    update: AgentUpdateParams,
  ): Promise<Agent> => {
    const updatedAgent = await updateInSupabase(
      'agents',
      id,
      update,
      z.array(Agent),
    );
    return updatedAgent[0];
  },

  deleteAgent: async (id: string): Promise<void> => {
    await deleteFromSupabase('agents', { id: `eq.${id}` });
  },

  getSkills: async (queryParams: SkillQueryParams): Promise<Skill[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgrestParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.name) {
      postgrestParams.name = `eq.${queryParams.name}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const skills = await selectFromSupabase(
      'skills',
      postgrestParams,
      z.array(Skill),
    );

    return skills;
  },

  createSkill: async (skill: SkillCreateParams): Promise<Skill> => {
    const insertedSkill = await insertIntoSupabase(
      'skills',
      skill,
      z.array(Skill),
    );
    return insertedSkill[0];
  },

  updateSkill: async (
    id: string,
    update: SkillUpdateParams,
  ): Promise<Skill> => {
    const updatedSkill = await updateInSupabase(
      'skills',
      id,
      update,
      z.array(Skill),
    );
    return updatedSkill[0];
  },

  deleteSkill: async (id: string): Promise<void> => {
    await deleteFromSupabase('skills', { id: `eq.${id}` });
  },

  getTools: async (queryParams: ToolQueryParams): Promise<Tool[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgrestParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.hash) {
      postgrestParams.hash = `eq.${queryParams.hash}`;
    }
    if (queryParams.type) {
      postgrestParams.type = `eq.${queryParams.type}`;
    }
    if (queryParams.name) {
      postgrestParams.name = `eq.${queryParams.name}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const tools = await selectFromSupabase(
      'tools',
      postgrestParams,
      z.array(Tool),
    );

    return tools;
  },

  createTool: async (tool: ToolCreateParams): Promise<Tool> => {
    const insertedTool = await insertIntoSupabase('tools', tool, z.array(Tool));
    return insertedTool[0];
  },

  deleteTool: async (id: string): Promise<void> => {
    await deleteFromSupabase('tools', { id: `eq.${id}` });
  },

  // Dataset methods
  getDatasets: async (queryParams: DatasetQueryParams): Promise<Dataset[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgrestParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.name) {
      postgrestParams.name = `eq.${queryParams.name}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const datasets = await selectFromSupabase(
      'datasets',
      postgrestParams,
      z.array(Dataset),
    );

    return datasets;
  },

  createDataset: async (dataset: DatasetCreateParams): Promise<Dataset> => {
    const insertedDataset = await insertIntoSupabase(
      'datasets',
      dataset,
      z.array(Dataset),
    );
    return insertedDataset[0];
  },

  updateDataset: async (
    id: string,
    update: DatasetUpdateParams,
  ): Promise<Dataset> => {
    const updatedDataset = await updateInSupabase(
      'datasets',
      id,
      update,
      z.array(Dataset),
    );
    return updatedDataset[0];
  },

  deleteDataset: async (id: string): Promise<void> => {
    // First, get all data points that are only referenced by this dataset
    const dataPointsInDataset = await selectFromSupabase(
      'dataset_data_point_bridge',
      { dataset_id: `eq.${id}` },
      z.array(
        z.object({
          dataset_id: z.string().uuid(),
          data_point_id: z.string().uuid(),
          created_at: z.string().datetime({ offset: true }),
        }),
      ),
    );

    // Delete the dataset (this will cascade delete bridge records due to ON DELETE CASCADE)
    await deleteFromSupabase('datasets', { id: `eq.${id}` });

    // Delete orphaned data points
    await deleteOrphanedDataPoints(
      dataPointsInDataset.map((bridgeRecord) => bridgeRecord.data_point_id),
    );
  },

  // Data Point methods
  getDataPoints: async (
    datasetId: string,
    queryParams: DataPointQueryParams,
  ): Promise<DataPoint[]> => {
    const postgRESTQuery: Record<string, string> = {};
    const bridgesPostgRESTQuery: Record<string, string> = {
      dataset_id: `eq.${datasetId}`,
    };

    if (queryParams.ids) {
      bridgesPostgRESTQuery.data_point_id = `in.(${queryParams.ids.join(',')})`;
    }

    // First get the data point IDs from the bridge table
    const bridgeRecords = await selectFromSupabase(
      'dataset_data_point_bridge',
      bridgesPostgRESTQuery,
      z.array(DatasetDataPointBridge),
    );

    if (bridgeRecords.length === 0) {
      return [];
    }

    const dataPointIds = bridgeRecords.map((record) => record.data_point_id);

    // Then get the actual data points
    postgRESTQuery.id = `in.(${dataPointIds.join(',')})`;

    if (queryParams.method) {
      postgRESTQuery.method = `eq.${queryParams.method}`;
    }
    if (queryParams.endpoint) {
      postgRESTQuery.endpoint = `eq.${queryParams.endpoint}`;
    }
    if (queryParams.function_name) {
      postgRESTQuery.function_name = `eq.${queryParams.function_name}`;
    }
    if (queryParams.is_golden !== undefined) {
      postgRESTQuery.is_golden = `eq.${queryParams.is_golden}`;
    }
    if (queryParams.limit) {
      postgRESTQuery.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTQuery.offset = queryParams.offset.toString();
    }

    const dataPoints = await selectFromSupabase(
      'data_points',
      postgRESTQuery,
      z.array(DataPoint),
    );

    return dataPoints;
  },

  createDataPoints: async (
    datasetId: string,
    dataPoints: DataPointCreateParams[],
  ): Promise<DataPoint[]> => {
    // Compute content hashes based on request_body only (matches cache middleware)
    const computedHashes = await Promise.all(
      dataPoints.map((dp) => {
        return generateObjectHash(dp.request_body || {});
      }),
    );

    // Look up existing data point hashes only
    const existingHashRows = computedHashes.length
      ? await selectFromSupabase(
          'data_points',
          { select: 'hash', hash: `in.(${computedHashes.join(',')})` },
          z.array(z.object({ hash: z.string() })),
        )
      : [];

    const existingHashSet = new Set(existingHashRows.map((r) => r.hash));
    const toInsert = dataPoints
      .map((dp, i) => ({ dp, hash: computedHashes[i] }))
      .filter(({ hash }) => !existingHashSet.has(hash))
      .map(({ dp, hash }) => ({
        // table expects: hash + rest of fields
        hash,
        method: dp.method,
        endpoint: dp.endpoint,
        function_name: dp.function_name,
        request_body: dp.request_body,
        ground_truth: dp.ground_truth ?? null,
        is_golden: dp.is_golden,
        metadata: dp.metadata ?? {},
      }));

    // Create the data points without linking to the dataset
    const insertedDataPoints = toInsert.length
      ? await insertIntoSupabase('data_points', toInsert, z.array(DataPoint))
      : [];

    // Fetch full existing data points for return/linking
    const existingDataPoints = existingHashSet.size
      ? await selectFromSupabase(
          'data_points',
          { hash: `in.(${Array.from(existingHashSet).join(',')})` },
          z.array(DataPoint),
        )
      : [];

    const allDataPoints = [...existingDataPoints, ...insertedDataPoints];

    const linkingBridges = allDataPoints.map((dp) => ({
      dataset_id: datasetId,
      data_point_id: dp.id,
    }));

    // Create the bridge record to link dataset and data point
    // With upsert true to avoid insert errors
    await insertIntoSupabase(
      'dataset_data_point_bridge',
      linkingBridges,
      null,
      true,
    );

    return [...existingDataPoints, ...insertedDataPoints];
  },

  updateDataPoint: async (
    id: string,
    update: DataPointUpdateParams,
  ): Promise<DataPoint> => {
    const updatedDataPoint = await updateInSupabase(
      'data_points',
      id,
      update,
      z.array(DataPoint),
    );
    return updatedDataPoint[0];
  },

  deleteDataPoints: async (datasetId: string, ids: string[]): Promise<void> => {
    await deleteFromSupabase('dataset_data_point_bridge', {
      dataset_id: `eq.${datasetId}`,
      data_point_id: `in.(${ids.join(',')})`,
    });

    // Delete orphaned data points
    await deleteOrphanedDataPoints(ids);
  },

  // Evaluation Run methods
  getEvaluationRuns: async (
    queryParams: EvaluationRunQueryParams,
  ): Promise<EvaluationRun[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.dataset_id) {
      postgrestParams.dataset_id = `eq.${queryParams.dataset_id}`;
    }
    if (queryParams.agent_id) {
      postgrestParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.evaluation_method) {
      postgrestParams.evaluation_method = `eq.${queryParams.evaluation_method}`;
    }
    if (queryParams.name) {
      postgrestParams.name = `eq.${queryParams.name}`;
    }
    if (queryParams.status) {
      postgrestParams.status = `eq.${queryParams.status}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const evaluationRuns = await selectFromSupabase(
      'evaluation_runs',
      postgrestParams,
      z.array(EvaluationRun),
    );

    return evaluationRuns;
  },

  createEvaluationRun: async (
    evaluationRun: EvaluationRunCreateParams,
  ): Promise<EvaluationRun> => {
    const insertedEvaluationRun = await insertIntoSupabase(
      'evaluation_runs',
      evaluationRun,
      z.array(EvaluationRun),
    );
    return insertedEvaluationRun[0];
  },

  updateEvaluationRun: async (
    id: string,
    update: EvaluationRunUpdateParams,
  ): Promise<EvaluationRun> => {
    const updatedEvaluationRun = await updateInSupabase(
      'evaluation_runs',
      id,
      update,
      z.array(EvaluationRun),
    );
    return updatedEvaluationRun[0];
  },

  deleteEvaluationRun: async (id: string): Promise<void> => {
    await deleteFromSupabase('evaluation_runs', { id: `eq.${id}` });
  },

  // Evaluation Output methods
  getDataPointOutputs: async (
    evaluationRunId: string,
    queryParams: DataPointOutputQueryParams,
  ): Promise<DataPointOutput[]> => {
    const postgRESTQuery: Record<string, string> = {
      // The evaluation run id is always required
      evaluation_run_id: `eq.${evaluationRunId}`,
    };

    if (queryParams.ids) {
      postgRESTQuery.id = `in.(${queryParams.ids.join(',')})`;
    }
    if (queryParams.data_point_ids) {
      postgRESTQuery.data_point_id = `in.(${queryParams.data_point_ids.join(',')})`;
    }
    if (queryParams.score_min !== undefined) {
      postgRESTQuery.score = `gte.${queryParams.score_min}`;
    }
    if (queryParams.score_max !== undefined) {
      const existing = postgRESTQuery.score;
      if (existing) {
        postgRESTQuery.score = `and(${existing},lte.${queryParams.score_max})`;
      } else {
        postgRESTQuery.score = `lte.${queryParams.score_max}`;
      }
    }
    if (queryParams.limit) {
      postgRESTQuery.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTQuery.offset = queryParams.offset.toString();
    }

    const dataPointOutputs = await selectFromSupabase(
      'data_point_outputs',
      postgRESTQuery,
      z.array(DataPointOutput),
    );

    return dataPointOutputs;
  },

  createDataPointOutput: async (
    evaluationRunId: string,
    dataPointOutput: DataPointOutputCreateParams,
  ): Promise<DataPointOutput> => {
    const insertedDataPointOutput = await insertIntoSupabase(
      'data_point_outputs',
      {
        ...dataPointOutput,
        evaluation_run_id: evaluationRunId,
      },
      z.array(DataPointOutput),
    );
    return insertedDataPointOutput[0];
  },

  deleteDataPointOutput: async (
    evaluationRunId: string,
    id: string,
  ): Promise<void> => {
    await deleteFromSupabase('data_point_outputs', {
      id: `eq.${id}`,
      evaluation_run_id: `eq.${evaluationRunId}`,
    });
  },
};

export const supabaseCacheStorageConnector: CacheStorageConnector = {
  getCache: async (key: string) => {
    const cachedValues = await selectFromSupabase(
      'cache',
      { key: `eq.${key}`, expires_at: `lte.${new Date().toISOString()}` },
      z.array(CachedValue),
    );

    if (cachedValues.length === 0) {
      return null;
    }

    return cachedValues[0].value;
  },
  setCache: async (key: string, value: string) => {
    const cachedValue: CachedValue = {
      key,
      value,
      expires_at: new Date().toISOString(),
    };
    // We use upsert to replace the existing value if it exists
    await insertIntoSupabase('cache', cachedValue, null, true);
  },
  deleteCache: async (key: string) => {
    await deleteFromSupabase('cache', { key: `eq.${key}` });
  },
};

export const supabaseLogsStorageConnector: LogsStorageConnector = {
  getLogs: async (queryParams: LogsQueryParams): Promise<IdkRequestLog[]> => {
    const postgRESTQuery: Record<string, string> = {
      order: 'start_time.desc',
    };

    if (queryParams.agent_id) {
      postgRESTQuery.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgRESTQuery.skill_id = `eq.${queryParams.skill_id}`;
    }
    if (queryParams.app_id) {
      postgRESTQuery.app_id = `eq.${queryParams.app_id}`;
    }
    if (queryParams.id) {
      postgRESTQuery.id = `eq.${queryParams.id}`;
    }
    if (queryParams.method) {
      postgRESTQuery.method = `eq.${queryParams.method}`;
    }
    if (queryParams.endpoint) {
      postgRESTQuery.endpoint = `eq.${queryParams.endpoint}`;
    }
    if (queryParams.function_name) {
      postgRESTQuery.function_name = `eq.${queryParams.function_name}`;
    }
    if (queryParams.status) {
      postgRESTQuery.status = `eq.${queryParams.status}`;
    }
    if (queryParams.cache_status) {
      postgRESTQuery.cache_status = `eq.${queryParams.cache_status}`;
    }
    if (queryParams.limit) {
      postgRESTQuery.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTQuery.offset = queryParams.offset.toString();
    }

    if (queryParams.after) {
      postgRESTQuery.start_time = `gte.${queryParams.after}`;
    }
    if (queryParams.before) {
      // If we already have a start_time filter, we need to combine them
      if (postgRESTQuery.start_time) {
        // For range queries, we'll use PostgREST's and operator syntax
        postgRESTQuery.and = `(start_time.gte.${queryParams.after},start_time.lte.${queryParams.before})`;
        delete postgRESTQuery.start_time;
      } else {
        postgRESTQuery.start_time = `lte.${queryParams.before}`;
      }
    }

    const logs = await selectFromSupabase(
      'logs',
      postgRESTQuery,
      z.array(IdkRequestLog),
    );
    return logs;
  },
  createLog: async (log: IdkRequestLog): Promise<IdkRequestLog> => {
    const insertedLog = await insertIntoSupabase(
      'logs',
      log,
      z.array(IdkRequestLog),
    );
    return insertedLog[0];
  },
  deleteLog: async (id: string) => {
    await deleteFromSupabase('logs', { id: `eq.${id}` });
  },
};
