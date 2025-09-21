import crypto from 'node:crypto';
import {
  AI_PROVIDER_API_KEY_ENCRYPTION_KEY,
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
  AIProviderAPIKey,
  type AIProviderAPIKeyCreateParams,
  type AIProviderAPIKeyQueryParams,
  type AIProviderAPIKeyUpdateParams,
} from '@shared/types/data/ai-provider-api-key';
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
import {
  Model,
  type ModelCreateParams,
  type ModelQueryParams,
  type ModelUpdateParams,
} from '@shared/types/data/model';
import type { SkillQueryParams } from '@shared/types/data/skill';
import {
  Skill,
  type SkillCreateParams,
  type SkillUpdateParams,
} from '@shared/types/data/skill';
import {
  SkillConfiguration,
  type SkillConfigurationCreateParams,
  type SkillConfigurationQueryParams,
  type SkillConfigurationUpdateParams,
} from '@shared/types/data/skill-configuration';
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

const encryptAPIKey = (plaintext: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = crypto
    .createHash('sha256')
    .update(AI_PROVIDER_API_KEY_ENCRYPTION_KEY)
    .digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.setAAD(Buffer.from('api-key'));

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

const decryptAPIKey = (encryptedData: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = crypto
    .createHash('sha256')
    .update(AI_PROVIDER_API_KEY_ENCRYPTION_KEY)
    .digest();

  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAAD(Buffer.from('api-key'));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
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

  getSkillConfigurations: async (
    queryParams: SkillConfigurationQueryParams,
  ): Promise<SkillConfiguration[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgrestParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgrestParams.skill_id = `eq.${queryParams.skill_id}`;
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

    const skillConfigurations = await selectFromSupabase(
      'skill_configurations',
      postgrestParams,
      z.array(SkillConfiguration),
    );

    return skillConfigurations;
  },

  createSkillConfiguration: async (
    skillConfiguration: SkillConfigurationCreateParams,
  ): Promise<SkillConfiguration> => {
    const now = new Date().toISOString();

    // Generate 6-character unique hash (content + timestamp to ensure uniqueness)
    const dataString = JSON.stringify(skillConfiguration.data) + now;
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(dataString),
    );
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 6);

    // Create versioned data structure with 'current' key
    const versionedData = {
      current: {
        hash,
        created_at: now,
        params: skillConfiguration.data,
      },
    };

    const skillConfigWithTimestamps = {
      id: crypto.randomUUID(),
      agent_id: skillConfiguration.agent_id,
      skill_id: skillConfiguration.skill_id,
      name: skillConfiguration.name,
      description: skillConfiguration.description,
      data: versionedData,
      created_at: now,
      updated_at: now,
    };

    const insertedSkillConfiguration = await insertIntoSupabase(
      'skill_configurations',
      skillConfigWithTimestamps,
      z.array(SkillConfiguration),
    );
    return insertedSkillConfiguration[0];
  },

  updateSkillConfiguration: async (
    id: string,
    update: SkillConfigurationUpdateParams,
  ): Promise<SkillConfiguration> => {
    const now = new Date().toISOString();
    let updateWithTimestamp: Record<string, unknown> = {
      ...update,
      updated_at: now,
    };

    // If we're updating the data, we need to handle versioning
    if (update.data) {
      // First, get the current configuration to access existing data
      const existing = await selectFromSupabase(
        'skill_configurations',
        { id: `eq.${id}` },
        z.array(SkillConfiguration),
      );

      if (existing.length === 0) {
        throw new Error(`Skill configuration with id ${id} not found`);
      }

      const currentConfig = existing[0];
      const dataString = JSON.stringify(update.data) + now;
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(dataString),
      );
      const newHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 6);

      // Get the current hash to preserve history
      const currentVersion = currentConfig.data.current;
      const currentHash = currentVersion.hash;

      // Create new versioned data structure
      const newVersionedData = {
        ...currentConfig.data, // Keep all existing versions
        current: {
          hash: newHash,
          created_at: now,
          params: update.data,
        },
      };

      // If the hash is different, store the previous version
      if (newHash !== currentHash) {
        (newVersionedData as Record<string, unknown>)[currentHash] =
          currentVersion;
      }

      updateWithTimestamp = {
        ...updateWithTimestamp,
        data: newVersionedData,
      };
    }

    const updatedSkillConfiguration = await updateInSupabase(
      'skill_configurations',
      id,
      updateWithTimestamp,
      z.array(SkillConfiguration),
    );
    return updatedSkillConfiguration[0];
  },

  deleteSkillConfiguration: async (id: string): Promise<void> => {
    await deleteFromSupabase('skill_configurations', { id: `eq.${id}` });
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
    if (queryParams.is_realtime !== undefined) {
      postgrestParams.is_realtime = `eq.${queryParams.is_realtime}`;
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
    // First, check if this is a realtime dataset
    const datasets = await selectFromSupabase(
      'datasets',
      { id: `eq.${datasetId}` },
      z.array(Dataset),
    );
    const dataset = datasets[0];

    if (dataset?.is_realtime) {
      // For realtime datasets, return the most recent logs with 200 status for this agent
      // If skill_id is provided in queryParams, filter by it too
      const postgrestParams: Record<string, string> = {
        agent_id: `eq.${dataset.agent_id}`,
        status: 'eq.200',
        order: 'start_time.desc',
        limit: (dataset.realtime_size || 10).toString(), // Use realtime_size as limit
      };

      // If skill_id is provided in the query params, filter by it
      if (queryParams.skill_id) {
        postgrestParams.skill_id = `eq.${queryParams.skill_id}`;
      }

      if (
        queryParams.limit &&
        queryParams.limit < (dataset.realtime_size || 10)
      ) {
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
    }

    // For regular datasets, use the bridge table approach
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
    // Check if this is a realtime dataset
    const datasets = await selectFromSupabase(
      'datasets',
      { id: `eq.${datasetId}` },
      z.array(Dataset),
    );
    const dataset = datasets[0];

    if (dataset?.is_realtime) {
      // For realtime datasets, we don't store logs in the bridge table
      // The logs are determined dynamically, so this is a no-op
      console.log(
        `Skipping addLogsToDataset for realtime dataset ${datasetId} - logs are managed dynamically`,
      );
      return;
    }

    // For regular datasets, use the bridge table
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
    // Check if this is a realtime dataset
    const datasets = await selectFromSupabase(
      'datasets',
      { id: `eq.${datasetId}` },
      z.array(Dataset),
    );
    const dataset = datasets[0];

    if (dataset?.is_realtime) {
      // For realtime datasets, we don't store logs in the bridge table
      // The logs are determined dynamically, so this is a no-op
      console.log(
        `Skipping removeLogsFromDataset for realtime dataset ${datasetId} - logs are managed dynamically`,
      );
      return;
    }

    // For regular datasets, use the bridge table
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

  // AI Provider API Keys
  getAIProviderAPIKeys: async (
    queryParams: AIProviderAPIKeyQueryParams,
  ): Promise<AIProviderAPIKey[]> => {
    const postgrestParams: Record<string, string> = {};

    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.ai_provider) {
      postgrestParams.ai_provider = `eq.${queryParams.ai_provider}`;
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

    const encryptedAPIKeys = await selectFromSupabase(
      'ai_provider_api_keys',
      postgrestParams,
      z.array(AIProviderAPIKey),
    );

    // Decrypt the API keys before returning
    return encryptedAPIKeys.map((key) => ({
      ...key,
      api_key: decryptAPIKey(key.api_key),
    }));
  },

  getAIProviderAPIKeyById: async (
    id: string,
  ): Promise<AIProviderAPIKey | null> => {
    const encryptedAPIKeys = await selectFromSupabase(
      'ai_provider_api_keys',
      { id: `eq.${id}` },
      z.array(
        z.object({
          id: z.string(),
          ai_provider: z.string(),
          name: z.string(),
          api_key: z.string(),
          created_at: z.string(),
          updated_at: z.string(),
        }),
      ),
    );

    if (encryptedAPIKeys.length === 0) {
      return null;
    }

    // Decrypt the API key before returning
    const encryptedKey = encryptedAPIKeys[0];
    return {
      ...encryptedKey,
      api_key: decryptAPIKey(encryptedKey.api_key),
    };
  },

  createAIProviderAPIKey: async (
    apiKey: AIProviderAPIKeyCreateParams,
  ): Promise<AIProviderAPIKey> => {
    const encryptedAPIKey = {
      ...apiKey,
      api_key: encryptAPIKey(apiKey.api_key),
    };

    const insertedAPIKey = await insertIntoSupabase(
      'ai_provider_api_keys',
      encryptedAPIKey,
      z.array(AIProviderAPIKey),
    );

    // Decrypt before returning
    return {
      ...insertedAPIKey[0],
      api_key: decryptAPIKey(insertedAPIKey[0].api_key),
    };
  },

  updateAIProviderAPIKey: async (
    id: string,
    update: AIProviderAPIKeyUpdateParams,
  ): Promise<AIProviderAPIKey> => {
    const updateData = { ...update };

    // Encrypt the API key if it's being updated
    if (update.api_key) {
      updateData.api_key = encryptAPIKey(update.api_key);
    }

    const updatedAPIKey = await updateInSupabase(
      'ai_provider_api_keys',
      id,
      updateData,
      z.array(AIProviderAPIKey),
    );

    // Decrypt before returning
    return {
      ...updatedAPIKey[0],
      api_key: decryptAPIKey(updatedAPIKey[0].api_key),
    };
  },

  deleteAIProviderAPIKey: async (id: string): Promise<void> => {
    await deleteFromSupabase('ai_provider_api_keys', { id: `eq.${id}` });
  },

  // Models
  getModels: async (queryParams: ModelQueryParams): Promise<Model[]> => {
    const postgrestParams: Record<string, string> = {};
    if (queryParams.id) {
      postgrestParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.ai_provider_api_key_id) {
      postgrestParams.ai_provider_api_key_id = `eq.${queryParams.ai_provider_api_key_id}`;
    }
    if (queryParams.model_name) {
      postgrestParams.model_name = `eq.${queryParams.model_name}`;
    }
    if (queryParams.limit) {
      postgrestParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgrestParams.offset = queryParams.offset.toString();
    }

    return await selectFromSupabase('models', postgrestParams, z.array(Model));
  },

  getModelById: async (id: string): Promise<Model | null> => {
    const models = await selectFromSupabase(
      'models',
      { id: `eq.${id}` },
      z.array(Model),
    );
    return models.length > 0 ? models[0] : null;
  },

  createModel: async (model: ModelCreateParams): Promise<Model> => {
    const newModels = await insertIntoSupabase(
      'models',
      [model],
      z.array(Model),
    );
    return newModels[0];
  },

  updateModel: async (
    id: string,
    update: ModelUpdateParams,
  ): Promise<Model> => {
    const updatedModels = await updateInSupabase(
      'models',
      `id=eq.${id}`,
      update,
      z.array(Model),
    );
    return updatedModels[0];
  },

  deleteModel: async (id: string): Promise<void> => {
    await deleteFromSupabase('models', { id: `eq.${id}` });
  },

  // Skill-Model Relationships
  getModelsBySkillId: async (skillId: string): Promise<Model[]> => {
    // Join skill_models bridge table with models table
    const models = await selectFromSupabase(
      'skill_models',
      { skill_id: `eq.${skillId}`, select: 'models(*)' },
      z.array(z.object({ models: Model })),
    );
    return models.map((item) => item.models);
  },

  getSkillsByModelId: async (modelId: string): Promise<Skill[]> => {
    // Join skill_models bridge table with skills table
    const skills = await selectFromSupabase(
      'skill_models',
      { model_id: `eq.${modelId}`, select: 'skills(*)' },
      z.array(z.object({ skills: Skill })),
    );
    return skills.map((item) => item.skills);
  },

  addModelsToSkill: async (
    skillId: string,
    modelIds: string[],
  ): Promise<void> => {
    const bridgeEntries = modelIds.map((modelId) => ({
      skill_id: skillId,
      model_id: modelId,
    }));
    await insertIntoSupabase('skill_models', bridgeEntries, z.array(z.any()));
  },

  removeModelsFromSkill: async (
    skillId: string,
    modelIds: string[],
  ): Promise<void> => {
    for (const modelId of modelIds) {
      await deleteFromSupabase('skill_models', {
        skill_id: `eq.${skillId}`,
        model_id: `eq.${modelId}`,
      });
    }
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
