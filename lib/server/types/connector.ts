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
  SkillOptimizationArm,
  SkillOptimizationArmCreateParams,
  SkillOptimizationArmQueryParams,
  SkillOptimizationArmUpdateParams,
} from '@shared/types/data/skill-optimization-arm';
import type {
  SkillOptimizationCluster,
  SkillOptimizationClusterCreateParams,
  SkillOptimizationClusterQueryParams,
  SkillOptimizationClusterUpdateParams,
} from '@shared/types/data/skill-optimization-cluster';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationCreateParams,
  SkillOptimizationEvaluationQueryParams,
} from '@shared/types/data/skill-optimization-evaluation';
import type {
  SkillOptimizationEvaluationResult,
  SkillOptimizationEvaluationRun,
  SkillOptimizationEvaluationRunCreateParams,
  SkillOptimizationEvaluationRunQueryParams,
} from '@shared/types/data/skill-optimization-evaluation-run';
import type {
  Tool,
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import type { EvaluationMethodDetails } from '@shared/types/idkhub/evaluations/evaluations';
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

  // Tools
  getTools(queryParams: ToolQueryParams): Promise<Tool[]> | Tool[];
  createTool(tool: ToolCreateParams): Promise<Tool> | Tool;
  deleteTool(id: string): Promise<void> | void;

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
  createModel(model: ModelCreateParams): Promise<Model> | Model;
  updateModel(id: string, update: ModelUpdateParams): Promise<Model> | Model;
  deleteModel(id: string): Promise<void> | void;

  // Skill-Model Relationships
  getSkillModels(skillId: string): Promise<Model[]> | Model[];
  addModelsToSkill(skillId: string, modelIds: string[]): Promise<void> | void;
  removeModelsFromSkill(
    skillId: string,
    modelIds: string[],
  ): Promise<void> | void;

  // Skill Optimization Cluster
  getSkillOptimizationClusters(
    queryParams: SkillOptimizationClusterQueryParams,
  ): Promise<SkillOptimizationCluster[]> | SkillOptimizationCluster[];
  createSkillOptimizationClusters(
    params_list: SkillOptimizationClusterCreateParams[],
  ): Promise<SkillOptimizationCluster[]> | SkillOptimizationCluster[];
  updateSkillOptimizationCluster(
    id: string,
    update: SkillOptimizationClusterUpdateParams,
  ): Promise<SkillOptimizationCluster> | SkillOptimizationCluster;
  deleteSkillOptimizationCluster(id: string): Promise<void> | void;

  // Skill Optimization Arms
  getSkillOptimizationArms(
    queryParams: SkillOptimizationArmQueryParams,
  ): Promise<SkillOptimizationArm[]> | SkillOptimizationArm[];
  createSkillOptimizationArms(
    params_list: SkillOptimizationArmCreateParams[],
  ): Promise<SkillOptimizationArm[]> | SkillOptimizationArm[];
  updateSkillOptimizationArm(
    id: string,
    update: SkillOptimizationArmUpdateParams,
  ): Promise<SkillOptimizationArm> | SkillOptimizationArm;
  deleteSkillOptimizationArm(id: string): Promise<void> | void;
  deleteSkillOptimizationArmsForSkill(skillId: string): Promise<void> | void;

  // Skill Optimization Evaluations
  getSkillOptimizationEvaluations(
    queryParams: SkillOptimizationEvaluationQueryParams,
  ): Promise<SkillOptimizationEvaluation[]> | SkillOptimizationEvaluation[];
  createSkillOptimizationEvaluations(
    params_list: SkillOptimizationEvaluationCreateParams[],
  ): Promise<SkillOptimizationEvaluation[]> | SkillOptimizationEvaluation[];
  deleteSkillOptimizationEvaluation(id: string): Promise<void> | void;
  deleteSkillOptimizationEvaluationsForSkill(
    skillId: string,
  ): Promise<void> | void;

  // Skill Optimization Evaluation Run
  getSkillOptimizationEvaluationRuns(
    queryParams: SkillOptimizationEvaluationRunQueryParams,
  ):
    | Promise<SkillOptimizationEvaluationRun[]>
    | SkillOptimizationEvaluationRun[];
  createSkillOptimizationEvaluationRun(
    params: SkillOptimizationEvaluationRunCreateParams,
  ): Promise<SkillOptimizationEvaluationRun> | SkillOptimizationEvaluationRun;
  deleteSkillOptimizationEvaluationRun(id: string): Promise<void> | void;
}

export interface LogsStorageConnector {
  getLogs(queryParams: LogsQueryParams): Promise<Log[]> | Log[];
  createLog(log: Log): Promise<Log> | Log;
  deleteLog(id: string): Promise<void> | void;
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
  evaluateLog: (
    evaluation: SkillOptimizationEvaluation,
    log: Log,
  ) => Promise<SkillOptimizationEvaluationResult>;
  getParameterSchema: z.ZodType;
}
