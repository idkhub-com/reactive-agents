import type { KnowledgeRetentionEvaluationParameters } from '@server/connectors/evaluations/knowledge-retention/types';
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

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
): Promise<SkillOptimizationEvaluationResult> {
  const params = evaluation.params as KnowledgeRetentionEvaluationParameters;

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  const start_time = Date.now();

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

  // Create evaluation prompt
  const evaluationText = `Analyze the following conversation for knowledge retention quality. CONVERSATION: ${input} ASSISTANT RESPONSE: ${output} Consider how well the assistant retains and recalls information provided by the user throughout the conversation. Look for: Knowledge retention vs. knowledge attrition patterns, consistency in recalling previously mentioned information, ability to maintain context across multiple turns, and specific instances where information was retained or lost. For single-turn conversations, assess if the assistant would be able to retain the information for future reference. Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

  // Evaluate using LLM judge
  const result = await llmJudge.evaluate({
    text: evaluationText,
    outputFormat: 'json',
  });

  const execution_time = Date.now() - start_time;

  const evaluationResult: SkillOptimizationEvaluationResult = {
    evaluation_id: evaluation.id,
    method: EvaluationMethodName.KNOWLEDGE_RETENTION,
    score: result.score,
    extra_data: {
      reasoning: result.reasoning,
      knowledgeRetention: result.metadata?.knowledgeRetention,
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
      ...(result.metadata?.knowledgeRetention
        ? [
            {
              label: 'Knowledge Retention Analysis',
              content: JSON.stringify(
                result.metadata.knowledgeRetention,
                null,
                2,
              ),
            },
          ]
        : []),
    ],
  };

  return evaluationResult;
}
