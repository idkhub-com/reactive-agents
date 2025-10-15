import crypto from 'node:crypto';
import { AI_PROVIDER_API_KEY_ENCRYPTION_KEY } from '@server/constants';
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
  Feedback,
  type FeedbackQueryParams,
} from '@shared/types/data/feedback';
import {
  ImprovedResponse,
  type ImprovedResponseQueryParams,
  type ImprovedResponseUpdateParams,
} from '@shared/types/data/improved-response';
import {
  Log,
  type LogCreateParams,
  type LogsQueryParams,
} from '@shared/types/data/log';
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
  SkillOptimizationArm,
  type SkillOptimizationArmCreateParams,
  type SkillOptimizationArmQueryParams,
  type SkillOptimizationArmUpdateParams,
} from '@shared/types/data/skill-optimization-arm';
import {
  SkillOptimizationCluster,
  type SkillOptimizationClusterCreateParams,
  type SkillOptimizationClusterQueryParams,
  type SkillOptimizationClusterUpdateParams,
} from '@shared/types/data/skill-optimization-cluster';
import {
  SkillOptimizationEvaluation,
  type SkillOptimizationEvaluationQueryParams,
} from '@shared/types/data/skill-optimization-evaluation';
import {
  SkillOptimizationEvaluationRun,
  type SkillOptimizationEvaluationRunQueryParams,
} from '@shared/types/data/skill-optimization-evaluation-run';
import {
  Tool,
  type ToolCreateParams,
  type ToolQueryParams,
} from '@shared/types/data/tool';
import { CachedValue } from '@shared/types/middleware/cache';
import { z } from 'zod';
import {
  deleteFromSupabase,
  insertIntoSupabase,
  selectFromSupabase,
  updateInSupabase,
} from './base';

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
      id,
      update,
      z.array(Model),
    );
    return updatedModels[0];
  },

  deleteModel: async (id: string): Promise<void> => {
    await deleteFromSupabase('models', { id: `eq.${id}` });
  },

  // Skill-Model Relationships
  getSkillModels: async (skillId: string): Promise<Model[]> => {
    // Join skill_models bridge table with models table
    const models = await selectFromSupabase(
      'skill_models',
      { skill_id: `eq.${skillId}`, select: 'models(*)' },
      z.array(z.object({ models: Model })),
    );
    return models.map((item) => item.models);
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

  // SkillOptimizationCluster
  getSkillOptimizationClusters: async (
    queryParams: SkillOptimizationClusterQueryParams,
  ): Promise<SkillOptimizationCluster[]> => {
    const postgRESTParams: Record<string, string> = {
      order: 'created_at.desc',
    };

    if (queryParams.id) {
      postgRESTParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgRESTParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgRESTParams.skill_id = `eq.${queryParams.skill_id}`;
    }
    if (queryParams.limit) {
      postgRESTParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTParams.offset = queryParams.offset.toString();
    }

    const skillConfigurations = await selectFromSupabase(
      'skill_optimization_clusters',
      postgRESTParams,
      z.array(SkillOptimizationCluster),
    );

    return skillConfigurations;
  },

  createSkillOptimizationClusters: async (
    params_list: SkillOptimizationClusterCreateParams[],
  ): Promise<SkillOptimizationCluster[]> => {
    const insertedSkillConfigurations = await insertIntoSupabase(
      'skill_optimization_clusters',
      params_list,
      z.array(SkillOptimizationCluster),
    );
    return insertedSkillConfigurations;
  },

  updateSkillOptimizationCluster: async (
    id: string,
    params: SkillOptimizationClusterUpdateParams,
  ): Promise<SkillOptimizationCluster> => {
    const updatedSkillOptimizationClusterStates = await updateInSupabase(
      'skill_optimization_clusters',
      id,
      params,
      z.array(SkillOptimizationCluster),
    );
    return updatedSkillOptimizationClusterStates[0];
  },

  deleteSkillOptimizationCluster: async (id: string): Promise<void> => {
    await deleteFromSupabase('skill_optimization_clusters', {
      id: `eq.${id}`,
    });
  },

  //SkillOptimizationArm
  getSkillOptimizationArms: async (
    queryParams: SkillOptimizationArmQueryParams,
  ): Promise<SkillOptimizationArm[]> => {
    const postgRESTParams: Record<string, string> = {
      order: 'created_at.desc',
    };

    if (queryParams.id) {
      postgRESTParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgRESTParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgRESTParams.skill_id = `eq.${queryParams.skill_id}`;
    }
    if (queryParams.limit) {
      postgRESTParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTParams.offset = queryParams.offset.toString();
    }

    const skillConfigurations = await selectFromSupabase(
      'skill_optimization_arms',
      postgRESTParams,
      z.array(SkillOptimizationArm),
    );

    return skillConfigurations;
  },

  createSkillOptimizationArms: async (
    params_list: SkillOptimizationArmCreateParams[],
  ): Promise<SkillOptimizationArm[]> => {
    const createdSkillOptimizationArms = await insertIntoSupabase(
      'skill_optimization_arms',
      params_list,
      z.array(SkillOptimizationArm),
    );

    return createdSkillOptimizationArms;
  },

  updateSkillOptimizationArm: async (
    id: string,
    params: SkillOptimizationArmUpdateParams,
  ): Promise<SkillOptimizationArm> => {
    const updatedSkillOptimizationArms = await updateInSupabase(
      'skill_optimization_arms',
      id,
      params,
      z.array(SkillOptimizationArm),
    );

    return updatedSkillOptimizationArms[0];
  },

  deleteSkillOptimizationArm: async (id: string): Promise<void> => {
    await deleteFromSupabase('skill_optimization_arms', { id: `eq.${id}` });
  },

  deleteSkillOptimizationArmsForSkill: async (
    skillId: string,
  ): Promise<void> => {
    await deleteFromSupabase('skill_optimization_arms', {
      skill_id: `eq.${skillId}`,
    });
  },

  deleteSkillOptimizationArmsForCluster: async (
    clusterId: string,
  ): Promise<void> => {
    await deleteFromSupabase('skill_optimization_arms', {
      cluster_id: `eq.${clusterId}`,
    });
  },

  // SkillOptimizationEvaluation
  getSkillOptimizationEvaluations: async (
    queryParams: SkillOptimizationEvaluationQueryParams,
  ): Promise<SkillOptimizationEvaluation[]> => {
    const postgRESTParams: Record<string, string> = {
      order: 'created_at.desc',
    };

    if (queryParams.id) {
      postgRESTParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgRESTParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgRESTParams.skill_id = `eq.${queryParams.skill_id}`;
    }
    if (queryParams.evaluation_method) {
      postgRESTParams.evaluation_method = `eq.${queryParams.evaluation_method}`;
    }
    if (queryParams.limit) {
      postgRESTParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTParams.offset = queryParams.offset.toString();
    }

    const evaluations = await selectFromSupabase(
      'skill_optimization_evaluations',
      postgRESTParams,
      z.array(SkillOptimizationEvaluation),
    );

    return evaluations;
  },

  async createSkillOptimizationEvaluations(
    params: SkillOptimizationEvaluation[],
  ): Promise<SkillOptimizationEvaluation[]> {
    const createdEvaluations = await insertIntoSupabase(
      'skill_optimization_evaluations',
      params,
      z.array(SkillOptimizationEvaluation),
    );

    return createdEvaluations;
  },

  async deleteSkillOptimizationEvaluation(id: string): Promise<void> {
    await deleteFromSupabase('skill_optimization_evaluations', {
      id: `eq.${id}`,
    });
  },

  async deleteSkillOptimizationEvaluationsForSkill(
    skillId: string,
  ): Promise<void> {
    await deleteFromSupabase('skill_optimization_evaluations', {
      skill_id: `eq.${skillId}`,
    });
  },

  // SkillOptimizationEvaluationRun
  getSkillOptimizationEvaluationRuns: async (
    queryParams: SkillOptimizationEvaluationRunQueryParams,
  ): Promise<SkillOptimizationEvaluationRun[]> => {
    const postgRESTParams: Record<string, string> = {
      order: 'created_at.desc',
    };

    if (queryParams.id) {
      postgRESTParams.id = `eq.${queryParams.id}`;
    }
    if (queryParams.agent_id) {
      postgRESTParams.agent_id = `eq.${queryParams.agent_id}`;
    }
    if (queryParams.skill_id) {
      postgRESTParams.skill_id = `eq.${queryParams.skill_id}`;
    }
    if (queryParams.limit) {
      postgRESTParams.limit = queryParams.limit.toString();
    }
    if (queryParams.offset) {
      postgRESTParams.offset = queryParams.offset.toString();
    }

    const evaluationRuns = await selectFromSupabase(
      'skill_optimization_evaluation_runs',
      postgRESTParams,
      z.array(SkillOptimizationEvaluationRun),
    );

    return evaluationRuns;
  },

  async createSkillOptimizationEvaluationRun(
    params: SkillOptimizationEvaluationRun,
  ): Promise<SkillOptimizationEvaluationRun> {
    const createdEvaluationRuns = await insertIntoSupabase(
      'skill_optimization_evaluation_runs',
      params,
      z.array(SkillOptimizationEvaluationRun),
    );

    return createdEvaluationRuns[0];
  },

  async deleteSkillOptimizationEvaluationRun(id: string): Promise<void> {
    await deleteFromSupabase('skill_optimization_evaluation_runs', {
      id: `eq.${id}`,
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
  getLogs: async (queryParams: LogsQueryParams): Promise<Log[]> => {
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

    if (queryParams.embedding_not_null) {
      postgRESTQuery.embedding = 'not.is.null';
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

    const logs = await selectFromSupabase('logs', postgRESTQuery, z.array(Log));

    return logs;
  },

  createLog: async (createParams: LogCreateParams): Promise<Log> => {
    const insertedLog = await insertIntoSupabase(
      'logs',
      createParams,
      z.array(Log),
    );
    return insertedLog[0];
  },

  deleteLog: async (id: string) => {
    await deleteFromSupabase('logs', { id: `eq.${id}` });
  },
};
