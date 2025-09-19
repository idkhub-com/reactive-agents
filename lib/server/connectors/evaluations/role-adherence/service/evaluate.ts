import { getRoleAdherenceMainTemplate } from '@server/connectors/evaluations/role-adherence/templates/main';
import type { RoleAdherenceAverageResult } from '@server/connectors/evaluations/role-adherence/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
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
import { RoleAdherenceEvaluationParameters } from '@shared/types/idkhub/evaluations/role-adherence';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
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

export async function evaluateOneLogForRoleAdherence(
  evaluationRunId: string,
  log: IdkRequestLog,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  // Get the evaluation run to access parameters
  const evaluationRuns = await userDataStorageConnector.getEvaluationRuns({
    id: evaluationRunId,
  });
  const evaluationRun = evaluationRuns[0];
  if (!evaluationRun) {
    throw new Error(`Evaluation run ${evaluationRunId} not found`);
  }

  const params = RoleAdherenceEvaluationParameters.parse(
    evaluationRun.metadata?.parameters || {},
  );

  // Convert IdkRequestLog to Log format for compatibility
  const logForEvaluation: Log = log as Log;

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  // Evaluate the single log
  await evaluateSingleLog(
    logForEvaluation,
    params,
    evaluationRunId,
    llmJudge,
    userDataStorageConnector,
  );

  // Get all log outputs for this evaluation run to calculate new average
  const allLogOutputs = await userDataStorageConnector.getLogOutputs(
    evaluationRunId,
    {},
  );

  // Recalculate the evaluation run statistics
  const scores = allLogOutputs.map((output) => output.score || 0);
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  const thresholdUsed = params.strict_mode ? 1.0 : params.threshold || 0.5;
  const passedCount = scores.filter((score) => score >= thresholdUsed).length;
  const failedCount = scores.length - passedCount;

  // Update the evaluation run with new statistics
  await userDataStorageConnector.updateEvaluationRun(evaluationRunId, {
    results: {
      ...(evaluationRun.results || {}),
      total_logs: allLogOutputs.length,
      passed_count: passedCount,
      failed_count: failedCount,
      average_score: averageScore,
      threshold_used: thresholdUsed,
      evaluation_outputs: allLogOutputs.map((o) => o.id),
    },
    metadata: {
      ...evaluationRun.metadata,
      total_logs: allLogOutputs.length,
      passed_count: passedCount,
      failed_count: failedCount,
      average_score: averageScore,
      threshold_used: thresholdUsed,
      evaluation_outputs: allLogOutputs.map((o) => o.id),
    },
  });
}

export async function evaluateRoleAdherenceDataset(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: RoleAdherenceEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: RoleAdherenceAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: datasetId,
    agent_id: agentId,
    skill_id: skillId,
    evaluation_method: EvaluationMethodName.ROLE_ADHERENCE,
    name:
      evalRunOptions.name ||
      `Role Adherence Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions.description ||
      `Evaluates assistant role adherence using LLM-as-a-judge for dataset ${datasetId}`,
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

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  try {
    const logs = await userDataStorageConnector.getDatasetLogs(datasetId, {});

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
              evaluationRun.id,
              llmJudge,
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
            evaluationRun.id,
            llmJudge,
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

    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
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
          id: evaluationRun.id,
        })
      )[0] || evaluationRun;

    const averageResult: RoleAdherenceAverageResult = {
      average_score,
      total_logs: logs.length,
      passed_count,
      failed_count,
      threshold_used,
      evaluation_run_id: evaluationRun.id,
    };

    return { averageResult, evaluationRun: updated };
  } catch (error) {
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
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
