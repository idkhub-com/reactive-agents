/**
 * OpenAI model capabilities configuration.
 *
 * Defines which parameters are supported by different OpenAI models.
 */

import {
  ModelParameter,
  type ProviderModelCapabilities,
} from '@shared/types/ai-providers/model-capabilities';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';

export const openAIModelCapabilities: ProviderModelCapabilities = {
  provider: AIProvider.OPENAI,

  // Default parameter ranges for OpenAI models (applies to all models unless overridden)
  // Source: https://platform.openai.com/docs/api-reference/chat/create
  // Temperature: 0-2, Top_p: 0-1, Frequency/Presence penalties: -2 to 2
  defaultParameterRanges: {
    temperature: { min: 0, max: 2 },
    top_p: { min: 0, max: 1 },
    frequency_penalty: { min: -2, max: 2 },
    presence_penalty: { min: -2, max: 2 },
  },

  models: [
    // GPT-5 models (reasoning models)
    // Support reasoning_effort: minimal, low, medium, high
    {
      modelPattern: /^(gpt-5|gpt-5-mini|gpt-5-nano)$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
      },
    },
    // o1 models
    {
      modelPattern: /^o1(-preview|-mini)?$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.PRESENCE_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.PRESENCE_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
      },
    },
    // o3 models
    {
      modelPattern: /^o3(-mini)?$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          supportedParameters: [
            ModelParameter.MAX_COMPLETION_TOKENS,
            ModelParameter.REASONING_EFFORT,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          supportedParameters: [
            ModelParameter.MAX_COMPLETION_TOKENS,
            ModelParameter.REASONING_EFFORT,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
      },
    },
    // o4-mini (temperature only supports default value, uses max_completion_tokens)
    {
      modelPattern: 'o4-mini',
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
          ],
          legacyParameterMapping: {
            [ModelParameter.MAX_TOKENS]: ModelParameter.MAX_COMPLETION_TOKENS,
          },
        },
      },
    },
    // GPT-4o and GPT-4o-mini (no reasoning_effort support)
    {
      modelPattern: /^gpt-4o(-mini)?$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [ModelParameter.REASONING_EFFORT],
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [ModelParameter.REASONING_EFFORT],
        },
      },
    },
  ],
};
