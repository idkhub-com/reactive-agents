/**
 * Google AI model capabilities configuration.
 *
 * Defines which parameters are supported by different Google (Gemini) models.
 */

import type { ProviderModelCapabilities } from '@shared/types/ai-providers/model-capabilities';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';

export const googleModelCapabilities: ProviderModelCapabilities = {
  provider: AIProvider.GOOGLE,

  models: [
    // Gemini 2.0 Flash Thinking models (support thinking parameter)
    {
      modelPattern: /^gemini-2\.0-flash-thinking-exp(-\d+)?$/,
      endpointConfigs: {
        // These models support thinking parameter - no restrictions
        [FunctionName.CHAT_COMPLETE]: {},
        [FunctionName.STREAM_CHAT_COMPLETE]: {},
      },
    },
  ],
};
