import type {
  ConversationCompletenessEvaluationParameters,
  ConversationCompletenessResult,
} from '@server/connectors/evaluations/conversation-completeness/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import { formatMessagesForExtraction } from '@server/utils/messages';
import { extractMessagesFromRequestData } from '@server/utils/reactive-agents/requests';
import { extractOutputFromResponseBody } from '@server/utils/reactive-agents/responses';
import type {
  ChatCompletionRequestData,
  ResponsesRequestData,
  StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';

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
  const raRequestData = produceReactiveAgentsRequestData(
    log.ai_provider_request_log.method,
    log.ai_provider_request_log.request_url,
    {},
    log.ai_provider_request_log.request_body,
  );
  const responseBody = ReactiveAgentsResponseBody.parse(
    log.ai_provider_request_log.response_body,
  );

  const messages = extractMessagesFromRequestData(
    raRequestData as
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
    evaluation_id: evaluation.id,
    method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
    score: result.score,
    extra_data: {
      reasoning: result.reasoning,
      metadata: result.metadata,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
    display_info: [
      {
        label: 'Reasoning',
        content: result.reasoning,
      },
      ...(result.metadata
        ? [
            {
              label: 'Analysis Details',
              content: JSON.stringify(result.metadata, null, 2),
            },
          ]
        : []),
    ],
  };

  return evaluationResult;
}
