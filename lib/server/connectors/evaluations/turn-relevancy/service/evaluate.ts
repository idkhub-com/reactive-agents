import { getTurnRelevancyTemplate } from '@server/connectors/evaluations/turn-relevancy/templates/main';
import type { TurnRelevancyAverageResult } from '@server/connectors/evaluations/turn-relevancy/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
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
} from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type {
  LogOutput,
  LogOutputCreateParams,
} from '@shared/types/data/log-output';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';
import { TurnRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/turn-relevancy';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';

import { v4 as uuidv4 } from 'uuid';

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('rate limit') ||
      message.includes('temporary')
    );
  }
  return false;
}

function pickTurnRelevancyData(
  log: Log,
  params: TurnRelevancyEvaluationParameters,
): {
  conversation_history: string;
  current_turn: string;
  instructions?: string;
} {
  // Extract conversation history using standard utilities if not provided in params
  let conversation_history = params.conversation_history;
  if (!conversation_history) {
    try {
      const idkRequestData = produceIdkRequestData(
        log.ai_provider_request_log.method,
        log.ai_provider_request_log.request_url,
        {},
        log.ai_provider_request_log.request_body,
      );
      const messages = extractMessagesFromRequestData(
        idkRequestData as
          | ChatCompletionRequestData
          | StreamChatCompletionRequestData
          | ResponsesRequestData,
      );
      conversation_history = formatMessagesForExtraction(messages);
    } catch {
      // Fallback to metadata if parsing fails
      conversation_history =
        (log.metadata?.conversation_history as string) || '';
    }
  }

  // Extract current turn using standard utilities if not provided in params
  let current_turn = params.current_turn;
  if (!current_turn) {
    try {
      const responseBody = IdkResponseBody.parse(
        log.ai_provider_request_log.response_body,
      );
      current_turn = extractOutputFromResponseBody(responseBody);
    } catch {
      // Fallback to metadata if parsing fails
      current_turn =
        (typeof log.metadata?.ground_truth === 'string'
          ? (log.metadata.ground_truth as string)
          : log.metadata?.ground_truth
            ? JSON.stringify(log.metadata.ground_truth)
            : (log.metadata?.current_turn as string) || '') || '';
    }
  }

  const instructions =
    params.instructions || (log.metadata?.instructions as string);
  return { conversation_history, current_turn, instructions };
}

async function evaluateSingleLog(
  log: Log,
  params: TurnRelevancyEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
  retryCount = 0,
): Promise<LogOutput> {
  const start_time = Date.now();
  const _evaluation_output_id = uuidv4();
  const maxRetries = 2;

  try {
    const { conversation_history, current_turn, instructions } =
      pickTurnRelevancyData(log, params);

    const tpl = getTurnRelevancyTemplate({
      conversation_history,
      current_turn,
      strict_mode: params.strict_mode || false,
      verbose_mode: params.verbose_mode ?? true,
      include_reason: params.include_reason ?? true,
    });

    const judgeResult = await llm_judge.evaluate({
      text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
      outputFormat: 'json',
    });

    let final_score = judgeResult.score;
    let threshold = params.threshold || 0.5;
    if (params.strict_mode) {
      final_score = final_score === 1.0 ? 1.0 : 0.0;
      threshold = 1.0;
    }

    const passed = final_score >= threshold;
    const execution_time = Date.now() - start_time;

    const LogOutput: LogOutputCreateParams = {
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
        conversation_history,
        current_turn,
        instructions,
        strict_mode: params.strict_mode,
        verbose_mode: params.verbose_mode,
        include_reason: params.include_reason,
        threshold,
        execution_time,
        evaluation_run_id,
        ...judgeResult.metadata,
      },
    };

    const createdOutput = await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      LogOutput,
    );

    return createdOutput;
  } catch (error) {
    console.error(
      `Error evaluating turn relevancy for log (attempt ${retryCount + 1}):`,
      error,
    );

    // Retry logic for transient errors
    if (retryCount < maxRetries && isRetryableError(error)) {
      console.log(
        `Retrying log evaluation (attempt ${retryCount + 2}/${maxRetries + 1})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1)),
      ); // Exponential backoff
      return evaluateSingleLog(
        log,
        params,
        evaluation_run_id,
        llm_judge,
        userDataStorageConnector,
        retryCount + 1,
      );
    }

    const execution_time = Date.now() - start_time;

    const errorOutput: LogOutputCreateParams = {
      log_id: log.id,
      output: {
        score: 0,
        passed: false,
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        threshold: params.threshold || 0.5,
        strict_mode: params.strict_mode,
        evaluated_at: new Date().toISOString(),
        execution_time,
        execution_time_ms: execution_time,
        evaluation_run_id,
        error: true,
      },
      score: 0,
      metadata: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time,
        evaluation_run_id,
        retry_count: retryCount,
      },
    };

    return await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      errorOutput,
    );
  }
}

async function processLogsInBatches(
  logs: Log[],
  params: TurnRelevancyEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput[]> {
  const batch_size = params.batch_size || 10;
  const results = [];

  for (let i = 0; i < logs.length; i += batch_size) {
    const batch = logs.slice(i, i + batch_size);

    if (params.async_mode !== false) {
      // Process batch in parallel
      const batchPromises = batch.map((log) =>
        evaluateSingleLog(
          log,
          params,
          evaluation_run_id,
          llm_judge,
          userDataStorageConnector,
        ),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } else {
      // Process batch sequentially
      for (const log of batch) {
        const result = await evaluateSingleLog(
          log,
          params,
          evaluation_run_id,
          llm_judge,
          userDataStorageConnector,
        );
        results.push(result);
      }
    }

    // Update evaluation run progress
    const processed = Math.min(i + batch_size, logs.length);
    const percentage = Math.round((processed / logs.length) * 100);

    console.log(
      `Turn relevancy evaluation progress: ${processed}/${logs.length} (${percentage}%)`,
    );

    await userDataStorageConnector.updateEvaluationRun(evaluation_run_id, {
      status: EvaluationRunStatus.RUNNING,
      metadata: {
        progress: {
          processed,
          total: logs.length,
          percentage,
          current_batch: Math.floor(i / batch_size) + 1,
          total_batches: Math.ceil(logs.length / batch_size),
        },
      },
    });
  }

  return results;
}

export async function evaluateOneLogForTurnRelevancy(
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

  const params = TurnRelevancyEvaluationParameters.parse(
    evaluationRun.metadata?.parameters || {},
  );

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  // Evaluate the single log
  const logOutput = await evaluateSingleLog(
    log,
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
  const validResults = allLogOutputs.filter((r) => !r.metadata?.error);
  const scores = validResults.map((r) => r.score || 0);
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  const thresholdUsed = params.threshold || 0.5;
  const passedCount = validResults.filter(
    (r) => (r.score || 0) >= thresholdUsed,
  ).length;
  const failedCount = validResults.length - passedCount;

  // Calculate additional statistics
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const medianScore =
    scores.length > 0
      ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
      : 0;

  // Update the evaluation run with new statistics
  await userDataStorageConnector.updateEvaluationRun(evaluationRunId, {
    results: {
      ...(evaluationRun.results || {}),
      total_logs: allLogOutputs.length,
      passed_count: passedCount,
      failed_count: failedCount,
      average_score: averageScore,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
      valid_results_count: validResults.length,
      error_results_count: allLogOutputs.length - validResults.length,
    },
    metadata: {
      ...evaluationRun.metadata,
      total_logs: allLogOutputs.length,
      passed_count: passedCount,
      failed_count: failedCount,
      average_score: averageScore,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
      valid_results_count: validResults.length,
      error_results_count: allLogOutputs.length - validResults.length,
    },
  });

  return logOutput;
}

export async function evaluateTurnRelevancyDataset(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: TurnRelevancyEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: TurnRelevancyAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const start_time = Date.now();

  // Create evaluation run
  const evaluationRunParams: EvaluationRunCreateParams = {
    dataset_id: datasetId,
    agent_id: agentId,
    skill_id: skillId,
    evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
    name:
      evalRunOptions?.name ||
      `Turn Relevancy Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions?.description ||
      `Evaluates turn relevancy for dataset ${datasetId}`,
    metadata: {
      parameters: params,
      method_config: {
        method: EvaluationMethodName.TURN_RELEVANCY,
        name: 'Turn Relevancy',
        description:
          'Evaluates whether a conversation turn is relevant to the prior context',
      },
      is_custom_evaluation: false,
    },
  };

  const evaluationRun =
    await userDataStorageConnector.createEvaluationRun(evaluationRunParams);

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  try {
    // Get logs
    const logs = await userDataStorageConnector.getDatasetLogs(datasetId, {});

    if (!logs || logs.length === 0) {
      throw new Error('No logs found for evaluation');
    }

    // Process logs in batches
    const results = await processLogsInBatches(
      logs,
      params,
      evaluationRun.id,
      llmJudge,
      userDataStorageConnector,
    );

    // Calculate aggregate results with detailed statistics
    const validResults = results.filter((r) => !r.metadata?.error);
    const errorResults = results.filter((r) => r.metadata?.error);
    const scores = validResults.map((r) => r.score || 0);

    const average_score =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const threshold = params.threshold || 0.5;
    const passed_count = validResults.filter(
      (r) => (r.score || 0) >= threshold,
    ).length;
    const failed_count = validResults.length - passed_count;

    // Calculate additional statistics
    const min_score = scores.length > 0 ? Math.min(...scores) : 0;
    const max_score = scores.length > 0 ? Math.max(...scores) : 0;
    const median_score =
      scores.length > 0
        ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
        : 0;

    console.log(`Turn relevancy evaluation completed:`, {
      total_logs: logs.length,
      valid_results: validResults.length,
      error_results: errorResults.length,
      average_score: average_score.toFixed(3),
      min_score: min_score.toFixed(3),
      max_score: max_score.toFixed(3),
      median_score: median_score.toFixed(3),
      passed_count,
      failed_count,
      threshold,
    });

    const averageResult = {
      average_score,
      total_logs: logs.length,
      passed_count,
      failed_count,
      threshold_used: threshold,
      evaluation_run_id: evaluationRun.id,
      // Additional statistics
      min_score,
      max_score,
      median_score,
      valid_results_count: validResults.length,
      error_results_count: errorResults.length,
    } satisfies TurnRelevancyAverageResult;

    // Update evaluation run with final results
    const execution_time = Date.now() - start_time;
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.COMPLETED,
      results: averageResult,
      metadata: {
        ...evaluationRun.metadata,
        results: averageResult,
        execution_time,
        execution_time_ms: execution_time,
        processed_logs: validResults.length,
        error_count: results.length - validResults.length,
      },
      completed_at: new Date().toISOString(),
    });

    const updated = await userDataStorageConnector.getEvaluationRuns({
      id: evaluationRun.id,
    });
    const updatedRun = updated[0] || evaluationRun;

    return { averageResult, evaluationRun: updatedRun };
  } catch (error) {
    console.error('Error in turn relevancy evaluation:', error);

    // Update evaluation run with error status
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        ...evaluationRun.metadata,
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - start_time,
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
  const params = TurnRelevancyEvaluationParameters.parse(evaluation.metadata);

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  const start_time = Date.now();

  const { conversation_history, current_turn, instructions } =
    pickTurnRelevancyData(log, params);

  const tpl = getTurnRelevancyTemplate({
    conversation_history,
    current_turn,
    strict_mode: params.strict_mode || false,
    verbose_mode: params.verbose_mode ?? true,
    include_reason: params.include_reason ?? true,
  });

  const judgeResult = await llmJudge.evaluate({
    text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
    outputFormat: 'json',
  });

  let final_score = judgeResult.score;
  if (params.strict_mode) {
    final_score = final_score === 1.0 ? 1.0 : 0.0;
  }

  const execution_time = Date.now() - start_time;

  const evaluationResult: SkillOptimizationEvaluationResult = {
    method: EvaluationMethodName.TURN_RELEVANCY,
    score: final_score,
    extra_data: {
      reasoning: judgeResult.reasoning,
      conversation_history,
      current_turn,
      instructions,
      strict_mode: params.strict_mode,
      metadata: judgeResult.metadata,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
  };

  return evaluationResult;
}
