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
  /** Atomic operation: increment skill total_requests by 1 */
  incrementSkillTotalRequests(skillId: string): Promise<Skill> | Skill;
  /**
   * Atomic operation: try to acquire reclustering lock for a skill
   * Only updates last_clustering_at if it's older than lockThresholdMs
   * Returns the updated skill if lock was acquired, null if lock was already held
   */
  tryAcquireReclusteringLock(
    skillId: string,
    lockThresholdMs: number,
  ): Promise<Skill | null> | Skill | null;

  // Tools
  getTools(queryParams: ToolQueryParams): Promise<Tool[]> | Tool[];
  createTool(tool: ToolCreateParams): Promise<Tool> | Tool;
  deleteTool(id: string): Promise<void> | void;

  // AI Provider API Keys
  getAIProviderAPIKeys(
    queryParams: AIProviderConfigQueryParams,
  ): Promise<AIProviderConfig[]> | AIProviderConfig[];
  getAIProviderAPIKeyById(
    id: string,
  ): Promise<AIProviderConfig | null> | AIProviderConfig | null;
  createAIProvider(
    apiKey: AIProviderConfigCreateParams,
  ): Promise<AIProviderConfig> | AIProviderConfig;
  updateAIProvider(
    id: string,
    update: AIProviderConfigUpdateParams,
  ): Promise<AIProviderConfig> | AIProviderConfig;
  deleteAIProvider(id: string): Promise<void> | void;

  // Models
  getModels(queryParams: ModelQueryParams): Promise<Model[]> | Model[];
  createModel(model: ModelCreateParams): Promise<Model> | Model;
  updateModel(id: string, update: ModelUpdateParams): Promise<Model> | Model;
  deleteModel(id: string): Promise<void> | void;

  // Skill-Model Relationships
  getSkillModels(skillId: string): Promise<Model[]> | Model[];
  getSkillsByModelId(modelId: string): Promise<Skill[]> | Skill[];
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
  /** Atomic operation: increment both total_steps and observability_total_requests by 1 */
  incrementClusterCounters(
    clusterId: string,
  ): Promise<SkillOptimizationCluster> | SkillOptimizationCluster;

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
  /** Atomic operation: update arm stats for multiple evaluations and increment cluster/skill counters in a single transaction */
  updateArmAndIncrementCounters(
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
  deleteSkillOptimizationArm(id: string): Promise<void> | void;
  deleteSkillOptimizationArmsForSkill(skillId: string): Promise<void> | void;
  deleteSkillOptimizationArmsForCluster(
    clusterId: string,
  ): Promise<void> | void;

  // Skill Optimization Arm Stats
  getSkillOptimizationArmStats(
    queryParams: import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStatQueryParams,
  ):
    | Promise<
        import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStat[]
      >
    | import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStat[];
  deleteSkillOptimizationArmStats(
    queryParams: import('@shared/types/data/skill-optimization-arm-stats').SkillOptimizationArmStatQueryParams,
  ): Promise<void> | void;

  // Skill Optimization Evaluations
  getSkillOptimizationEvaluations(
    queryParams: SkillOptimizationEvaluationQueryParams,
  ): Promise<SkillOptimizationEvaluation[]> | SkillOptimizationEvaluation[];
  createSkillOptimizationEvaluations(
    params_list: SkillOptimizationEvaluationCreateParams[],
  ): Promise<SkillOptimizationEvaluation[]> | SkillOptimizationEvaluation[];
  updateSkillOptimizationEvaluation(
    id: string,
    update: import('@shared/types/data').SkillOptimizationEvaluationUpdateParams,
  ): Promise<SkillOptimizationEvaluation> | SkillOptimizationEvaluation;
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
  getEvaluationScoresByTimeBucket(
    params: import('@shared/types/data/evaluation-runs-with-scores').EvaluationScoresByTimeBucketParams,
  ):
    | Promise<
        import('@shared/types/data/evaluation-runs-with-scores').EvaluationScoresByTimeBucketResult[]
      >
    | import('@shared/types/data/evaluation-runs-with-scores').EvaluationScoresByTimeBucketResult[];

  // Skill Events
  getSkillEvents(
    queryParams: SkillEventQueryParams,
  ): Promise<SkillEvent[]> | SkillEvent[];
  createSkillEvent(
    params: SkillEventCreateParams,
  ): Promise<SkillEvent> | SkillEvent;
}

export interface LogsStorageConnector {
  getLogs(queryParams: LogsQueryParams): Promise<Log[]> | Log[];
  createLog(createParams: LogCreateParams): Promise<Log> | Log;
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
  getAIParameterSchema?: z.ZodType; // Optional - not all evaluations need AI for parameter generation
}
