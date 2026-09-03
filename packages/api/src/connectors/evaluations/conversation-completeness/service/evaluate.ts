import type {
  ConversationCompletenessEvaluationParameters,
  ConversationCompletenessResult,
} from '@api/connectors/evaluations/conversation-completeness/types';
import { judgeOverrides } from '@api/connectors/evaluations/judge-overrides';
import { humanVerdictNote } from '@api/evaluations/human-verdict';
import {
  createLLMJudge,
  type LLMJudgeModelConfig,
} from '@api/evaluations/llm-judge';
import type {
  EvaluateLogOptions,
  UserDataStorageConnector,
} from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { resolveEvaluationModelConfig } from '@api/utils/evaluation-model-resolver';
import {
  extractSystemPromptFromMessages,
  formatMessagesForExtraction,
} from '@api/utils/messages';
import { extractMessagesFromRequestData } from '@api/utils/super-agents/requests';
import {
  extractOutputFromResponseBody,
  responseEndsInToolCalls,
} from '@api/utils/super-agents/responses';
import type {
  ChatCompletionRequestData,
  ResponsesRequestData,
  StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { SuperAgentsResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { produceSuperAgentsRequestData } from '@shared/utils/sa-request-data';

/**
 * Evaluate conversation completeness for a single log
 */
export async function evaluateConversationCompleteness(
  c: AppContext,
  log: Log,
  params: ConversationCompletenessEvaluationParameters,
  modelConfig?: LLMJudgeModelConfig | null,
  options?: EvaluateLogOptions,
): Promise<ConversationCompletenessResult> {
  // Create LLM judge instance with resolved model config
  const llmJudge = createLLMJudge(
    c,
    {
      temperature: params.temperature,
      ...judgeOverrides(params),
    },
    modelConfig ?? undefined,
  );

  // Extract messages and outputs using standard utilities
  const saRequestData = produceSuperAgentsRequestData(
    log.ai_provider_request_log.method,
    log.ai_provider_request_log.request_url,
    {},
    log.ai_provider_request_log.request_body,
  );
  const responseBody = SuperAgentsResponseBody.parse(
    log.ai_provider_request_log.response_body,
  );

  const messages = extractMessagesFromRequestData(
    saRequestData as
      | ChatCompletionRequestData
      | StreamChatCompletionRequestData
      | ResponsesRequestData,
  );
  const input = formatMessagesForExtraction(messages);
  const output = extractOutputFromResponseBody(responseBody);

  // Without the system prompt the judge cannot know what the assistant's job
  // was. A title generator handed "review the code changes" as material gets
  // judged for never reviewing any code -- the quoted conversation reads as
  // the user's intention unless the role says it is input to transform.
  const role = extractSystemPromptFromMessages(messages);
  const roleSection = role
    ? `THE ASSISTANT'S ROLE (its system prompt): ${role} `
    : '';

  // A turn that ends by invoking tools is not a finished conversation: the
  // tool results and the eventual answer arrive in later requests. Judging
  // it by the satisfaction formula scores every intermediate turn of an
  // agentic task near zero regardless of quality, so such turns are judged
  // as progress instead.
  const inFlight = responseEndsInToolCalls(responseBody);

  // A run triggered by thumbs up/down carries the human's verdict: the
  // judge re-derives what makes the response good or bad with it anchored.
  const verdictSection = options?.humanVerdict
    ? ` ${humanVerdictNote(options.humanVerdict, options.humanVerdictReason)}`
    : '';

  // Create a simple evaluation prompt that won't trigger template-based evaluation
  const evaluationText = inFlight
    ? `Analyze the following conversation for completeness quality. ${roleSection}CONVERSATION: ${input} ASSISTANT RESPONSE: ${output} NOTE: the assistant's turn ends by invoking tools, so this conversation is still in progress -- the tool results, and the assistant's eventual answer, arrive in later requests. Do not penalize the absence of the final deliverable; it is not due in this turn. Judge instead whether the assistant is progressing appropriately: every user intention recognized, the tool calls plausibly in service of them, nothing ignored and no effort off on a tangent. A turn making sound progress on every intention deserves a high score.${verdictSection} Provide a score between 0 and 1 with detailed reasoning for your analysis.`
    : `Analyze the following conversation for completeness quality. ${roleSection}CONVERSATION: ${input} ASSISTANT RESPONSE: ${output} Consider how well the assistant completes the conversation by satisfying user needs, where the assistant's role defines what satisfying them means: when the role is to transform or label the input (produce a title, summarize, translate, classify), requests quoted inside that input are material to work on, not intentions for the assistant to fulfill. Look for: Whether all user intentions were identified and addressed, if the conversation feels complete and resolved, whether there are any unresolved user requests, and the overall satisfaction of user needs throughout the conversation.${verdictSection} Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

  // Evaluate using LLM judge with conversation completeness criteria
  const result = await llmJudge.evaluate({
    text: evaluationText,
    evaluationCriteria: {
      criteria: inFlight
        ? [
            "Interpret the conversation in light of the assistant's role: its system prompt defines the job being judged",
            'Extract all user intentions from the conversation',
            'Identify what the user is trying to accomplish',
            'The turn ends in tool calls, so the conversation is still in progress: assess whether the assistant is making appropriate progress toward each intention',
            'Check that no user intention is ignored and no effort is off on a tangent',
            'Score the quality of the progress, not the absence of the final answer -- it is not due in this turn',
          ]
        : [
            "Interpret the conversation in light of the assistant's role: when the role is to transform or label the input, requests quoted inside the input are material, not intentions to fulfill",
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
  c: AppContext,
  evaluation: SkillOptimizationEvaluation,
  log: Log,
  storageConnector: UserDataStorageConnector,
  options?: EvaluateLogOptions,
): Promise<SkillOptimizationEvaluationResult> {
  const params =
    evaluation.params as ConversationCompletenessEvaluationParameters;

  const start_time = Date.now();

  // Resolve model configuration from evaluation.model_id or system settings
  const modelConfig = await resolveEvaluationModelConfig(
    c,
    evaluation,
    storageConnector,
  );

  // Evaluate the log using the existing function
  const result = await evaluateConversationCompleteness(
    c,
    log,
    params,
    modelConfig,
    options,
  );

  const execution_time = Date.now() - start_time;
  const judgeModelName = modelConfig?.model ?? null;
  const judgeModelProvider = modelConfig?.provider ?? null;

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
    judge_model_name: judgeModelName,
    judge_model_provider: judgeModelProvider,
  };

  return evaluationResult;
}
