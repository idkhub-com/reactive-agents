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

import {
  Agent,
  type AgentCreateParams,
  type AgentQueryParams,
  type AgentUpdateParams,
} from '@shared/types/data/agent';

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
import { Log, type LogsQueryParams } from '@shared/types/data/log';
import {
  LogOutput,
  type LogOutputCreateParams,
  type LogOutputQueryParams,
} from '@shared/types/data/log-output';
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
import type { DatasetLogBridgeCreateParams } from './types';
import { DatasetLogBridge } from './types';

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

const selectFromSupabase = async <T extends z.ZodType>(
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
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType | null,
>(
  table: string,
  data: z.infer<InputSchema>,
  schema: OutputSchema,
  upsert = false,
): Promise<
  // If schema is not provided, return void
  OutputSchema extends z.ZodType ? z.infer<OutputSchema> : void
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
    return undefined as OutputSchema extends z.ZodType ? never : undefined;
  }

  const rawInsertedData = await response.json();
  try {
    return schema.parse(rawInsertedData) as OutputSchema extends z.ZodType
      ? never
      : undefined;
  } catch (error) {
    throw new Error(`Failed to parse data from Supabase: ${error}`);
  }
};

const updateInSupabase = async <
  InputSchema extends z.ZodType,
  OutputSchema extends z.ZodType,
>(
  table: string,
  id: string,
  data: z.infer<InputSchema>,
  schema: OutputSchema | null,
): Promise<
  // If schema is not provided, return void
  OutputSchema extends z.ZodType ? z.infer<OutputSchema> : void
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
      return undefined as OutputSchema extends z.ZodType ? never : undefined;
    }
    return schema.parse(rawUpdatedData) as OutputSchema extends z.ZodType
      ? never
      : undefined;
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
    await deleteFromSupabase('improved_responses', { id: `eq.${id}` });
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
    // Delete the dataset (this will cascade delete bridge records due to ON DELETE CASCADE)
    await deleteFromSupabase('datasets', { id: `eq.${id}` });
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

  // Logs
  getLogs: async (queryParams: LogsQueryParams): Promise<Log[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.ids) {
      postgrestParams.id = `in.(${queryParams.ids.join(',')})`;
    }
    if (queryParams.agent_id) {
      postgrestParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgrestParams.skill_id = `eq.${queryParams.skill_id}`;
    }
    if (queryParams.app_id) {
      postgrestParams.app_id = `eq.${queryParams.app_id}`;
    }
    if (queryParams.method) {
      postgrestParams.method = `eq.${queryParams.method}`;
    }
    if (queryParams.endpoint) {
      postgrestParams.endpoint = `eq.${queryParams.endpoint}`;
    }
    if (queryParams.function_name) {
      postgrestParams.function_name = `eq.${queryParams.function_name}`;
    }
    if (queryParams.status) {
      postgrestParams.status = `eq.${queryParams.status}`;
    }
    if (queryParams.cache_status) {
      postgrestParams.cache_status = `eq.${queryParams.cache_status}`;
    }
    if (queryParams.after) {
      postgrestParams.start_time = `gte.${queryParams.after}`;
    }
    if (queryParams.before) {
      postgrestParams.start_time = `lte.${queryParams.before}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const logs = await selectFromSupabase(
      'logs',
      postgrestParams,
      z.array(Log),
    );

    return logs;
  },

  deleteLog: async (id: string): Promise<void> => {
    await deleteFromSupabase('logs', { id: `eq.${id}` });
  },

  // Dataset-Log Bridge
  getDatasetLogs: async (
    datasetId: string,
    queryParams: LogsQueryParams,
  ): Promise<Log[]> => {
    // First, get the log IDs from the bridge table
    const bridgeEntries = await selectFromSupabase(
      'dataset_log_bridge',
      { dataset_id: `eq.${datasetId}` },
      z.array(DatasetLogBridge),
    );

    if (bridgeEntries.length === 0) {
      return [];
    }

    const logIds = bridgeEntries.map((entry: DatasetLogBridge) => entry.log_id);

    // Then, get the logs using the IDs
    const postgrestParams: Record<string, string> = {
      id: `in.(${logIds.join(',')})`,
    };

    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }

    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const logs = await selectFromSupabase(
      'logs',
      postgrestParams,
      z.array(Log),
    );

    return logs;
  },

  addLogsToDataset: async (
    datasetId: string,
    logIds: string[],
  ): Promise<void> => {
    const bridgeEntries: DatasetLogBridgeCreateParams[] = logIds.map(
      (logId) => ({
        dataset_id: datasetId,
        log_id: logId,
      }),
    );

    await insertIntoSupabase('dataset_log_bridge', bridgeEntries, null);
  },

  removeLogsFromDataset: async (
    datasetId: string,
    logIds: string[],
  ): Promise<void> => {
    await deleteFromSupabase('dataset_log_bridge', {
      dataset_id: `eq.${datasetId}`,
      log_id: `in.(${logIds.join(',')})`,
    });
  },

  // Log Outputs
  getLogOutputs: async (
    evaluationRunId: string,
    queryParams: LogOutputQueryParams,
  ): Promise<LogOutput[]> => {
    const postgrestParams: Record<string, string> = {
      evaluation_run_id: `eq.${evaluationRunId}`,
    };

    if (queryParams.ids && queryParams.ids.length > 0) {
      postgrestParams.id = `in.(${queryParams.ids.join(',')})`;
    }

    if (queryParams.log_ids && queryParams.log_ids.length > 0) {
      postgrestParams.log_id = `in.(${queryParams.log_ids.join(',')})`;
    }

    if (
      typeof queryParams.score_min === 'number' &&
      typeof queryParams.score_max === 'number'
    ) {
      postgrestParams.score = `and(gte.${queryParams.score_min},lte.${queryParams.score_max})`;
    } else if (typeof queryParams.score_min === 'number') {
      postgrestParams.score = `gte.${queryParams.score_min}`;
    } else if (typeof queryParams.score_max === 'number') {
      postgrestParams.score = `lte.${queryParams.score_max}`;
    }

    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }

    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    const logOutputs = await selectFromSupabase(
      'log_outputs',
      postgrestParams,
      z.array(LogOutput),
    );
    return logOutputs;
  },

  createLogOutput: async (
    evaluationRunId: string,
    logOutput: LogOutputCreateParams,
  ): Promise<LogOutput> => {
    const createdLogOutput = await insertIntoSupabase(
      'log_outputs',
      { ...logOutput, evaluation_run_id: evaluationRunId },
      z.array(LogOutput),
    );
    return createdLogOutput[0];
  },

  deleteLogOutput: async (
    evaluationRunId: string,
    id: string,
  ): Promise<void> => {
    await deleteFromSupabase('log_outputs', {
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
