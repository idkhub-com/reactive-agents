import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import FireworksAIAPIConfig from './api';
import {
  FireworksAIChatCompleteConfig,
  FireworksAIChatCompleteResponseTransform,
  FireworksAIChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  FireworksAICompleteConfig,
  FireworksAICompleteResponseTransform,
  FireworksAICompleteStreamChunkTransform,
} from './complete';
import {
  FireworksAIEmbedConfig,
  FireworksAIEmbedResponseTransform,
} from './embed';
import {
  FireworksAIImageGenerateConfig,
  FireworksAIImageGenerateResponseTransform,
} from './image-generate';
import { FireworksFileListResponseTransform } from './list-files';
import { fireworksFileRetrieveResponseTransform } from './retrieve-file';

const FireworksAIConfig: AIProviderConfig = {
  api: FireworksAIAPIConfig,
  [FunctionName.COMPLETE]: FireworksAICompleteConfig,
  [FunctionName.CHAT_COMPLETE]: FireworksAIChatCompleteConfig,
  [FunctionName.EMBED]: FireworksAIEmbedConfig,
  [FunctionName.GENERATE_IMAGE]: FireworksAIImageGenerateConfig,
  responseTransforms: {
    [FunctionName.COMPLETE]: FireworksAICompleteResponseTransform,
    [FunctionName.STREAM_COMPLETE]: FireworksAICompleteStreamChunkTransform,
    [FunctionName.CHAT_COMPLETE]: FireworksAIChatCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]:
      FireworksAIChatCompleteStreamChunkTransform,
    [FunctionName.EMBED]: FireworksAIEmbedResponseTransform,
    [FunctionName.GENERATE_IMAGE]: FireworksAIImageGenerateResponseTransform,
    [FunctionName.LIST_FILES]: FireworksFileListResponseTransform,
    [FunctionName.RETRIEVE_FILE]: fireworksFileRetrieveResponseTransform,
  },
};

export default FireworksAIConfig;
