import { getRoleAdherenceMainTemplate } from '@server/connectors/evaluations/role-adherence/templates/main';
import type { RoleAdherenceAverageResult } from '@server/connectors/evaluations/role-adherence/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type {
  LogOutput as EvaluationOutput,
  LogOutputCreateParams as EvaluationOutputCreateParams,
} from '@shared/types/data/log-output';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';
import type { RoleAdherenceEvaluationParameters } from '@shared/types/idkhub/evaluations/role-adherence';
import { v4 as uuidv4 } from 'uuid';

function pickRoleData(
  log: Log,
  params: RoleAdherenceEvaluationParameters,
): {
  role_definition: string;
  assistant_output: string;
  instructions?: string;
} {
  const role_definition =
    params.role_definition || (log.metadata?.role_definition as string) || '';
  const assistant_output =
    params.assistant_output ||
    (log.ai_provider_request_log?.response_body
      ? typeof log.ai_provider_request_log.response_body === 'string'
        ? log.ai_provider_request_log.response_body
        : JSON.stringify(log.ai_provider_request_log.response_body)
      : (log.metadata?.assistant_output as string) || '') ||
    '';
  const instructions =
    params.instructions || (log.metadata?.instructions as string);
  return { role_definition, assistant_output, instructions };
}

async function evaluateSingleLog(
  log: Log,
  params: RoleAdherenceEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput> {
  const start_time = Date.now();
  const _evaluation_output_id = uuidv4();
  try {
    const { role_definition, assistant_output, instructions } = pickRoleData(
      log,
      params,
    );

    const tpl = getRoleAdherenceMainTemplate({
      role_definition,
      assistant_output,
      instructions,
      strict_mode: params.strict_mode || false,
      verbose_mode: params.verbose_mode ?? true,
      include_reason: params.include_reason ?? true,
    });

    const judgeResult = await llm_judge.evaluate({
      text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
    });

    let final_score = judgeResult.score;
    let threshold = params.threshold || 0.5;
    if (params.strict_mode) {
      final_score = final_score === 1.0 ? 1.0 : 0.0;
      threshold = 1.0;
    }

    const passed = final_score >= threshold;
    const execution_time = Date.now() - start_time;

    const evaluationOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
      output: {
        score: final_score,
        passed,
        reasoning: judgeResult.reasoning,
        threshold,
        strict_mode: params.strict_mode,
        evaluated_at: new Date().toISOString(),
        execution_time,
        execution_time_ms: execution_time,
        evaluation_run_id,
      },
      score: final_score,
      metadata: {
        role_definition,
        assistant_output,
        instructions,
        evaluation_run_id,
        ...(judgeResult.metadata
          ? { judge_metadata: judgeResult.metadata }
          : {}),
      },
    };

    const stored = await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );
    return stored;
  } catch (error) {
    const execution_time = Date.now() - start_time;
    const evaluationOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
      output: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
      },
      score: 0,
      metadata: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
      },
    };
    const stored = await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );
    return stored;
  }
}

export async function evaluateRoleAdherenceDataset(
  input: DatasetQueryParams,
  params: RoleAdherenceEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: RoleAdherenceAverageResult;
  evaluationRun: EvaluationRun;
}> {
  if (!userDataStorageConnector)
    throw new Error(
      'User data storage connector is required for dataset evaluation',
    );
  if (!input.id) throw new Error('Dataset ID is required for evaluation');
  const agent_id = params.agent_id;
  if (!agent_id) throw new Error('Agent ID is required for evaluation');

  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: input.id,
    agent_id,
    evaluation_method: EvaluationMethodName.ROLE_ADHERENCE,
    name:
      evalRunOptions?.name ||
      `Role Adherence Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions?.description ||
      `Evaluates assistant role adherence using LLM-as-a-judge for dataset ${input.id}`,
    metadata: {
      parameters: params,
      method_config: {
        method: EvaluationMethodName.ROLE_ADHERENCE,
        name: 'Role Adherence',
        description:
          'Evaluates whether outputs adhere to a specified role and constraints',
      },
      is_custom_evaluation: false,
    },
  };

  const evaluationRun = await userDataStorageConnector.createEvaluationRun(
    evaluationRunCreateParams,
  );
  const evaluation_run_id = evaluationRun.id;
  if (!evaluation_run_id)
    throw new Error('Failed to create evaluation run - no ID returned');

  const llm_judge = createLLMJudge({
    model: params.model || 'gpt-4o',
    temperature: params.temperature || 0.1,
    max_tokens: params.max_tokens || 1000,
  });

  try {
    const logs = await userDataStorageConnector.getDatasetLogs(input.id, {
      limit: input.limit || 10,
      offset: input.offset || 0,
    });

    const results: EvaluationOutput[] = [];
    const batch_size = params.batch_size || 10;
    for (let i = 0; i < logs.length; i += batch_size) {
      const batch = logs.slice(i, i + batch_size);
      if (params.async_mode !== false) {
        const batchResults = await Promise.all(
          batch.map((log) =>
            evaluateSingleLog(
              log,
              params,
              evaluation_run_id,
              llm_judge,
              userDataStorageConnector,
            ),
          ),
        );
        results.push(...batchResults);
      } else {
        for (const log of batch) {
          const r = await evaluateSingleLog(
            log,
            params,
            evaluation_run_id,
            llm_judge,
            userDataStorageConnector,
          );
          results.push(r);
        }
      }
    }

    const scores = results.map((o) => o.score || 0);
    const average_score = scores.length
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;
    const threshold_used = params.strict_mode ? 1.0 : params.threshold || 0.5;
    const passed_count = scores.filter((s) => s >= threshold_used).length;
    const failed_count = scores.length - passed_count;

    await userDataStorageConnector.updateEvaluationRun(evaluation_run_id, {
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_logs: logs.length,
        passed_count,
        failed_count,
        average_score,
        threshold_used,
        evaluation_outputs: results.map((o) => o.id),
      },
      metadata: {
        ...evaluationRun.metadata,
        total_logs: logs.length,
        passed_count,
        failed_count,
        average_score,
        threshold_used,
        evaluation_outputs: results.map((o) => o.id),
      },
      completed_at: new Date().toISOString(),
    });

    const updated =
      (
        await userDataStorageConnector.getEvaluationRuns({
          id: evaluation_run_id,
        })
      )[0] || evaluationRun;

    const averageResult: RoleAdherenceAverageResult = {
      average_score,
      total_logs: logs.length,
      passed_count,
      failed_count,
      threshold_used,
      evaluation_run_id,
    };

    return { averageResult, evaluationRun: updated };
  } catch (error) {
    await userDataStorageConnector.updateEvaluationRun(evaluation_run_id, {
      status: 'failed' as EvaluationRunStatus,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: { ...evaluationRun.metadata, error: true },
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}
