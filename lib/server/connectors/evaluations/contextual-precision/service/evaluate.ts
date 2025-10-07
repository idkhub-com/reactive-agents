import { createLLMJudge } from '@server/evaluations/llm-judge';

import type { UserDataStorageConnector } from '@server/types/connector';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
} from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type {
  LogOutput as EvaluationOutput,
  LogOutputCreateParams as EvaluationOutputCreateParams,
} from '@shared/types/data/log-output';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { ContextualPrecisionEvaluationParameters } from '@shared/types/idkhub/evaluations/contextual-precision';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { v4 as uuidv4 } from 'uuid';
import { getContextualPrecisionTemplate } from '../templates/main';

function pickContextualPrecisionData(
  log: Log,
  params: ContextualPrecisionEvaluationParameters,
): {
  context: string;
  answer: string;
  retrieval_context?: string;
} {
  // Extract context from parameters or log metadata
  let context = params.context || '';

  if (!context) {
    // Try to extract from request body
    const requestBody = (log.ai_provider_request_log as Record<string, unknown>)
      ?.request_body as Record<string, unknown>;

    if (requestBody) {
      const possibleContext =
        requestBody.context ||
        requestBody.retrieval_context ||
        requestBody.knowledge_base;
      if (possibleContext) {
        if (typeof possibleContext === 'string') {
          context = possibleContext;
        } else {
          context = JSON.stringify(possibleContext);
        }
      }
    }
  }

  // If still no context, try to extract from metadata
  if (!context) {
    const contextFromMetadata = log.metadata?.context as string;
    if (contextFromMetadata) {
      context = contextFromMetadata;
    } else {
      // Try to extract from the endpoint or function name as fallback
      context = `Context from ${log.endpoint || log.function_name || 'unknown endpoint'}`;
    }
  }

  // Extract answer from parameters or log response
  let answer = params.answer || '';

  if (!answer) {
    if (log.ai_provider_request_log?.response_body) {
      if (typeof log.ai_provider_request_log.response_body === 'string') {
        answer = log.ai_provider_request_log.response_body;
      } else {
        answer = JSON.stringify(log.ai_provider_request_log.response_body);
      }
    } else if (log.metadata?.ground_truth) {
      if (typeof log.metadata.ground_truth === 'string') {
        answer = log.metadata.ground_truth;
      } else {
        answer = JSON.stringify(log.metadata.ground_truth);
      }
    } else {
      // Try to extract from assistant response in metadata
      const assistantResponse = log.metadata?.assistant_response as string;
      if (assistantResponse) {
        answer = assistantResponse;
      } else {
        // Fallback to status-based response
        answer = `Response with status ${log.status}`;
      }
    }
  }

  // Extract retrieval context if available
  const retrieval_context =
    params.retrieval_context ||
    (log.metadata?.retrieval_context as string) ||
    '';

  // Log the extracted data for debugging
  console.log(`Contextual Precision - Extracted data for log ${log.id}:`, {
    context: context.substring(0, 100) + (context.length > 100 ? '...' : ''),
    answer: answer.substring(0, 100) + (answer.length > 100 ? '...' : ''),
    retrieval_context:
      retrieval_context.substring(0, 50) +
      (retrieval_context.length > 50 ? '...' : ''),
  });

  return { context, answer, retrieval_context };
}

async function evaluateSingleLog(
  log: Log,
  params: ContextualPrecisionEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
  retryCount = 0,
): Promise<EvaluationOutput> {
  const start_time = Date.now();
  const _evaluation_output_id = uuidv4();
  const maxRetries = 2;

  try {
    const { context, answer, retrieval_context } = pickContextualPrecisionData(
      log,
      params,
    );

    // Validate that we have meaningful data to evaluate
    if (!context || context.trim().length === 0) {
      throw new Error('No context found in log data');
    }
    if (!answer || answer.trim().length === 0) {
      throw new Error('No answer found in log data');
    }

    console.log(
      `Contextual Precision - Evaluating log ${log.id} with context: "${context.substring(0, 50)}..." and answer: "${answer.substring(0, 50)}..."`,
    );

    const tpl = getContextualPrecisionTemplate({
      context,
      answer,
      retrieval_context,
      strict_mode: params.strict_mode || false,
      verbose_mode: params.verbose_mode ?? true,
      include_reason: params.include_reason ?? true,
    });

    const judgeResult = await llm_judge.evaluate({
      text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
      outputFormat: 'json',
    });

    console.log(`Contextual Precision - Judge result for log ${log.id}:`, {
      score: judgeResult.score,
      reasoning: `${judgeResult.reasoning?.substring(0, 100)}...`,
    });

    let final_score = judgeResult.score;
    let threshold = params.threshold || 0.7;
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
        context,
        answer,
        retrieval_context,
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
      evaluationOutput,
    );

    return createdOutput;
  } catch (error) {
    console.error(
      `Contextual Precision - Error evaluating log ${log.id}:`,
      error,
    );

    if (retryCount < maxRetries) {
      console.log(
        `Contextual Precision - Retrying evaluation for log ${log.id} (attempt ${retryCount + 1})`,
      );
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
    const failedOutput: EvaluationOutputCreateParams = {
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
        evaluation_run_id,
      },
    };

    return userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      failedOutput,
    );
  }
}

async function processLogsInBatches(
  logs: Log[],
  params: ContextualPrecisionEvaluationParameters,
  llm_judge: LLMJudge,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput[]> {
  const results: EvaluationOutput[] = [];
  const batch_size = params.batch_size || 10;

  for (let i = 0; i < logs.length; i += batch_size) {
    const batch = logs.slice(i, i + batch_size);
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

    console.log(
      `Contextual Precision - Processed batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(logs.length / batch_size)}`,
    );
  }

  return results;
}

export async function evaluateContextualPrecision(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: ContextualPrecisionEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: {
    average_score: number;
    total_logs: number;
    passed_count: number;
    failed_count: number;
    threshold_used: number;
    min_score: number;
    max_score: number;
    median_score: number;
  };
  evaluationRun: EvaluationRun;
}> {
  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  // Get logs from the dataset
  const logs = await userDataStorageConnector.getDatasetLogs(datasetId, {
    skill_id: skillId,
  });

  if (logs.length === 0) {
    throw new Error('No logs found in dataset');
  }

  console.log(
    `Contextual Precision - Starting evaluation for ${logs.length} logs`,
  );

  const start_time = Date.now();

  // Create evaluation run
  const evaluationRunParams: EvaluationRunCreateParams = {
    agent_id: agentId,
    skill_id: skillId,
    dataset_id: datasetId,
    evaluation_method: EvaluationMethodName.CONTEXTUAL_PRECISION,
    name: evalRunOptions.name || 'Contextual Precision Evaluation',
    description:
      evalRunOptions.description ||
      'Evaluating contextual precision of answers using context',
    metadata: {
      parameters: params,
      total_logs: logs.length,
    },
  };

  const evaluationRun =
    await userDataStorageConnector.createEvaluationRun(evaluationRunParams);

  // Set status to RUNNING
  await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
    status: EvaluationRunStatus.RUNNING,
  });

  try {
    // Process logs in batches
    const results = await processLogsInBatches(
      logs,
      params,
      llmJudge,
      evaluationRun.id,
      userDataStorageConnector,
    );

    // Calculate statistics
    const scores = results.map((result) => result.score || 0);
    const averageScore = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    const thresholdUsed = params.strict_mode ? 1.0 : params.threshold || 0.7;
    const passedCount = scores.filter((score) => score >= thresholdUsed).length;
    const failedCount = scores.length - passedCount;

    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const medianScore =
      scores.length > 0
        ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
        : 0;

    const execution_time = Date.now() - start_time;

    const averageResult = {
      average_score: averageScore,
      total_logs: scores.length,
      passed_count: passedCount,
      failed_count: failedCount,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
    };

    // Update evaluation run with results
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.COMPLETED,
      results: {
        ...averageResult,
        evaluation_outputs: results.map((r) => r.id),
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
      },
      metadata: {
        ...evaluationRun.metadata,
        ...averageResult,
        evaluation_outputs: results.map((r) => r.id),
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
      },
      completed_at: new Date().toISOString(),
    });

    console.log(
      `Contextual Precision - Evaluation completed with average score: ${averageScore}`,
    );

    return { averageResult, evaluationRun };
  } catch (error) {
    console.error('Contextual Precision - Error in evaluation:', error);
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      metadata: {
        ...evaluationRun.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

export async function evaluateOneLogForContextualPrecision(
  evaluationRunId: string,
  log: IdkRequestLog,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  console.log(
    `Contextual Precision - Starting evaluation for log ${log.id} in run ${evaluationRunId}`,
  );

  // Get the evaluation run to access parameters
  const evaluationRuns = await userDataStorageConnector.getEvaluationRuns({
    id: evaluationRunId,
  });
  const evaluationRun = evaluationRuns[0];
  if (!evaluationRun) {
    console.error(
      `Contextual Precision - Evaluation run ${evaluationRunId} not found`,
    );
    throw new Error(`Evaluation run ${evaluationRunId} not found`);
  }

  console.log(
    `Contextual Precision - Found evaluation run ${evaluationRunId} with method ${evaluationRun.evaluation_method}`,
  );

  let params: ContextualPrecisionEvaluationParameters;
  try {
    params = ContextualPrecisionEvaluationParameters.parse(
      evaluationRun.metadata?.parameters || {},
    );
    console.log(`Contextual Precision - Parsed parameters:`, {
      threshold: params.threshold,
      model: params.model,
      strict_mode: params.strict_mode,
    });
  } catch (error) {
    console.error(
      `Contextual Precision - Error parsing parameters for run ${evaluationRunId}:`,
      error,
    );
    // Use default parameters as fallback
    params = {
      threshold: 0.7,
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 1000,
      include_reason: true,
      strict_mode: false,
      async_mode: true,
      verbose_mode: false,
      batch_size: 10,
    };
  }

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

  const thresholdUsed = params.strict_mode ? 1.0 : params.threshold || 0.7;
  const passedCount = scores.filter((score) => score >= thresholdUsed).length;
  const failedCount = scores.length - passedCount;

  // Calculate additional statistics
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const medianScore =
    scores.length > 0
      ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
      : 0;

  // Calculate timing from the first log output to now
  const firstLogOutput = allLogOutputs[0];
  const currentTime = Date.now();
  const executionTime = firstLogOutput
    ? currentTime - new Date(firstLogOutput.created_at).getTime()
    : 0;

  // Update the evaluation run with new statistics
  await userDataStorageConnector.updateEvaluationRun(evaluationRunId, {
    results: {
      average_score: averageScore,
      total_logs: scores.length,
      passed_count: passedCount,
      failed_count: failedCount,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
      evaluation_outputs: allLogOutputs.map((o) => o.id),
      total_execution_time: executionTime,
      total_execution_time_ms: executionTime,
    },
    metadata: {
      ...evaluationRun.metadata,
      average_score: averageScore,
      total_logs: scores.length,
      passed_count: passedCount,
      failed_count: failedCount,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
      evaluation_outputs: allLogOutputs.map((o) => o.id),
      total_execution_time: executionTime,
      total_execution_time_ms: executionTime,
    },
    completed_at: new Date().toISOString(),
  });
}
