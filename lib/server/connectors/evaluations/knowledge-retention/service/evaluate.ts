import type { KnowledgeRetentionAverageResult } from '@server/connectors/evaluations/types/knowledge-retention';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
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
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { KnowledgeRetentionEvaluationParameters } from '@shared/types/idkhub/evaluations/knowledge-retention';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';

/**
 * Extract context and response from log with standardized fallback logic
 * @param log The log to extract content from
 * @returns Object containing context and response strings
 */
function extractLogContent(log: Log): {
  context: string;
  response: string;
} {
  // Input sanitization and length limits
  const MAX_CONTENT_LENGTH = 10000; // 10KB limit to prevent memory issues

  function sanitizeContent(content: unknown): string {
    if (typeof content === 'string') {
      return content.length > MAX_CONTENT_LENGTH
        ? `${content.substring(0, MAX_CONTENT_LENGTH)}... [truncated]`
        : content;
    }

    try {
      const jsonString = JSON.stringify(content);
      return jsonString.length > MAX_CONTENT_LENGTH
        ? `${jsonString.substring(0, MAX_CONTENT_LENGTH)}... [truncated]`
        : jsonString;
    } catch (_error) {
      return '[Error: Could not serialize content]';
    }
  }
  // Extract context with priority order
  const contextFields = ['context', 'text', 'input', 'prompt', 'message'];
  let context = '';

  const requestBody = (log.ai_provider_request_log as Record<string, unknown>)
    ?.request_body as Record<string, unknown>;
  for (const field of contextFields) {
    const value = requestBody?.[field];
    if (value) {
      context = sanitizeContent(value);
      break;
    }
  }

  // Fallback to entire request_body if no specific field found
  if (!context && requestBody) {
    context = sanitizeContent(requestBody);
  }

  // Extract response with priority order
  const responseFields = ['text', 'response', 'output', 'result'];
  let response = '';

  // Try ground_truth first
  const groundTruth = log.metadata?.ground_truth as Record<string, unknown>;
  for (const field of responseFields) {
    const value = groundTruth?.[field];
    if (value) {
      response = sanitizeContent(value);
      break;
    }
  }

  // Try metadata if no ground_truth found
  if (!response) {
    for (const field of responseFields) {
      const value = log.metadata?.[field];
      if (value) {
        response = sanitizeContent(value);
        break;
      }
    }
  }

  // Fallback to entire ground_truth if no specific field found
  if (!response && log.metadata?.ground_truth) {
    response = sanitizeContent(log.metadata.ground_truth);
  }

  // Final fallback to entire log
  if (!context) {
    context = sanitizeContent(log);
  }
  if (!response) {
    response = sanitizeContent(log);
  }

  return { context, response };
}

/**
 * Evaluate a single log for knowledge retention
 */
async function evaluateSingleLog(
  log: Log,
  params: KnowledgeRetentionEvaluationParameters,
  llm_judge: LLMJudge,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput> {
  const start_time = Date.now();

  try {
    // Extract context and response using standardized utility function
    const { context, response } = extractLogContent(log);

    if (!context || !response) {
      throw new Error('Missing context or response in log');
    }

    // Create evaluation prompt that avoids triggering template detection
    const evaluationText = `Analyze the following conversation for knowledge retention quality. CONVERSATION: ${context} ASSISTANT RESPONSE: ${response} Consider how well the assistant retains and recalls information provided by the user throughout the conversation. Look for: Knowledge retention vs. knowledge attrition patterns, consistency in recalling previously mentioned information, ability to maintain context across multiple turns, and specific instances where information was retained or lost. For single-turn conversations, assess if the assistant would be able to retain the information for future reference. Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

    // Evaluate using LLM judge
    const result = await llm_judge.evaluate({
      text: evaluationText,
      outputFormat: 'json',
    });

    const execution_time = Date.now() - start_time;

    // Create evaluation output
    const evaluationOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
      output: {
        score: result.score,
        reasoning: result.reasoning,
        passed: result.score >= (params.threshold || 0.6), // Use parameter threshold
        threshold: params.threshold || 0.6,
        knowledgeRetention: result.metadata?.knowledgeRetention,
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
        ...(params.verbose_mode && { verbose_logs: result.metadata }),
      },
      score: result.score,
      metadata: {
        evaluation_method: 'knowledge_retention',
        parameters: params,
        knowledgeRetention: result.metadata?.knowledgeRetention,
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
  } catch (error) {
    console.error('Error evaluating log:', error);
    const execution_time = Date.now() - start_time;

    // Sanitize error message to prevent information leakage
    const sanitizedErrorMessage =
      error instanceof Error
        ? error.message.length > 200
          ? `${error.message.substring(0, 200)}... [truncated]`
          : error.message
        : 'Unknown error occurred';

    const evaluationOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
      output: {
        error: true,
        error_message: sanitizedErrorMessage,
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
      },
      score: null, // Use null instead of 0 to avoid skewing results
      metadata: {
        error: true,
        error_message: sanitizedErrorMessage,
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
  params: KnowledgeRetentionEvaluationParameters,
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
 * Knowledge retention evaluation function - evaluates each log individually
 * and stores EvaluationOutput records, then returns average results
 */
export async function evaluateKnowledgeRetention(
  input: DatasetQueryParams,
  params: KnowledgeRetentionEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: KnowledgeRetentionAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const start_time = Date.now();

  // Create evaluation run
  const evaluationRunParams: EvaluationRunCreateParams = {
    dataset_id: input.id!,
    agent_id: params.agent_id!,
    evaluation_method: EvaluationMethodName.KNOWLEDGE_RETENTION,
    name: evalRunOptions?.name || 'Knowledge Retention Evaluation',
    description:
      evalRunOptions?.description || 'Evaluating knowledge retention quality',
    metadata: {
      parameters: params,
    },
  };

  const evaluationRun =
    await userDataStorageConnector.createEvaluationRun(evaluationRunParams);

  try {
    // Get logs
    const logs = await userDataStorageConnector.getDatasetLogs(input.id!, {
      limit: input.limit || 10,
      offset: input.offset || 0,
    });

    if (logs.length === 0) {
      throw new Error('No logs found for evaluation');
    }

    // Create LLM judge
    const llm_judge = createLLMJudge({
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      timeout: params.timeout,
    });

    // Process logs
    const results = await processLogsInBatches(
      logs,
      params,
      llm_judge,
      evaluationRun.id,
      userDataStorageConnector,
    );

    // Calculate statistics
    const scores = results
      .map((r) => r.score)
      .filter((s) => s !== null && s !== undefined);
    const threshold = params.threshold || 0.6;
    const passedLogs = scores.filter((s) => s >= threshold).length;
    const failedLogs = scores.length - passedLogs;

    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Calculate knowledge retention metrics - simplified for now
    let totalAssistantTurns = 0;
    let assistantTurnsWithoutAttrition = 0;
    let totalRetentionAccuracy = 0;
    let totalContextConsistency = 0;
    let knowledgeRetentionCount = 0;

    for (const result of results) {
      const kr = result.metadata?.knowledgeRetention as
        | {
            extractedKnowledge?: string[];
            assistantTurnsWithoutAttrition?: number;
            totalAssistantTurns?: number;
            knowledgeAttritionDetails?: string[];
            retentionAccuracy?: number;
            contextConsistency?: number;
          }
        | undefined;

      if (kr) {
        totalAssistantTurns += kr.totalAssistantTurns || 0;
        assistantTurnsWithoutAttrition +=
          kr.assistantTurnsWithoutAttrition || 0;
        totalRetentionAccuracy += kr.retentionAccuracy || 0;
        totalContextConsistency += kr.contextConsistency || 0;
        knowledgeRetentionCount++;
      }
    }

    const averageRetentionAccuracy =
      knowledgeRetentionCount > 0
        ? totalRetentionAccuracy / knowledgeRetentionCount
        : 0;
    const averageContextConsistency =
      knowledgeRetentionCount > 0
        ? totalContextConsistency / knowledgeRetentionCount
        : 0;

    const overallRetentionRate =
      totalAssistantTurns > 0
        ? assistantTurnsWithoutAttrition / totalAssistantTurns
        : 0;

    const execution_time = Date.now() - start_time;

    const averageResult: KnowledgeRetentionAverageResult = {
      average_score: averageScore,
      total_logs: logs.length,
      passed_count: passedLogs,
      failed_count: failedLogs,
      threshold_used: params.threshold || 0.6,
      evaluation_run_id: evaluationRun.id,
    };

    // Update evaluation run with results
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.COMPLETED,
      results: {
        total_logs: logs.length,
        passed_count: passedLogs,
        failed_count: failedLogs,
        average_score: averageScore,
        threshold_used: params.threshold || 0.6,
        evaluation_outputs: results.map((output) => output.id),
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
        // Additional knowledge retention specific metrics
        average_retention_accuracy: averageRetentionAccuracy,
        average_context_consistency: averageContextConsistency,
        total_assistant_turns: totalAssistantTurns,
        assistant_turns_without_attrition: assistantTurnsWithoutAttrition,
        overall_retention_rate: overallRetentionRate,
      },
      metadata: {
        ...evaluationRun.metadata,
        total_logs: logs.length,
        passed_count: passedLogs,
        failed_count: failedLogs,
        average_score: averageScore,
        threshold_used: params.threshold || 0.6,
        evaluation_outputs: results.map((output) => output.id),
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
        // Additional knowledge retention specific metrics
        average_retention_accuracy: averageRetentionAccuracy,
        average_context_consistency: averageContextConsistency,
        total_assistant_turns: totalAssistantTurns,
        assistant_turns_without_attrition: assistantTurnsWithoutAttrition,
        overall_retention_rate: overallRetentionRate,
      },
      completed_at: new Date().toISOString(),
    });

    return { averageResult, evaluationRun };
  } catch (error) {
    console.error('Error in knowledge retention evaluation:', error);

    // Update evaluation run with error status
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}
