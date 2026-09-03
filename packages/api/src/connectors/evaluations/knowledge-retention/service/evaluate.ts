import { judgeOverrides } from '@api/connectors/evaluations/judge-overrides';
import type { KnowledgeRetentionEvaluationParameters } from '@api/connectors/evaluations/knowledge-retention/types';
import { humanVerdictNote } from '@api/evaluations/human-verdict';
import { createLLMJudge } from '@api/evaluations/llm-judge';
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
import { extractOutputFromResponseBody } from '@api/utils/super-agents/responses';
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

export async function evaluateLog(
  c: AppContext,
  evaluation: SkillOptimizationEvaluation,
  log: Log,
  storageConnector: UserDataStorageConnector,
  options?: EvaluateLogOptions,
): Promise<SkillOptimizationEvaluationResult> {
  const params = evaluation.params as KnowledgeRetentionEvaluationParameters;

  // Resolve model configuration from evaluation.model_id or system settings
  const modelConfig = await resolveEvaluationModelConfig(
    c,
    evaluation,
    storageConnector,
  );

  const llmJudge = createLLMJudge(
    c,
    {
      temperature: params.temperature,
      ...judgeOverrides(params),
    },
    modelConfig ?? undefined,
  );

  const start_time = Date.now();

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

  // The judge is shown the assistant's role: without it a conversation the
  // assistant was told to transform (title it, summarize it) reads as a
  // request the assistant failed to remember anything about.
  const role = extractSystemPromptFromMessages(messages);
  const roleSection = role
    ? `THE ASSISTANT'S ROLE (its system prompt): ${role} `
    : '';

  // A feedback-triggered run carries the human's verdict as an anchor.
  const verdictSection = options?.humanVerdict
    ? ` ${humanVerdictNote(options.humanVerdict, options.humanVerdictReason)}`
    : '';

  const evaluationText = `Analyze the following conversation for knowledge retention quality. ${roleSection}CONVERSATION: ${input} ASSISTANT RESPONSE: ${output} Consider how well the assistant retains and recalls information provided by the user throughout the conversation, judged against what its role requires it to carry forward. Look for: Knowledge retention vs. knowledge attrition patterns, consistency in recalling previously mentioned information, ability to maintain context across multiple turns, and specific instances where information was retained or lost. For single-turn conversations, assess if the assistant would be able to retain the information for future reference.${verdictSection} Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

  // Explicit criteria pin the scored judge path. Without them the judge
  // re-splits this text at its first blank line -- which lives inside the
  // conversation once it has two messages -- and can read what comes back
  // as an extraction, which scores 1.0 no matter what the judge actually
  // answered.
  const result = await llmJudge.evaluate({
    text: evaluationText,
    evaluationCriteria: {
      criteria: [
        "Interpret the conversation in light of the assistant's role: its system prompt defines what information matters",
        'Check for knowledge retention versus knowledge attrition across the conversation',
        'Check consistency in recalling previously mentioned information',
        'Assess the ability to maintain context across multiple turns',
        'For single-turn conversations, assess whether the response preserves the information the role needs going forward',
      ],
    },
  });

  const execution_time = Date.now() - start_time;
  const judgeModelName = modelConfig?.model ?? null;
  const judgeModelProvider = modelConfig?.provider ?? null;

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
    judge_model_name: judgeModelName,
    judge_model_provider: judgeModelProvider,
  };

  return evaluationResult;
}
