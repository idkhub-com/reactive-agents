import type {
  Agent,
  AgentCreateParams,
  AgentQueryParams,
  AgentUpdateParams,
} from '@shared/types/data/agent';
import type {
  DataPoint,
  DataPointCreateParams,
  DataPointQueryParams,
  DataPointUpdateParams,
} from '@shared/types/data/data-point';
import type {
  DataPointOutput,
  DataPointOutputCreateParams,
  DataPointOutputQueryParams,
} from '@shared/types/data/data-point-output';
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
import type { LogsQueryParams } from '@shared/types/data/log';
import type {
  Skill,
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data/skill';
import type {
  Tool,
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import type {
  EvaluationMethodDetails,
  EvaluationMethodRequest,
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

  // Data Points
  getDataPoints(
    datasetId: string,
    queryParams: DataPointQueryParams,
  ): Promise<DataPoint[]> | DataPoint[];
  createDataPoints(
    datasetId: string,
    dataPoints: DataPointCreateParams[],
  ): Promise<DataPoint[]> | DataPoint[];
  updateDataPoint(
    id: string,
    update: DataPointUpdateParams,
  ): Promise<DataPoint> | DataPoint;
  deleteDataPoints(datasetId: string, ids: string[]): Promise<void> | void;

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

  getDataPointOutputs(
    evaluationRunId: string,
    queryParams: DataPointOutputQueryParams,
  ): Promise<DataPointOutput[]> | DataPointOutput[];
  createDataPointOutput(
    evaluationRunId: string,
    dataPointOutput: DataPointOutputCreateParams,
  ): Promise<DataPointOutput> | DataPointOutput;
  deleteDataPointOutput(
    evaluationRunId: string,
    id: string,
  ): Promise<void> | void;
}

export interface LogsStorageConnector {
  getLogs(
    queryParams: LogsQueryParams,
  ): Promise<IdkRequestLog[]> | IdkRequestLog[];
  createLog(log: IdkRequestLog): Promise<IdkRequestLog> | IdkRequestLog;
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
  evaluate: (
    request: EvaluationMethodRequest,
    userDataStorageConnector: UserDataStorageConnector,
  ) => Promise<EvaluationRun>;
  getParameterSchema: z.ZodSchema;
}
