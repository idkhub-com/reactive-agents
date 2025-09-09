import type {
  ConversationCompletenessAverageResult,
  ConversationCompletenessEvaluationParameters,
  ConversationCompletenessResult,
} from '@server/connectors/evaluations/conversation-completeness/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import { updateEvaluationRunWithStatistics } from '@server/evaluations/utils/evaluation-run-updater';
import {
  calculateEvaluationStatistics,
  extractEvaluationOutputIds,
} from '@server/evaluations/utils/statistics';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

/**
 * Evaluate conversation completeness for a single log
 */
export async function evaluateConversationCompleteness(
  log: Log,
  params: ConversationCompletenessEvaluationParameters,
): Promise<ConversationCompletenessResult> {
  // Create LLM judge instance
  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
    timeout: params.timeout,
  });

  // Extract context and response from log
  let context = '';
  let response = '';

  // Try to extract context from various possible fields
  const requestBody = (log.ai_provider_request_log as Record<string, unknown>)
    ?.request_body as Record<string, unknown>;
  if (typeof requestBody?.context === 'string') {
    context = requestBody.context;
  } else if (typeof requestBody?.text === 'string') {
    context = requestBody.text;
  } else if (typeof requestBody?.prompt === 'string') {
    context = requestBody.prompt;
  } else if (typeof requestBody?.message === 'string') {
    context = requestBody.message;
  } else {
    context = JSON.stringify(requestBody);
  }

  // Try to extract response from various possible fields
  const groundTruth = log.metadata?.ground_truth as Record<string, unknown>;
  if (typeof groundTruth?.text === 'string') {
    response = groundTruth.text;
  } else if (typeof groundTruth?.response === 'string') {
    response = groundTruth.response;
  } else if (typeof groundTruth?.output === 'string') {
    response = groundTruth.output;
  } else if (typeof groundTruth?.result === 'string') {
    response = groundTruth.result;
  } else if (typeof log.metadata?.response === 'string') {
    response = log.metadata.response;
  } else {
    response = JSON.stringify(groundTruth);
  }

  // Validate that we have both context and response
  if (!context || !response) {
    throw new Error('Missing context or response in log');
  }

  // Create a simple evaluation prompt that won't trigger template-based evaluation
  const evaluationText = `Analyze the following conversation for completeness quality. CONVERSATION: ${context} ASSISTANT RESPONSE: ${response} Consider how well the assistant completes the conversation by satisfying user needs. Look for: Whether all user intentions were identified and addressed, if the conversation feels complete and resolved, whether there are any unresolved user requests, and the overall satisfaction of user needs throughout the conversation. Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

  // Evaluate using LLM judge with conversation completeness criteria
  const result = await llmJudge.evaluate({
    text: evaluationText,
    outputFormat: 'json',
    evaluationCriteria: {
      criteria: [
        'Extract all user intentions from the conversation',
        'Identify what the user is trying to accomplish',
        'Assess whether each user intention was satisfied by the assistant',
        'Evaluate the completeness of the conversation in addressing user needs',
        'Check for unresolved user requests or incomplete responses',
        'Calculate the conversation completeness score based on the formula: (Number of Satisfied User Intentions) / (Total Number of User Intentions)',
      ],
    },
  });

  return {
    score: result.score,
    reasoning: result.reasoning,
    metadata: result.metadata,
  };
}

/**
 * Evaluate conversation completeness for a batch of logs
 */
export async function evaluateConversationCompletenessBatch(
  logs: Log[],
  params: ConversationCompletenessEvaluationParameters,
): Promise<ConversationCompletenessResult[]> {
  const results: ConversationCompletenessResult[] = [];

  for (const log of logs) {
    try {
      const result = await evaluateConversationCompleteness(log, params);
      results.push(result);
    } catch (error) {
      console.error(
        `Error evaluating conversation completeness for log ${log.id}:`,
        error,
      );
      results.push({
        score: 0,
        reasoning: `Evaluation failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { error: true },
      });
    }
  }

  return results;
}

/**
 * Main conversation completeness evaluation function
 */
export async function evaluateConversationCompletenessMain(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: ConversationCompletenessEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: ConversationCompletenessAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const start_time = Date.now();

  // Create evaluation run
  const evaluationRun = await userDataStorageConnector.createEvaluationRun({
    agent_id: agentId,
    skill_id: skillId,
    dataset_id: datasetId,
    evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
    name: evalRunOptions.name || 'Conversation Completeness Evaluation',
    description:
      evalRunOptions.description ||
      'Evaluating conversation completeness quality',
    metadata: { parameters: params },
  });

  try {
    // Get logs
    const logs = await userDataStorageConnector.getDatasetLogs(datasetId!, {});

    if (logs.length === 0) {
      throw new Error('No logs found for evaluation');
    }

    // Evaluate all logs
    const results = await evaluateConversationCompletenessBatch(logs, params);

    // Create evaluation outputs
    const evaluationOutputs = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const log = logs[i];

      const output = await userDataStorageConnector.createLogOutput(
        evaluationRun.id,
        {
          log_id: log.id,
          score: result.score,
          output: {
            score: result.score,
            reasoning: result.reasoning,
            passed: result.score >= (params.threshold || 0.5),
            threshold: params.threshold || 0.5,
            execution_time_ms: 0,
            evaluated_at: new Date().toISOString(),
            evaluation_run_id: evaluationRun.id,
          },
          metadata: result.metadata || {},
        },
      );

      evaluationOutputs.push(output);
    }

    const execution_time = Date.now() - start_time;
    const threshold = params.threshold || 0.5;

    // Calculate statistics using shared utility
    const statistics = calculateEvaluationStatistics(
      evaluationOutputs,
      threshold,
    );
    const evaluationOutputIds = extractEvaluationOutputIds(evaluationOutputs);

    const averageResult: ConversationCompletenessAverageResult = {
      average_score: statistics.averageScore,
      total_logs: statistics.totalLogs,
      passed_count: statistics.passedCount,
      failed_count: statistics.failedCount,
      threshold_used: threshold,
      evaluation_run_id: evaluationRun.id,
    };

    // Update evaluation run with results using shared utility
    await updateEvaluationRunWithStatistics({
      evaluationRunId: evaluationRun.id,
      statistics,
      threshold,
      evaluationOutputIds,
      userDataStorageConnector,
      additionalResults: {
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
      },
      additionalMetadata: {
        completed_at: new Date().toISOString(),
      },
      preserveExistingResults: true,
      status: EvaluationRunStatus.COMPLETED,
      completedAt: new Date().toISOString(),
    });

    return { averageResult, evaluationRun };
  } catch (error) {
    // Update evaluation run with error
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        ...evaluationRun.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString(),
      },
    });

    throw error;
  }
}

export async function evaluateOneLogForConversationCompleteness(
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

  const params = (evaluationRun.metadata?.parameters ||
    {}) as ConversationCompletenessEvaluationParameters;

  // Convert IdkRequestLog to Log format for compatibility
  const logForEvaluation: Log = log as Log;

  // Evaluate the single log
  const result = await evaluateConversationCompleteness(
    logForEvaluation,
    params,
  );

  // Create log output
  await userDataStorageConnector.createLogOutput(evaluationRunId, {
    log_id: log.id,
    score: result.score,
    output: {
      score: result.score,
      reasoning: result.reasoning,
      passed: result.score >= (params.threshold || 0.5),
      threshold: params.threshold || 0.5,
      execution_time_ms: 0,
      evaluated_at: new Date().toISOString(),
      evaluation_run_id: evaluationRunId,
    },
    metadata: result.metadata || {},
  });

  // Get all log outputs for this evaluation run to calculate new average
  const allLogOutputs = await userDataStorageConnector.getLogOutputs(
    evaluationRunId,
    {},
  );

  // Calculate statistics and update evaluation run using shared utilities
  const threshold = params.threshold || 0.5;
  const statistics = calculateEvaluationStatistics(allLogOutputs, threshold);
  const evaluationOutputIds = extractEvaluationOutputIds(allLogOutputs);

  await updateEvaluationRunWithStatistics({
    evaluationRunId,
    statistics,
    threshold,
    evaluationOutputIds,
    userDataStorageConnector,
  });
}
