import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import HuggingfaceAPIConfig from './api';
import {
  huggingfaceChatCompleteConfig,
  huggingfaceChatCompleteResponseTransform,
  huggingfaceChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  HuggingfaceCompleteConfig,
  huggingfaceCompleteResponseTransform,
  huggingfaceCompleteStreamChunkTransform,
} from './complete';

const HuggingfaceConfig: AIProviderConfig = {
  api: HuggingfaceAPIConfig,
  [FunctionName.COMPLETE]: HuggingfaceCompleteConfig,
  [FunctionName.CHAT_COMPLETE]: huggingfaceChatCompleteConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: huggingfaceCompleteResponseTransform,
    [FunctionName.STREAM_COMPLETE]: huggingfaceCompleteStreamChunkTransform,
    [FunctionName.CHAT_COMPLETE]: huggingfaceChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      huggingfaceChatCompleteStreamChunkTransform,
  },
};

export default HuggingfaceConfig;
