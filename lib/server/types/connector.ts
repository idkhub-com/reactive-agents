import type {
  Agent,
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data/agent';
import type {
  AIProviderAPIKey,
  AIProviderAPIKeyCreateParams,
  AIProviderAPIKeyQueryParams,
  AIProviderAPIKeyUpdateParams,
} from '@shared/types/data/ai-provider-api-key';
import type {
  Dataset,
  DatasetCreateParams,
  DatasetQueryParams,
  DatasetUpdateParams,
} from '@shared/types/data/dataset';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
  EvaluationRunQueryParams,
  EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';
import type {
  Feedback,
  FeedbackCreateParams,
  FeedbackQueryParams,
} from '@shared/types/data/feedback';
import type {
  ImprovedResponse,
  ImprovedResponseQueryParams,
  ImprovedResponseUpdateParams,
} from '@shared/types/data/improved-response';
import type { Log, LogsQueryParams } from '@shared/types/data/log';
import type {
  LogOutput,
  LogOutputCreateParams,
  LogOutputQueryParams,
} from '@shared/types/data/log-output';
import type {
  Model,
  ModelCreateParams,
  ModelQueryParams,
  ModelUpdateParams,
} from '@shared/types/data/model';
import type {
  Skill,
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data/skill';
import type {
  SkillConfiguration,
  SkillConfigurationCreateParams,
  SkillConfigurationQueryParams,
  SkillConfigurationUpdateParams,
} from '@shared/types/data/skill-configuration';
import type {
  SkillConfigurationEmbedding,
  SkillConfigurationEmbeddingQueryParams,
  SkillConfigurationEmbeddingSearchParams,
  SkillConfigurationEmbeddingWithScore,
} from '@shared/types/data/skill-configuration-embedding';
import type {
  Tool,
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import type {
  EvaluationMethodDetails,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import type { Hook, HookResult } from '@shared/types/middleware/hooks';
import type { z } from 'zod';

export interface UserDataStorageConnector {
  // Feedback
  getFeedback(
    queryParams: FeedbackQueryParams,
  ): Promise<Feedback[]> | Feedback[];
  createFeedback(feedback: FeedbackCreateParams): Promise<Feedback> | Feedback;
  deleteFeedback(id: string): Promise<void> | void;

  // Improved Response
  getImprovedResponse(
    params: ImprovedResponseQueryParams,
  ): Promise<ImprovedResponse[]> | ImprovedResponse[];
  createImprovedResponse(
    improvedResponse: ImprovedResponse,
  ): Promise<ImprovedResponse> | ImprovedResponse;
  updateImprovedResponse(
    id: string,
    update: ImprovedResponseUpdateParams,
  ): Promise<ImprovedResponse> | ImprovedResponse;
  deleteImprovedResponse(id: string): Promise<void> | void;

  // Agents
  getAgents(queryParams: AgentQueryParams): Promise<Agent[]> | Agent[];
  createAgent(agent: AgentCreateParams): Promise<Agent> | Agent;
  updateAgent(id: string, update: AgentUpdateParams): Promise<Agent> | Agent;
  deleteAgent(id: string): Promise<void> | void;

  // Skills
  getSkills(queryParams: SkillQueryParams): Promise<Skill[]> | Skill[];
  createSkill(skill: SkillCreateParams): Promise<Skill> | Skill;
  updateSkill(id: string, update: SkillUpdateParams): Promise<Skill> | Skill;
  deleteSkill(id: string): Promise<void> | void;

  // Skill Optimization Lock
  tryAcquireOptimizationLock(
    skillId: string,
    lockTimeoutHours?: number,
  ): Promise<{
    success: boolean;
    message: string;
    current_lock_time: number | null;
  }>;
  releaseOptimizationLock(
    skillId: string,
    updatedMetadata?: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }>;

  // Skill Configurations
  getSkillConfigurations(
    queryParams: SkillConfigurationQueryParams,
  ): Promise<SkillConfiguration[]> | SkillConfiguration[];
  createSkillConfiguration(
    skillConfiguration: SkillConfigurationCreateParams,
  ): Promise<SkillConfiguration> | SkillConfiguration;
  updateSkillConfiguration(
    id: string,
    update: SkillConfigurationUpdateParams,
  ): Promise<SkillConfiguration> | SkillConfiguration;
  deleteSkillConfiguration(id: string): Promise<void> | void;

  // Tools
  getTools(queryParams: ToolQueryParams): Promise<Tool[]> | Tool[];
  createTool(tool: ToolCreateParams): Promise<Tool> | Tool;
  deleteTool(id: string): Promise<void> | void;

  // Datasets
  getDatasets(queryParams: DatasetQueryParams): Promise<Dataset[]> | Dataset[];
  createDataset(dataset: DatasetCreateParams): Promise<Dataset> | Dataset;
  updateDataset(
    id: string,
    update: DatasetUpdateParams,
  ): Promise<Dataset> | Dataset;
  deleteDataset(id: string): Promise<void> | void;

  // Logs
  getLogs(queryParams: LogsQueryParams): Promise<Log[]> | Log[];
  deleteLog(id: string): Promise<void> | void;

  // Dataset-Log Bridge
  getDatasetLogs(
    datasetId: string,
    queryParams: LogsQueryParams,
  ): Promise<Log[]> | Log[];
  addLogsToDataset(datasetId: string, logIds: string[]): Promise<void> | void;
  removeLogsFromDataset(
    datasetId: string,
    logIds: string[],
  ): Promise<void> | void;

  getEvaluationRuns(
    queryParams: EvaluationRunQueryParams,
  ): Promise<EvaluationRun[]> | EvaluationRun[];
  createEvaluationRun(
    evaluationRun: EvaluationRunCreateParams,
  ): Promise<EvaluationRun> | EvaluationRun;
  updateEvaluationRun(
    id: string,
    update: EvaluationRunUpdateParams,
  ): Promise<EvaluationRun> | EvaluationRun;
  deleteEvaluationRun(id: string): Promise<void> | void;

  // Log Outputs
  getLogOutputs(
    evaluationRunId: string,
    queryParams: LogOutputQueryParams,
  ): Promise<LogOutput[]> | LogOutput[];
  createLogOutput(
    evaluationRunId: string,
    logOutput: LogOutputCreateParams,
  ): Promise<LogOutput> | LogOutput;
  deleteLogOutput(evaluationRunId: string, id: string): Promise<void> | void;

  // AI Provider API Keys
  getAIProviderAPIKeys(
    queryParams: AIProviderAPIKeyQueryParams,
  ): Promise<AIProviderAPIKey[]> | AIProviderAPIKey[];
  getAIProviderAPIKeyById(
    id: string,
  ): Promise<AIProviderAPIKey | null> | AIProviderAPIKey | null;
  createAIProviderAPIKey(
    apiKey: AIProviderAPIKeyCreateParams,
  ): Promise<AIProviderAPIKey> | AIProviderAPIKey;
  updateAIProviderAPIKey(
    id: string,
    update: AIProviderAPIKeyUpdateParams,
  ): Promise<AIProviderAPIKey> | AIProviderAPIKey;
  deleteAIProviderAPIKey(id: string): Promise<void> | void;

  // Models
  getModels(queryParams: ModelQueryParams): Promise<Model[]> | Model[];
  getModelById(id: string): Promise<Model | null> | Model | null;
  createModel(model: ModelCreateParams): Promise<Model> | Model;
  updateModel(id: string, update: ModelUpdateParams): Promise<Model> | Model;
  deleteModel(id: string): Promise<void> | void;

  // Skill-Model Relationships
  getModelsBySkillId(skillId: string): Promise<Model[]> | Model[];
  getSkillsByModelId(modelId: string): Promise<Skill[]> | Skill[];
  addModelsToSkill(skillId: string, modelIds: string[]): Promise<void> | void;
  removeModelsFromSkill(
    skillId: string,
    modelIds: string[],
  ): Promise<void> | void;
}

export interface LogsStorageConnector {
  getLogs(
    queryParams: LogsQueryParams,
  ): Promise<IdkRequestLog[]> | IdkRequestLog[];
  createLog(log: IdkRequestLog): Promise<IdkRequestLog> | IdkRequestLog;
  deleteLog(id: string): Promise<void> | void;
}

export interface EmbeddingsStorageConnector {
  getSkillConfigurationEmbeddings(
    queryParams: SkillConfigurationEmbeddingQueryParams,
  ): Promise<SkillConfigurationEmbedding[]> | SkillConfigurationEmbedding[];
  searchSimilarSkillConfigurationEmbeddings(
    searchParams: SkillConfigurationEmbeddingSearchParams,
  ):
    | Promise<SkillConfigurationEmbeddingWithScore[]>
    | SkillConfigurationEmbeddingWithScore[];
  createSkillConfigurationEmbedding(
    embedding: SkillConfigurationEmbedding,
  ): Promise<SkillConfigurationEmbedding> | SkillConfigurationEmbedding;
  deleteEmbedding(id: string): Promise<void> | void;
}

export interface CacheStorageConnector {
  getCache(key: string): Promise<string | null> | string | null;
  setCache(key: string, value: string): Promise<void> | void;
  deleteCache(key: string): Promise<void> | void;
}

export interface HooksConnector {
  name: string;
  executeHook(hook: Hook): Promise<HookResult> | HookResult;
}

export interface EvaluationMethodConnector {
  getDetails: () => EvaluationMethodDetails;
  evaluate: (
    jobDetails: EvaluationRunJobDetails,
    userDataStorageConnector: UserDataStorageConnector,
  ) => Promise<EvaluationRun>;
  evaluateOneLog: (
    evaluationRunId: string,
    log: IdkRequestLog,
    userDataStorageConnector: UserDataStorageConnector,
  ) => Promise<void>;
  getParameterSchema: z.ZodType;
}
