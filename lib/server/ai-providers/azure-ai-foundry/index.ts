import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import { azureAIInferenceAPI } from './api';
import {
  azureAIInferenceChatCompleteConfig,
  azureAIInferenceChatCompleteResponseTransform,
} from './chat-complete';
import {
  azureAIInferenceCompleteConfig,
  azureAIInferenceCompleteResponseTransform,
} from './complete';
import {
  azureAIInferenceEmbedConfig,
  azureAIInferenceEmbedResponseTransform,
} from './embed';

export const azureAIInferenceConfig: AIProviderConfig = {
  api: azureAIInferenceAPI,
  [FunctionName.COMPLETE]: azureAIInferenceCompleteConfig,
  [FunctionName.EMBED]: azureAIInferenceEmbedConfig,
  [FunctionName.CHAT_COMPLETE]: azureAIInferenceChatCompleteConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: azureAIInferenceCompleteResponseTransform(
      AIProvider.AZURE_AI,
    ),
    [FunctionName.CHAT_COMPLETE]: azureAIInferenceChatCompleteResponseTransform(
      AIProvider.AZURE_AI,
    ),
    [FunctionName.EMBED]: azureAIInferenceEmbedResponseTransform(
      AIProvider.AZURE_AI,
    ),
  },
};

export const githubModelAPiConfig: AIProviderConfig = {
  api: azureAIInferenceAPI,
  [FunctionName.COMPLETE]: azureAIInferenceCompleteConfig,
  [FunctionName.EMBED]: azureAIInferenceEmbedConfig,
  [FunctionName.CHAT_COMPLETE]: azureAIInferenceChatCompleteConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: azureAIInferenceCompleteResponseTransform(
      AIProvider.GITHUB,
    ),
    [FunctionName.CHAT_COMPLETE]: azureAIInferenceChatCompleteResponseTransform(
      AIProvider.GITHUB,
    ),
    [FunctionName.EMBED]: azureAIInferenceEmbedResponseTransform(
      AIProvider.GITHUB,
    ),
  },
};
