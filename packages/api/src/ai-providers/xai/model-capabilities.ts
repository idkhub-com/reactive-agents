/**
 * xAI model capabilities configuration.
 *
 * Defines which parameters are supported by different xAI models.
 */

import {
  ModelParameter,
  type ProviderModelCapabilities,
} from '@shared/types/ai-providers/model-capabilities';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';

export const xaiModelCapabilities: ProviderModelCapabilities = {
  provider: AIProvider.XAI,

  // Default parameter ranges for xAI models
  // Source: https://docs.x.ai/docs/overview
  // Temperature: 0-2, Top_p: 0-1, Frequency/Presence penalties: -2 to 2
  defaultParameterRanges: {
    temperature: { min: 0, max: 2 },
    top_p: { min: 0, max: 1 },
    frequency_penalty: { min: -2, max: 2 },
    presence_penalty: { min: -2, max: 2 },
  },

  models: [
    // Grok-3 mini models (support reasoning_effort)
    {
      modelPattern: /^grok-3-mini-(beta|fast-beta)$/,
      endpointConfigs: {
        // These models support reasoning_effort
        // Note: grok-3-mini-beta does NOT support presence_penalty
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [ModelParameter.PRESENCE_PENALTY],
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [ModelParameter.PRESENCE_PENALTY],
        },
      },
    },
    // Grok-3 models (do NOT support reasoning_effort)
    {
      modelPattern: /^grok-3-(beta|fast-beta)$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [ModelParameter.REASONING_EFFORT],
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [ModelParameter.REASONING_EFFORT],
        },
      },
    },
    // Grok-4 (reasoning model - very limited parameters)
    // Does NOT support: reasoning_effort, presence_penalty, frequency_penalty, stop
    {
      modelPattern: /^grok-4/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.REASONING_EFFORT,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.STOP,
          ],
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.REASONING_EFFORT,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.STOP,
          ],
        },
      },
    },
  ],
};
