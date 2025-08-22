import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import { chatCompleteParams, responseTransformers } from '../open-ai-base';
import { cerebrasAPIConfig } from './api';

export const cerebrasProviderAPIConfig: AIProviderConfig = {
  api: cerebrasAPIConfig,
  [FunctionName.CHAT_COMPLETE]: chatCompleteParams([
    'frequency_penalty',
    'logit_bias',
    'logprobs',
    'presence_penalty',
    'parallel_tool_calls',
    'service_tier',
  ]),
  responseTransforms: responseTransformers(AIProvider.CEREBRAS, {
    chatComplete: true,
  }),
};
