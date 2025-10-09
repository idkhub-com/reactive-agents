import type {
  ConversationCompletenessAverageResult,
  ConversationCompletenessResult,
} from '@server/connectors/evaluations/conversation-completeness/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import { updateEvaluationRunWithStatistics } from '@server/evaluations/utils/evaluation-run-updater';
import {
  calculateEvaluationStatistics,
  extractEvaluationOutputIds,
} from '@server/evaluations/utils/statistics';
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
  LogOutput,
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type { ConversationCompletenessEvaluationParameters } from '@shared/types/idkhub/evaluations/conversation-completeness';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';

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
  });

  // Extract messages and outputs using standard utilities
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

  // Create a simple evaluation prompt that won't trigger template-based evaluation
  const evaluationText = `Analyze the following conversation for completeness quality. CONVERSATION: ${input} ASSISTANT RESPONSE: ${output} Consider how well the assistant completes the conversation by satisfying user needs. Look for: Whether all user intentions were identified and addressed, if the conversation feels complete and resolved, whether there are any unresolved user requests, and the overall satisfaction of user needs throughout the conversation. Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

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
  const logOutput = await userDataStorageConnector.createLogOutput(
    evaluationRunId,
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
        evaluation_run_id: evaluationRunId,
      },
      metadata: result.metadata || {},
    },
  );

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

  return logOutput;
}

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
): Promise<SkillOptimizationEvaluationResult> {
  const params =
    evaluation.params as ConversationCompletenessEvaluationParameters;

  const start_time = Date.now();

  // Evaluate the log using the existing function
  const result = await evaluateConversationCompleteness(log, params);

  const execution_time = Date.now() - start_time;

  const evaluationResult: SkillOptimizationEvaluationResult = {
    method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
    score: result.score,
    extra_data: {
      reasoning: result.reasoning,
      metadata: result.metadata,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
  };

  return evaluationResult;
}
