import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  chatCompleteParams,
  embedParams,
  responseTransformers,
} from '../open-ai-base';
import { dashscopeAPIConfig } from './api';

export const dashScopeConfig: AIProviderConfig = {
  api: dashscopeAPIConfig,
  [FunctionName.CHAT_COMPLETE]: chatCompleteParams([], { model: 'qwen-turbo' }),
  [FunctionName.EMBED]: embedParams([], { model: 'text-embedding-v1' }),
  responseTransforms: responseTransformers(AIProvider.DASHSCOPE, {
    chatComplete: true,
    embed: true,
  }),
};
