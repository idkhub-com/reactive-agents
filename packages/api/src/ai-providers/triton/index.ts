import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import tritonAPIConfig from './api';
import {
  tritonCompleteConfig,
  tritonCompleteResponseTransform,
} from './complete';

export const tritonConfig: AIProviderConfig = {
  api: tritonAPIConfig,

  // Completions API
  [FunctionName.COMPLETE]: tritonCompleteConfig,
  [FunctionName.CHAT_COMPLETE]: tritonCompleteConfig, // Use same config for chat completion

  responseTransforms: {
    [FunctionName.COMPLETE]: tritonCompleteResponseTransform,
    [FunctionName.STREAM_COMPLETE]: tritonCompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: tritonCompleteResponseTransform,
    [FunctionName.STREAM_CHAT_COMPLETE]: tritonCompleteResponseTransform,
  },
};
