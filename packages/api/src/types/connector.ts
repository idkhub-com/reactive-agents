import type { AppContext } from '@api/types/hono';
import type {
  Agent,
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data/agent';
import type {
  AIProviderConfig,
  AIProviderConfigCreateParams,
  AIProviderConfigQueryParams,
  AIProviderConfigUpdateParams,
} from '@shared/types/data/ai-provider';
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
import type {
  Log,
  LogCreateParams,
  LogsQueryParams,
} from '@shared/types/data/log';
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
  SkillEvent,
  SkillEventCreateParams,
  SkillEventQueryParams,
} from '@shared/types/data/skill-event';
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
  SystemSettings,
  SystemSettingsUpdateParams,
} from '@shared/types/data/system-settings';
import type {
  Tool,
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import type { EvaluationMethodDetails } from '@shared/types/evaluations';
import type { Hook, HookResult } from '@shared/types/middleware/hooks';
import type { z } from 'zod';

export interface UserDataStorageConnector {
  // Feedback
  getFeedback(
    c: AppContext,
    queryParams: FeedbackQueryParams,
  ): Promise<Feedback[]> | Feedback[];
  createFeedback(
    c: AppContext,
    feedback: FeedbackCreateParams,
  ): Promise<Feedback> | Feedback;
  deleteFeedback(c: AppContext, id: string): Promise<void> | void;

  // Improved Response
  getImprovedResponse(
    c: AppContext,
    params: ImprovedResponseQueryParams,
  ): Promise<ImprovedResponse[]> | ImprovedResponse[];
  createImprovedResponse(
    c: AppContext,
    improvedResponse: ImprovedResponse,
  ): Promise<ImprovedResponse> | ImprovedResponse;
  updateImprovedResponse(
    c: AppContext,
    id: string,
    update: ImprovedResponseUpdateParams,
  ): Promise<ImprovedResponse> | ImprovedResponse;
  deleteImprovedResponse(c: AppContext, id: string): Promise<void> | void;

  // Agents
  getAgents(
    c: AppContext,
    queryParams: AgentQueryParams,
  ): Promise<Agent[]> | Agent[];
  createAgent(c: AppContext, agent: AgentCreateParams): Promise<Agent> | Agent;
  updateAgent(
    c: AppContext,
    id: string,
    update: AgentUpdateParams,
  ): Promise<Agent> | Agent;
  deleteAgent(c: AppContext, id: string): Promise<void> | void;

  // Skills
  getSkills(
    c: AppContext,
    queryParams: SkillQueryParams,
  ): Promise<Skill[]> | Skill[];
  createSkill(c: AppContext, skill: SkillCreateParams): Promise<Skill> | Skill;
  updateSkill(
    c: AppContext,
    id: string,
    update: SkillUpdateParams,
  ): Promise<Skill> | Skill;
  deleteSkill(c: AppContext, id: string): Promise<void> | void;
  /** Atomic operation: increment skill total_requests by 1 */
  incrementSkillTotalRequests(
    c: AppContext,
    skillId: string,
  ): Promise<Skill> | Skill;
  /**
   * Atomic operation: try to acquire reclustering lock for a skill
   * Only updates last_clustering_at if it's older than lockThresholdMs
   * Returns the updated skill if lock was acquired, null if lock was already held
   */
  tryAcquireReclusteringLock(
    c: AppContext,
    skillId: string,
    lockThresholdMs: number,
  ): Promise<Skill | null> | Skill | null;

  // Tools
  getTools(
    c: AppContext,
    queryParams: ToolQueryParams,
  ): Promise<Tool[]> | Tool[];
  createTool(c: AppContext, tool: ToolCreateParams): Promise<Tool> | Tool;
  deleteTool(c: AppContext, id: string): Promise<void> | void;

  // AI Provider API Keys
  getAIProviderAPIKeys(
    c: AppContext,
    queryParams: AIProviderConfigQueryParams,
  ): Promise<AIProviderConfig[]> | AIProviderConfig[];
  getAIProviderAPIKeyById(
    c: AppContext,
    id: string,
  ): Promise<AIProviderConfig | null> | AIProviderConfig | null;
  createAIProvider(
    c: AppContext,
    apiKey: AIProviderConfigCreateParams,
  ): Promise<AIProviderConfig> | AIProviderConfig;
  updateAIProvider(
    c: AppContext,
    id: string,
    update: AIProviderConfigUpdateParams,
  ): Promise<AIProviderConfig> | AIProviderConfig;
  deleteAIProvider(c: AppContext, id: string): Promise<void> | void;

  // Models
  getModels(
    c: AppContext,
    queryParams: ModelQueryParams,
  ): Promise<Model[]> | Model[];
  createModel(c: AppContext, model: ModelCreateParams): Promise<Model> | Model;
  updateModel(
    c: AppContext,
    id: string,
    update: ModelUpdateParams,
  ): Promise<Model> | Model;
  deleteModel(c: AppContext, id: string): Promise<void> | void;

  // Skill-Model Relationships
  getSkillModels(c: AppContext, skillId: string): Promise<Model[]> | Model[];
  getSkillsByModelId(
    c: AppContext,
    modelId: string,
  ): Promise<Skill[]> | Skill[];
  addModelsToSkill(
    c: AppContext,
    skillId: string,
    modelIds: string[],
  ): Promise<void> | void;
  removeModelsFromSkill(
    c: AppContext,
    skillId: string,
    modelIds: string[],
  ): Promise<void> | void;

  // Skill Optimization Cluster
  getSkillOptimizationClusters(
    c: AppContext,
    queryParams: SkillOptimizationClusterQueryParams,
  ): Promise<SkillOptimizationCluster[]> | SkillOptimizationCluster[];
  createSkillOptimizationClusters(
    c: AppContext,
    params_list: SkillOptimizationClusterCreateParams[],
  ): Promise<SkillOptimizationCluster[]> | SkillOptimizationCluster[];
  updateSkillOptimizationCluster(
    c: AppContext,
    id: string,
    update: SkillOptimizationClusterUpdateParams,
  ): Promise<SkillOptimizationCluster> | SkillOptimizationCluster;
  deleteSkillOptimizationCluster(
    c: AppContext,
    id: string,
  ): Promise<void> | void;
  /** Atomic operation: increment both total_steps and observability_total_requests by 1 */
  incrementClusterCounters(
    c: AppContext,
    clusterId: string,
  ): Promise<SkillOptimizationCluster> | SkillOptimizationCluster;

  // Skill Optimization Arms
  getSkillOptimizationArms(
    c: AppContext,
    queryParams: SkillOptimizationArmQueryParams,
  ): Promise<SkillOptimizationArm[]> | SkillOptimizationArm[];
  createSkillOptimizationArms(
    c: AppContext,
    params_list: SkillOptimizationArmCreateParams[],
  ): Promise<SkillOptimizationArm[]> | SkillOptimizationArm[];
  updateSkillOptimizationArm(
    c: AppContext,
    id: string,
    update: SkillOptimizationArmUpdateParams,
  ): Promise<SkillOptimizationArm> | SkillOptimizationArm;
  /** Atomic operation: update arm stats for multiple evaluations and increment cluster/skill counters in a single transaction */
  updateArmAndIncrementCounters(
    c: AppContext,
    armId: string,
    evaluationResults: Array<{ evaluation_id: string; score: number }>,
  ):
    | Promise<{
        arm: SkillOptimizationArm;
        cluster: SkillOptimizationCluster;
        skill: Skill;
      }>
    | {
        arm: SkillOptimizationArm;
        cluster: SkillOptimizationCluster;
        skill: Skill;
      };
  deleteSkillOptimizationArm(c: AppContext, id: string): Promise<void> | void;
  deleteSkillOptimizationArmsForSkill(
    c: AppContext,
    skillId: string,
  ): Promise<void> | void;
  deleteSkillOptimizationArmsForCluster(
    c: AppContext,
    clusterId: string,
  ): Promise<void> | void;

  // Skill Optimization Arm Stats
  getSkillOptimizationArmStats(
    c: AppContext,
    queryParams: import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStatQueryParams,
  ):
    | Promise<
        import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStat[]
      >
    | import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStat[];
  deleteSkillOptimizationArmStats(
    c: AppContext,
    queryParams: import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStatQueryParams,
  ): Promise<void> | void;

  // Skill Optimization Evaluations
  getSkillOptimizationEvaluations(
    c: AppContext,
    queryParams: SkillOptimizationEvaluationQueryParams,
  ): Promise<SkillOptimizationEvaluation[]> | SkillOptimizationEvaluation[];
  createSkillOptimizationEvaluations(
    c: AppContext,
    params_list: SkillOptimizationEvaluationCreateParams[],
  ): Promise<SkillOptimizationEvaluation[]> | SkillOptimizationEvaluation[];
  updateSkillOptimizationEvaluation(
    c: AppContext,
    id: string,
    update: import('@shared/types/data').SkillOptimizationEvaluationUpdateParams,
  ): Promise<SkillOptimizationEvaluation> | SkillOptimizationEvaluation;
  deleteSkillOptimizationEvaluation(
    c: AppContext,
    id: string,
  ): Promise<void> | void;
  deleteSkillOptimizationEvaluationsForSkill(
    c: AppContext,
    skillId: string,
  ): Promise<void> | void;

  // Skill Optimization Evaluation Run
  getSkillOptimizationEvaluationRuns(
    c: AppContext,
    queryParams: SkillOptimizationEvaluationRunQueryParams,
  ):
    | Promise<SkillOptimizationEvaluationRun[]>
    | SkillOptimizationEvaluationRun[];
  createSkillOptimizationEvaluationRun(
    c: AppContext,
    params: SkillOptimizationEvaluationRunCreateParams,
  ): Promise<SkillOptimizationEvaluationRun> | SkillOptimizationEvaluationRun;
  deleteSkillOptimizationEvaluationRun(
    c: AppContext,
    id: string,
  ): Promise<void> | void;
  getEvaluationScoresByTimeBucket(
    c: AppContext,
    params: import('@shared/types/data/evaluation-runs-with-scores').EvaluationScoresByTimeBucketParams,
  ):
    | Promise<
        import('@shared/types/data/evaluation-runs-with-scores').EvaluationScoresByTimeBucketResult[]
      >
    | import('@shared/types/data/evaluation-runs-with-scores').EvaluationScoresByTimeBucketResult[];

  // Skill Events
  getSkillEvents(
    c: AppContext,
    queryParams: SkillEventQueryParams,
  ): Promise<SkillEvent[]> | SkillEvent[];
  createSkillEvent(
    c: AppContext,
    params: SkillEventCreateParams,
  ): Promise<SkillEvent> | SkillEvent;

  // System Settings
  getSystemSettings(c: AppContext): Promise<SystemSettings> | SystemSettings;
  updateSystemSettings(
    c: AppContext,
    update: SystemSettingsUpdateParams,
  ): Promise<SystemSettings> | SystemSettings;
}

export interface LogsStorageConnector {
  getLogs(c: AppContext, queryParams: LogsQueryParams): Promise<Log[]> | Log[];
  createLog(c: AppContext, createParams: LogCreateParams): Promise<Log> | Log;
  deleteLog(c: AppContext, id: string): Promise<void> | void;
}

export interface CacheStorageConnector {
  getCache(c: AppContext, key: string): Promise<string | null> | string | null;
  setCache(c: AppContext, key: string, value: string): Promise<void> | void;
  deleteCache(c: AppContext, key: string): Promise<void> | void;
}

export interface HooksConnector {
  name: string;
  executeHook(hook: Hook): Promise<HookResult> | HookResult;
}

export interface EvaluationMethodConnector {
  getDetails: () => EvaluationMethodDetails;
  evaluateLog: (
    c: AppContext,
    evaluation: SkillOptimizationEvaluation,
    log: Log,
    storageConnector: UserDataStorageConnector,
  ) => Promise<SkillOptimizationEvaluationResult>;
  getParameterSchema: z.ZodType;
  getAIParameterSchema?: z.ZodType; // Optional - not all evaluations need AI for parameter generation
}
