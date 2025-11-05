/**
 * Anthropic model capabilities configuration.
 *
 * Defines which parameters are supported by different Anthropic models.
 */

import {
  ModelParameter,
  type ProviderModelCapabilities,
} from '@shared/types/ai-providers/model-capabilities';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';

export const anthropicModelCapabilities: ProviderModelCapabilities = {
  provider: AIProvider.ANTHROPIC,

  // Default parameter ranges for Anthropic models
  // Source: https://docs.claude.com/en/api/messages
  // Temperature: 0-1, Top_p: 0-1 (note: cannot use both simultaneously)
  defaultParameterRanges: {
    temperature: { min: 0, max: 1 },
    top_p: { min: 0, max: 1 },
  },

  models: [
    // All Claude models have the same restrictions
    {
      modelPattern: /^claude-.+$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          // Anthropic API returns error: "`temperature` and `top_p` cannot both be specified"
          // We disable top_p and keep temperature since temperature is more commonly used/expected
          // Anthropic also doesn't support frequency_penalty, presence_penalty, or reasoning_effort
          unsupportedParameters: [
            ModelParameter.TOP_P,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.REASONING_EFFORT,
          ],
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          // Same restrictions as chat_complete
          unsupportedParameters: [
            ModelParameter.TOP_P,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.REASONING_EFFORT,
          ],
        },
      },
    },
  ],
};
