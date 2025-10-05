import { extractTaskAndOutcome } from '@server/connectors/evaluations/task-completion/service/task-and-outcome';
import { taskCompletionEvaluationConnector } from '@server/connectors/evaluations/task-completion/task-completion';
import getTaskCompletionVerdictTemplate from '@server/connectors/evaluations/task-completion/templates/verdict';
import type { TaskCompletionAverageResult } from '@server/connectors/evaluations/task-completion/types';
import { createLLMJudge } from '@server/evaluations';
import type { UserDataStorageConnector } from '@server/types/connector';
import { extractMessagesFromRequestData } from '@server/utils/idkhub/requests';
import { extractOutputFromResponseBody } from '@server/utils/idkhub/responses';
import { formatMessagesForExtraction } from '@server/utils/messages';
import type {
  ChatCompletionRequestData,
  ResponsesRequestData,
  StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { IdkResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type {
  LogOutput,
  LogOutputCreateParams,
} from '@shared/types/data/log-output';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';
import { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';

/**
 * Generate verdict using universal LLM judge with verdict template
 */
async function generateVerdict(
  { task, outcome }: { task: string; outcome: string },
  llm_judge: LLMJudge,
): Promise<{ verdict: number; reason: string }> {
  const verdictTemplate = getTaskCompletionVerdictTemplate({ task, outcome });
  const verdict_result = await llm_judge.evaluate({
    text: `${verdictTemplate.systemPrompt}\n\n${verdictTemplate.userPrompt}`,
  });

  return {
    verdict: verdict_result.score,
    reason: verdict_result.reasoning,
  };
}

async function getTaskAndOutcome(
  params: TaskCompletionEvaluationParameters,
  log: Log,
): Promise<{ task: string; outcome: string }> {
  const idkRequestData = produceIdkRequestData(
    log.ai_provider_request_log.method,
    log.ai_provider_request_log.request_url,
    {},
    log.ai_provider_request_log.request_body,
  );
  const responseBody = IdkResponseBody.parse(
    log.ai_provider_request_log.response_body,
  );

  const messages = extractMessagesFromRequestData(
    idkRequestData as
      | ChatCompletionRequestData
      | StreamChatCompletionRequestData
      | ResponsesRequestData,
  );
  const input = formatMessagesForExtraction(messages);
  const output = extractOutputFromResponseBody(responseBody);

  const { task, outcome } = await extractTaskAndOutcome(params, input, output);
  return { task: params.task || task, outcome };
}

/**
 * Evaluate a single log and create LogOutput record
 */
async function evaluateSingleLog(
  log: Log,
  params: TaskCompletionEvaluationParameters,
  llm_judge: LLMJudge,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput> {
  const start_time = Date.now();
  const verbose_logs: string[] = [];

  try {
    const { task, outcome } = await getTaskAndOutcome(params, log);

    // Step 2: Generate verdict
    const { verdict, reason } = await generateVerdict(
      { task, outcome },
      llm_judge,
    );
    const verdict_llm_output = JSON.stringify({ verdict, reason });

    // Apply strict mode logic
    let final_verdict = verdict;
    let threshold = params.threshold || 0.5;

    if (params.strict_mode) {
      final_verdict = verdict === 1.0 ? 1.0 : 0.0;
      threshold = 1.0;
    }

    const passed = final_verdict >= threshold;
    const execution_time = Date.now() - start_time;

    // Create LogOutput record
    const evaluationOutput: LogOutputCreateParams = {
      log_id: log.id,
      output: {
        task,
        outcome,
        score: final_verdict,
        passed,
        reasoning: reason,
        threshold,
        strict_mode: params.strict_mode,
        verdict_llm_output,
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
      },
      score: final_verdict,
      metadata: {
        task,
        outcome,
        threshold,
        strict_mode: params.strict_mode,
        extraction_llm_output: {
          task,
          outcome,
        },
        verdict_llm_output,
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
        ...(params.verbose_mode && { verbose_logs }),
      },
    };

    return await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );
  } catch (error) {
    console.error('Error evaluating log:', error);
    const execution_time = Date.now() - start_time;

    const evaluationOutput: LogOutputCreateParams = {
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

    return await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );
  }
}

/**
 * Process logs in batches for better performance
 */
async function processLogsInBatches(
  logs: Log[],
  params: TaskCompletionEvaluationParameters,
  llmJudge: LLMJudge,
  evaluationRunId: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput[]> {
  const batch_size = params.batch_size || 10;
  const results: LogOutput[] = [];

  for (let i = 0; i < logs.length; i += batch_size) {
    const batch = logs.slice(i, i + batch_size);

    if (params.async_mode !== false) {
      // Process batch concurrently
      const batch_results = await Promise.all(
        batch.map((log) =>
          evaluateSingleLog(
            log,
            params,
            llmJudge,
            evaluationRunId,
            userDataStorageConnector,
          ),
        ),
      );
      results.push(...batch_results);
    } else {
      // Process batch sequentially
      for (const log of batch) {
        const result = await evaluateSingleLog(
          log,
          params,
          llmJudge,
          evaluationRunId,
          userDataStorageConnector,
        );
        results.push(result);
      }
    }
  }

  return results;
}

export async function evaluateLogOld(
  evaluationRunId: string,
  log: Log,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput> {
  // Get the evaluation run to access parameters
  const evaluationRuns = await userDataStorageConnector.getEvaluationRuns({
    id: evaluationRunId,
  });
  const evaluationRun = evaluationRuns[0];
  if (!evaluationRun) {
    throw new Error(`Evaluation run ${evaluationRunId} not found`);
  }

  const params = TaskCompletionEvaluationParameters.parse(
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
  const logOutput = await evaluateSingleLog(
    logForEvaluation,
    params,
    llmJudge,
    evaluationRunId,
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

  return logOutput;
}

/**
 * Task completion evaluation function - evaluates each log individually
 * and stores LogOutput records, then returns average results
 */
export async function evaluateTaskCompletion(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: TaskCompletionEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: TaskCompletionAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const start_time = Date.now();

  // Create initial evaluation run record
  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: datasetId,
    agent_id: agentId,
    skill_id: skillId,
    evaluation_method: EvaluationMethodName.TASK_COMPLETION,
    name:
      evalRunOptions.name ||
      `Task Completion Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions.description ||
      `Evaluates whether an AI agent successfully completed a given task using LLM-as-a-judge for dataset ${datasetId}`,
    metadata: {
      parameters: params,
      method_config: taskCompletionEvaluationConnector?.getDetails?.(),
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
    // Get logs from database
    const logs = await userDataStorageConnector.getDatasetLogs(datasetId, {});

    // Process all logs and create LogOutput records
    const evaluationOutputs = await processLogsInBatches(
      logs,
      params,
      llmJudge,
      evaluationRun.id,
      userDataStorageConnector,
    );

    // Aggregate results
    const scores = evaluationOutputs.map((output) => output.score || 0);
    const average_score =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const threshold_used = params.strict_mode ? 1.0 : params.threshold || 0.5;
    const passed_count = scores.filter(
      (score) => score >= threshold_used,
    ).length;
    const failed_count = scores.length - passed_count;
    const total_execution_time = Date.now() - start_time;

    // Update the evaluation run in the database
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_logs: logs.length,
        passed_count,
        failed_count,
        average_score,
        threshold_used,
        evaluation_outputs: evaluationOutputs.map((output) => output.id),
        total_execution_time,
        total_execution_time_ms: total_execution_time,
      },
      metadata: {
        ...evaluationRun.metadata,
        total_logs: logs.length,
        passed_count,
        failed_count,
        average_score,
        threshold_used,
        evaluation_outputs: evaluationOutputs.map((output) => output.id),
        total_execution_time,
        total_execution_time_ms: total_execution_time,
      },
      completed_at: new Date().toISOString(),
    });

    // Get the updated evaluation run with results
    const updatedEvaluationRuns =
      await userDataStorageConnector.getEvaluationRuns({
        id: evaluationRun.id,
      });
    const updatedEvaluationRun =
      updatedEvaluationRuns.find((run) => run.id === evaluationRun.id) ||
      evaluationRun;

    const averageResult: TaskCompletionAverageResult = {
      average_score,
      total_logs: logs.length,
      passed_count,
      failed_count,
      threshold_used,
      evaluation_run_id: evaluationRun.id,
    };

    return { averageResult, evaluationRun: updatedEvaluationRun };
  } catch (error) {
    // Update evaluation run with error status
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: 'failed' as EvaluationRunStatus,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        ...evaluationRun.metadata,
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
): Promise<SkillOptimizationEvaluationResult> {
  const params = TaskCompletionEvaluationParameters.parse(evaluation.metadata);

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  const start_time = Date.now();

  const { task, outcome } = await getTaskAndOutcome(params, log);

  // Step 2: Generate verdict
  const { verdict, reason } = await generateVerdict(
    { task, outcome },
    llmJudge,
  );
  const verdict_llm_output = JSON.stringify({ verdict, reason });

  const execution_time = Date.now() - start_time;

  const result: SkillOptimizationEvaluationResult = {
    method: EvaluationMethodName.TASK_COMPLETION,
    score: verdict,
    extra_data: {
      task,
      outcome,
      strict_mode: params.strict_mode,
      extraction_llm_output: {
        task,
        outcome,
      },
      verdict_llm_output,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
  };

  return result;
}
