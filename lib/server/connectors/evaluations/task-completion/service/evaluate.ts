import { taskCompletionEvaluationConnector } from '@server/connectors/evaluations/task-completion/task-completion';
import type { TaskCompletionAverageResult } from '@server/connectors/evaluations/task-completion/types';
import type { ToolUsage } from '@server/connectors/evaluations/tool-correctness/types';
import { createLLMJudge } from '@server/evaluations';
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
import { TaskCompletionEvaluationParameters } from '@shared/types/idkhub/evaluations/task-completion';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

/**
 * Safely parse JSON with specific error handling
 * @param jsonString - The JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
function tryParseJSON(jsonString: string): Record<string, unknown> | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch (error) {
    // Log specific parsing errors for debugging
    console.warn('JSON parsing failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      input:
        jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : ''),
    });
    return null;
  }
}

/**
 * Standardized interface for task/outcome extraction results
 * This ensures consistent handling across all evaluation methods
 *
 * The LLM judge returns structured output in the metadata field:
 * {
 *   score: 1.0,
 *   reasoning: "Structured data extracted successfully",
 *   metadata: {
 *     task: "...",
 *     outcome: "..."
 *   }
 * }
 */
interface TaskOutcomeExtractionResult {
  reasoning?: string;
  metadata?: Record<string, unknown>;
  task?: string;
  outcome?: string;
}

/**
 * Extract task and outcome from metadata fields
 */
function extractFromMetadata(metadata: Record<string, unknown>): {
  task: string;
  outcome: string;
} {
  let task = typeof metadata.task === 'string' ? metadata.task : '';
  let outcome = typeof metadata.outcome === 'string' ? metadata.outcome : '';

  // Check nested metadata structure
  if (!task || !outcome) {
    const nestedMetadata = metadata.metadata as Record<string, unknown>;
    if (nestedMetadata) {
      if (!task && typeof nestedMetadata.task === 'string')
        task = nestedMetadata.task;
      if (!outcome && typeof nestedMetadata.outcome === 'string')
        outcome = nestedMetadata.outcome;
    }
  }

  return { task, outcome };
}

/**
 * Extract task and outcome from top-level fields
 */
function extractFromTopLevel(extractionResult: TaskOutcomeExtractionResult): {
  task: string;
  outcome: string;
} {
  const task =
    typeof extractionResult.task === 'string' ? extractionResult.task : '';
  const outcome =
    typeof extractionResult.outcome === 'string'
      ? extractionResult.outcome
      : '';
  return { task, outcome };
}

/**
 * Extract task and outcome from reasoning text using pattern matching
 */
function extractFromReasoning(reasoning: string): {
  task: string;
  outcome: string;
} {
  let task = '';
  let outcome = '';

  // Try to extract task and outcome from the reasoning text
  // Using simpler, safer regex patterns to avoid ReDoS risks
  const taskMatch = reasoning.match(
    /The user (?:was trying to|requested|wanted to|asked to|asked a question about|asked about|asked a specific question about) ([^.]+?)(?:\.|,|;|however|but|seeking|$)/i,
  );
  const outcomeMatch = reasoning.match(
    /(?:However, the actual outcome was|the outcome was|the result was|and the system provided|The system provided|The assistant provided|The output provided) ([^.]+?)(?:\.|;|therefore|so|indicating|$)/i,
  );

  // Special case patterns
  if (!task && !outcome) {
    const batteryMatch = reasoning.match(
      /The user requested (.+?)\. However, (.+?)\./i,
    );
    if (batteryMatch) {
      task = batteryMatch[1].trim();
      outcome = batteryMatch[2].trim();
    }
  }

  if (!task && !outcome) {
    const questionMatch = reasoning.match(
      /The user asked a question about ([^.]+)\. The system provided ([^.]+)\./i,
    );
    if (questionMatch) {
      task = `answer a question about ${questionMatch[1].trim()}`;
      outcome = questionMatch[2].trim();
    }
  }

  if (!task && !outcome) {
    const outputMatch = reasoning.match(
      /The user requested ([^.]+)\. The output provided ([^.]+)\./i,
    );
    if (outputMatch) {
      task = outputMatch[1].trim();
      outcome = outputMatch[2].trim();
    }
  }

  if (!task && !outcome) {
    const specificQuestionMatch = reasoning.match(
      /The user asked a specific question about ([^,]+), seeking ([^.]+)\. The system provided ([^.]+)\./i,
    );
    if (specificQuestionMatch) {
      task = `answer a question about ${specificQuestionMatch[1].trim()}`;
      outcome = specificQuestionMatch[3].trim();
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

  return { task, outcome };
}

/**
 * Extract task and outcome from LLM response using standardized approach
 *
 * This function implements a robust extraction strategy with multiple fallback mechanisms
 * to handle various LLM response formats and ensure consistent task/outcome extraction.
 *
 * STANDARDIZED EXTRACTION ORDER:
 * 1. metadata.task/outcome (LLM judge puts structured output here)
 * 2. top-level task/outcome (backward compatibility)
 * 3. nested metadata (legacy support)
 * 4. pattern matching from reasoning text
 * 5. JSON parsing fallbacks
 *
 * @param extractionResult - The LLM response containing task/outcome information
 * @returns Object containing extracted task and outcome strings
 * @throws Never throws - always returns valid strings (empty if extraction fails)
 */
function extractTaskAndOutcome(extractionResult: TaskOutcomeExtractionResult): {
  task: string;
  outcome: string;
} {
  const reasoning = extractionResult.reasoning || '';
  const metadata = (extractionResult.metadata || {}) as Record<string, unknown>;

  // Check if this is a fallback result (API error, etc.)
  if (metadata.fallback === true) {
    return { task: '', outcome: '' };
  }

  // STANDARDIZED EXTRACTION ORDER:
  // 1. Check metadata first (LLM judge puts structured output here)
  let { task, outcome } = extractFromMetadata(metadata);

  // 2. Fallback to top-level fields (for backward compatibility)
  if (!task || !outcome) {
    const topLevel = extractFromTopLevel(extractionResult);
    task = topLevel.task || task;
    outcome = topLevel.outcome || outcome;
  }

  // 3. Try to extract from metadata reasoning
  if ((!task || !outcome) && typeof metadata.reasoning === 'string') {
    const reasoningResult = extractFromReasoning(metadata.reasoning);
    task = reasoningResult.task || task;
    outcome = reasoningResult.outcome || outcome;
  }

  // 4. Fallback: try to parse JSON from reasoning
  if (!task || !outcome) {
    const parsedReasoning = tryParseJSON(reasoning);
    if (parsedReasoning) {
      if (!task && typeof parsedReasoning.task === 'string')
        task = parsedReasoning.task;
      if (!outcome && typeof parsedReasoning.outcome === 'string')
        outcome = parsedReasoning.outcome;
    }
  }

  // 5. Final fallback: try to parse the entire extraction result as JSON
  // This handles edge cases where the LLM returns unexpected structures
  if (!task || !outcome) {
    const parsed = extractionResult as Record<string, unknown>;
    if (!task && typeof parsed.task === 'string') task = parsed.task;
    if (!outcome && typeof parsed.outcome === 'string')
      outcome = parsed.outcome;
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
    const responseBody = log.ai_provider_request_log.response_body;

    if (typeof responseBody === 'string') {
      return responseBody;
    }

    // Handle structured response (like OpenAI chat completion response)
    if (typeof responseBody === 'object' && responseBody !== null) {
      const response = responseBody as Record<string, unknown>;

      // Try to extract the actual content from chat completion response
      if (
        response.choices &&
        Array.isArray(response.choices) &&
        response.choices.length > 0
      ) {
        const firstChoice = response.choices[0] as Record<string, unknown>;
        if (firstChoice.message && typeof firstChoice.message === 'object') {
          const message = firstChoice.message as Record<string, unknown>;
          if (typeof message.content === 'string') {
            return message.content;
          }
        }
      }

      // Fallback to JSON string
      return JSON.stringify(responseBody);
    }
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
      const requestBody = (
        log.ai_provider_request_log as Record<string, unknown>
      )?.request_body as Record<string, unknown>;

      let rawInput = params.input;

      if (!rawInput && requestBody) {
        // Try to get input from different possible fields
        const possibleInput =
          requestBody.input || requestBody.messages || requestBody.prompt;

        if (possibleInput) {
          // If we got messages array, convert it to a readable format
          if (Array.isArray(possibleInput)) {
            rawInput = possibleInput
              .map((msg: Record<string, unknown>) => {
                const role =
                  typeof msg.role === 'string' ? msg.role : 'unknown';
                const content =
                  msg.content !== undefined ? String(msg.content) : '';
                return `${role}: ${content}`;
              })
              .join('\n');
          } else if (typeof possibleInput === 'string') {
            rawInput = possibleInput;
          } else {
            rawInput = JSON.stringify(possibleInput);
          }
        }
      }

      // Ensure rawInput is a string
      if (!rawInput) {
        rawInput = '';
      }

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
  llmJudge: LLMJudge,
  evaluationRunId: string,
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

/**
 * Evaluate a single log for task completion using the standardized extraction method
 *
 * This function enables realtime evaluation of individual logs by leveraging the
 * standardized extractTaskAndOutcome() function for consistent task/outcome detection.
 *
 * @param evaluationRunId - The ID of the evaluation run to store results under
 * @param log - The log to evaluate for task completion
 * @param userDataStorageConnector - Storage connector for persisting evaluation results
 * @throws Throws if evaluation run cannot be retrieved or if storage operations fail
 */
export async function evaluateOneLogForTaskCompletion(
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
  await evaluateSingleLog(
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
}

/**
 * Task completion evaluation function - evaluates each log individually
 * and stores EvaluationOutput records, then returns average results
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

    // Process all logs and create EvaluationOutput records
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
