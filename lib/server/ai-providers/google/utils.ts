import {
  GoogleMessageRole,
  GoogleToolChoiceType,
} from '@server/ai-providers/google/types';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { ChatCompletionToolChoice } from '@shared/types/api/routes/shared/tools';

export const FinishReasonsGeminiToReactiveAgents: {
  [key: string]: ChatCompletionFinishReason;
} = {
  FINISH_REASON_UNSPECIFIED: ChatCompletionFinishReason.STOP,
  STOP: ChatCompletionFinishReason.STOP,
  MAX_TOKENS: ChatCompletionFinishReason.LENGTH,
  UNEXPECTED_TOOL_CALL: ChatCompletionFinishReason.TOOL_CALLS,
  TOO_MANY_TOOL_CALLS: ChatCompletionFinishReason.TOOL_CALLS,
  MALFORMED_FUNCTION_CALL: ChatCompletionFinishReason.FUNCTION_CALL,
  SAFETY: ChatCompletionFinishReason.CONTENT_FILTER,
  RECITATION: ChatCompletionFinishReason.CONTENT_FILTER,
  LANGUAGE: ChatCompletionFinishReason.CONTENT_FILTER,
  OTHER: ChatCompletionFinishReason.CONTENT_FILTER,
  BLOCKLIST: ChatCompletionFinishReason.CONTENT_FILTER,
  PROHIBITED_CONTENT: ChatCompletionFinishReason.CONTENT_FILTER,
  SPII: ChatCompletionFinishReason.CONTENT_FILTER,
  IMAGE_SAFETY: ChatCompletionFinishReason.CONTENT_FILTER,
};

export const RoleReactiveAgentsToGemini: Record<
  ChatCompletionMessageRole,
  GoogleMessageRole
> = {
  [ChatCompletionMessageRole.ASSISTANT]: GoogleMessageRole.MODEL,
  [ChatCompletionMessageRole.DEVELOPER]: GoogleMessageRole.SYSTEM,
  [ChatCompletionMessageRole.SYSTEM]: GoogleMessageRole.SYSTEM,
  [ChatCompletionMessageRole.TOOL]: GoogleMessageRole.FUNCTION,
  [ChatCompletionMessageRole.FUNCTION]: GoogleMessageRole.FUNCTION,
  [ChatCompletionMessageRole.USER]: GoogleMessageRole.USER,
};

const ToolChoiceReactiveAgentsStringToGemini: Record<
  string,
  GoogleToolChoiceType
> = {
  auto: GoogleToolChoiceType.AUTO,
  none: GoogleToolChoiceType.NONE,
  required: GoogleToolChoiceType.ANY,
};

export const transformToolChoiceReactiveAgentsToGemini = (
  tool_choice: ChatCompletionToolChoice,
): GoogleToolChoiceType | undefined => {
  if (typeof tool_choice === 'object' && tool_choice.type === 'function')
    return GoogleToolChoiceType.ANY;
  if (typeof tool_choice === 'string') {
    return ToolChoiceReactiveAgentsStringToGemini[tool_choice];
  }
  return undefined;
};
