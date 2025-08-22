import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import rekaAIApiConfig from './api';
import {
  rekaAIChatCompleteConfig,
  rekaAIChatCompleteResponseTransform,
} from './chat-complete';

const rekaAIConfig: AIProviderConfig = {
  api: rekaAIApiConfig,
  [FunctionName.CHAT_COMPLETE]: rekaAIChatCompleteConfig,
  responseTransforms: {
    [FunctionName.CHAT_COMPLETE]: rekaAIChatCompleteResponseTransform,
  },
};

export default rekaAIConfig;
