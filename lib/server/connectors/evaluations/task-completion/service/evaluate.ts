import { taskCompletionEvaluationConnector } from '@server/connectors/evaluations/task-completion/task-completion';
import type { TaskCompletionAverageResult } from '@server/connectors/evaluations/task-completion/types';
import type { ToolUsage } from '@server/connectors/evaluations/tool-correctness/types';
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
import type { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';

/**
 * Extract task and outcome from LLM response
 */
function extractTaskAndOutcome(extractionResult: {
  reasoning?: string;
  metadata?: Record<string, unknown>;
}): { task: string; outcome: string } {
  const reasoning = extractionResult.reasoning || '';
  const metadata = (extractionResult.metadata || {}) as Record<string, unknown>;

  // Check if this is a fallback result (API error, etc.)
  if (metadata.fallback === true) {
    return { task: '', outcome: '' };
  }

  // Try to get structured data from metadata first
  let task = typeof metadata.task === 'string' ? metadata.task : '';
  let outcome = typeof metadata.outcome === 'string' ? metadata.outcome : '';

  // If not found in top-level metadata, check nested metadata structure
  if (!task || !outcome) {
    const nestedMetadata = metadata.metadata as Record<string, unknown>;
    if (nestedMetadata) {
      if (!task && typeof nestedMetadata.task === 'string') {
        task = nestedMetadata.task;
      }
      if (!outcome && typeof nestedMetadata.outcome === 'string') {
        outcome = nestedMetadata.outcome;
      }
    }
  }

  // If still not found, try to extract from metadata reasoning
  if (!task || !outcome) {
    if (typeof metadata.reasoning === 'string') {
      const reasoning = metadata.reasoning;

      // Try to extract task and outcome from the reasoning text
      // Look for patterns like "The user was trying to..." and "However, the actual outcome was..."
      const taskMatch = reasoning.match(
        /The user (?:was trying to|requested|wanted to|asked to) (.+?)(?:\.|,|;|however|but|$)/i,
      );
      const outcomeMatch = reasoning.match(
        /(?:However, the actual outcome was|the outcome was|the result was) (.+?)(?:\.|;|therefore|so|indicating|$)/i,
      );

      // For the battery creation case, we need a different pattern since it doesn't follow the standard format
      if (!task && !outcome) {
        const batteryMatch = reasoning.match(
          /The user requested (.+?)\. However, (.+?)\./i,
        );
        if (batteryMatch) {
          task = batteryMatch[1].trim();
          outcome = batteryMatch[2].trim();
        }
      }

      if (!task && taskMatch) {
        task = taskMatch[1].trim();
      }
      if (!outcome && outcomeMatch) {
        outcome = outcomeMatch[1].trim();
        // Remove "that" prefix if present
        if (outcome.startsWith('that ')) {
          outcome = outcome.substring(5);
        }
      }
    }
  }

  // Fallback: try to parse JSON from reasoning
  if (!task || !outcome) {
    try {
      const parsed = JSON.parse(reasoning) as Record<string, unknown>;
      if (!task && typeof parsed.task === 'string') task = parsed.task;
      if (!outcome && typeof parsed.outcome === 'string')
        outcome = parsed.outcome;
    } catch {
      console.warn(
        'Failed to parse JSON from extraction reasoning:',
        reasoning,
      );
    }
  }

  return { task, outcome };
}

/**
 * Get tools called from log metadata
 */
function getToolsCalled(
  log: Log,
  params: TaskCompletionEvaluationParameters,
): ToolUsage[] {
  if (params.tools_called && Array.isArray(params.tools_called)) {
    return params.tools_called as ToolUsage[];
  }

  const tools = log.metadata?.tools;
  if (typeof tools === 'string') {
    try {
      return JSON.parse(tools) as ToolUsage[];
    } catch {
      return [];
    }
  }

  if (Array.isArray(tools)) {
    return tools as ToolUsage[];
  }

  if (typeof tools === 'object' && tools !== null) {
    return [tools as ToolUsage];
  }

  return [];
}

/**
 * Get actual output from params or log
 */
function getActualOutput(
  log: Log,
  params: TaskCompletionEvaluationParameters,
): string {
  if (typeof params.actual_output === 'string') {
    return params.actual_output;
  }

  // Try to get from ai_provider_request_log response_body
  if (log.ai_provider_request_log?.response_body) {
    if (typeof log.ai_provider_request_log.response_body === 'string') {
      return log.ai_provider_request_log.response_body;
    }
    return JSON.stringify(log.ai_provider_request_log.response_body);
  }

  // Try to get from metadata
  if (log.metadata?.ground_truth) {
    if (typeof log.metadata.ground_truth === 'string') {
      return log.metadata.ground_truth;
    }
    return JSON.stringify(log.metadata.ground_truth);
  }

  return '';
}

/**
 * Generate verdict using universal LLM judge with verdict template
 */
async function generateVerdict(
  { task, outcome }: { task: string; outcome: string },
  llm_judge: LLMJudge,
): Promise<{ verdict: number; reason: string }> {
  const { getTaskCompletionVerdictTemplate } = await import(
    '@server/connectors/evaluations/task-completion/templates/verdict'
  );

  const verdictTemplate = getTaskCompletionVerdictTemplate({ task, outcome });
  const verdict_result = await llm_judge.evaluate({
    text: `${verdictTemplate.systemPrompt}\n\n${verdictTemplate.userPrompt}`,
  });

  return {
    verdict: verdict_result.score,
    reason: verdict_result.reasoning,
  };
}

/**
 * Evaluate a single log and create EvaluationOutput record
 */
async function evaluateSingleLog(
  log: Log,
  params: TaskCompletionEvaluationParameters,
  llm_judge: LLMJudge,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput> {
  const start_time = Date.now();
  const verbose_logs: string[] = [];

  try {
    // Step 1: Extract task and outcome
    let task = '';
    let outcome = '';
    let extraction_llm_output = '';

    if (params.task) {
      task = params.task;
    } else if (log.metadata?.trace) {
      // Use trace-based extraction
      const { getTaskCompletionExtractionTraceTemplate } = await import(
        '@server/connectors/evaluations/task-completion/templates/extraction-trace'
      );

      const traceString =
        typeof log.metadata.trace === 'string'
          ? log.metadata.trace
          : JSON.stringify(log.metadata.trace, null, 2);

      const extractionTemplate = getTaskCompletionExtractionTraceTemplate({
        trace: traceString,
      });
      const extraction_result = await llm_judge.evaluate({
        text: `${extractionTemplate.systemPrompt}\n\n${extractionTemplate.userPrompt}`,
        outputFormat: extractionTemplate.outputFormat,
      });

      extraction_llm_output = JSON.stringify(extraction_result);
      ({ task, outcome } = extractTaskAndOutcome(extraction_result));
    } else {
      // Use standard extraction
      const rawInput =
        params.input ||
        (
          (log.ai_provider_request_log as Record<string, unknown>)
            ?.request_body as Record<string, unknown>
        )?.input ||
        '';
      const input =
        typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);
      const tools_called = getToolsCalled(log, params);
      const actual_output = getActualOutput(log, params);

      const { getTaskCompletionExtractionTemplate } = await import(
        '@server/connectors/evaluations/task-completion/templates/extraction'
      );

      const extractionTemplate = getTaskCompletionExtractionTemplate({
        input,
        tools_called,
        actual_output,
      });

      const extraction_result = await llm_judge.evaluate({
        text: `${extractionTemplate.systemPrompt}\n\n${extractionTemplate.userPrompt}`,
        outputFormat: extractionTemplate.outputFormat,
      });

      extraction_llm_output = JSON.stringify(extraction_result);
      ({ task, outcome } = extractTaskAndOutcome(extraction_result));
    }

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

    // Create EvaluationOutput record
    const evaluationOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
      output: {
        task,
        outcome,
        score: final_verdict,
        passed,
        reasoning: reason,
        threshold,
        strict_mode: params.strict_mode,
        extraction_llm_output,
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
        extraction_llm_output,
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
  llm_judge: LLMJudge,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput[]> {
  const batch_size = params.batch_size || 10;
  const results: EvaluationOutput[] = [];

  for (let i = 0; i < logs.length; i += batch_size) {
    const batch = logs.slice(i, i + batch_size);

    if (params.async_mode !== false) {
      // Process batch concurrently
      const batch_results = await Promise.all(
        batch.map((log) =>
          evaluateSingleLog(
            log,
            params,
            llm_judge,
            evaluation_run_id,
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
          llm_judge,
          evaluation_run_id,
          userDataStorageConnector,
        );
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Task completion evaluation function - evaluates each log individually
 * and stores EvaluationOutput records, then returns average results
 */
export async function evaluateTaskCompletion(
  input: DatasetQueryParams,
  params: TaskCompletionEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: TaskCompletionAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const internalLlmJudge = createLLMJudge({
    model: params.model || 'gpt-4o',
    temperature: params.temperature || 0.1,
    max_tokens: params.max_tokens || 1000,
  });

  return await evaluateDataset(
    input,
    params,
    internalLlmJudge,
    userDataStorageConnector,
    evalRunOptions,
  );
}

/**
 * Evaluate a dataset and create EvaluationRun with aggregated results
 */
async function evaluateDataset(
  input: DatasetQueryParams,
  params: TaskCompletionEvaluationParameters,
  llm_judge: LLMJudge,
  user_data_storage_connector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: TaskCompletionAverageResult;
  evaluationRun: EvaluationRun;
}> {
  if (!user_data_storage_connector) {
    throw new Error(
      'User data storage connector is required for dataset evaluation',
    );
  }

  if (!input.id) {
    throw new Error('Dataset ID is required for evaluation');
  }

  if (!params.agent_id) {
    throw new Error('Agent ID is required for evaluation');
  }

  const start_time = Date.now();

  // Create initial evaluation run record
  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: input.id,
    agent_id: params.agent_id,
    evaluation_method: EvaluationMethodName.TASK_COMPLETION,
    name:
      evalRunOptions?.name ||
      `Task Completion Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions?.description ||
      `Evaluates whether an AI agent successfully completed a given task using LLM-as-a-judge for dataset ${input.id}`,
    metadata: {
      parameters: params,
      method_config: taskCompletionEvaluationConnector?.getDetails?.(),
      is_custom_evaluation: false,
    },
  };

  const evaluationRun = await user_data_storage_connector.createEvaluationRun(
    evaluationRunCreateParams,
  );
  const evaluation_run_id = evaluationRun.id;

  if (!evaluation_run_id) {
    throw new Error('Failed to create evaluation run - no ID returned');
  }

  try {
    // Get logs from database
    const logs = await user_data_storage_connector.getDatasetLogs(input.id, {
      limit: input.limit || 10,
      offset: input.offset || 0,
    });

    // Process all logs and create EvaluationOutput records
    const evaluationOutputs = await processLogsInBatches(
      logs,
      params,
      llm_judge,
      evaluation_run_id,
      user_data_storage_connector,
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
    await user_data_storage_connector.updateEvaluationRun(evaluation_run_id, {
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
      await user_data_storage_connector.getEvaluationRuns({
        id: evaluation_run_id,
      });
    const updatedEvaluationRun =
      updatedEvaluationRuns.find((run) => run.id === evaluation_run_id) ||
      evaluationRun;

    const averageResult: TaskCompletionAverageResult = {
      average_score,
      total_logs: logs.length,
      passed_count,
      failed_count,
      threshold_used,
      evaluation_run_id,
    };

    return { averageResult, evaluationRun: updatedEvaluationRun };
  } catch (error) {
    // Update evaluation run with error status
    await user_data_storage_connector.updateEvaluationRun(evaluation_run_id, {
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
