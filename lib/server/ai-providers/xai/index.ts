import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  createModelResponseParams,
  openAICreateModelResponseTransformer,
  openAIDeleteModelResponseTransformer,
  openAIGetModelResponseTransformer,
  openAIListInputItemsResponseTransformer,
} from '../open-ai-base';
import { xaiAPIConfig } from './api';
import {
  xaiChatCompleteConfig,
  xaiChatCompleteResponseTransform,
} from './chat-complete';

export const xaiConfig: AIProviderConfig = {
  api: xaiAPIConfig,

  // Chat Completions API
  [FunctionName.CHAT_COMPLETE]: xaiChatCompleteConfig,

  // Responses API (using OpenAI base implementation)
  [FunctionName.CREATE_MODEL_RESPONSE]: createModelResponseParams([]),

  responseTransforms: {
    // Chat Completions API
    [FunctionName.CHAT_COMPLETE]: xaiChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]: xaiChatCompleteResponseTransform,

    // Responses API
    [FunctionName.CREATE_MODEL_RESPONSE]: openAICreateModelResponseTransformer(
      AIProvider.XAI,
    ),
    [FunctionName.GET_MODEL_RESPONSE]: openAIGetModelResponseTransformer(
      AIProvider.XAI,
    ),
    [FunctionName.DELETE_MODEL_RESPONSE]: openAIDeleteModelResponseTransformer(
      AIProvider.XAI,
    ),
    [FunctionName.LIST_RESPONSE_INPUT_ITEMS]:
      openAIListInputItemsResponseTransformer(AIProvider.XAI),
  },
};
