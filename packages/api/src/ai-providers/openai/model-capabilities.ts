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

  // `prompt_cache_options` exists from gpt-5.6 on, and the models before it
  // answer the field with a 400 rather than ignoring it. So the entry for
  // gpt-5.6 and later is the only one that takes it: every other entry lists
  // it as unsupported, and this default covers the models with no entry.
  defaultUnsupportedParameters: [ModelParameter.PROMPT_CACHE_OPTIONS],

  models: [
    // GPT-5.6 and later, reasoning variants: the same restrictions as the
    // rest of the gpt-5 family below, plus `prompt_cache_options`. Listed
    // first because the family pattern below matches these names too. The
    // major versions from 6 to 9 are included on the assumption that a
    // successor keeps what its predecessor took.
    {
      modelPattern: /^gpt-(?:5\.(?:[6-9]|[1-9]\d)|[6-9])(?!-chat)(?:[.-].*)?$/,
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
    // GPT-5 reasoning models: gpt-5, -mini, -nano, -pro, the 5.x point
    // releases before 5.6 and their dated snapshots. Only the default
    // temperature is accepted, so sampling parameters are dropped rather than
    // sent. The `-chat` variants are ordinary chat models and take them.
    // Support reasoning_effort: minimal, low, medium, high
    {
      modelPattern: /^gpt-5(?!-chat)([.-].*)?$/,
      endpointConfigs: {
        [FunctionName.CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.TEMPERATURE,
            ModelParameter.TOP_P,
            ModelParameter.PRESENCE_PENALTY,
            ModelParameter.FREQUENCY_PENALTY,
            ModelParameter.PROMPT_CACHE_OPTIONS,
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
            ModelParameter.PROMPT_CACHE_OPTIONS,
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
            ModelParameter.PROMPT_CACHE_OPTIONS,
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
            ModelParameter.PROMPT_CACHE_OPTIONS,
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
            ModelParameter.PROMPT_CACHE_OPTIONS,
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
            ModelParameter.PROMPT_CACHE_OPTIONS,
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
          unsupportedParameters: [
            ModelParameter.REASONING_EFFORT,
            ModelParameter.PROMPT_CACHE_OPTIONS,
          ],
        },
        [FunctionName.STREAM_CHAT_COMPLETE]: {
          unsupportedParameters: [
            ModelParameter.REASONING_EFFORT,
            ModelParameter.PROMPT_CACHE_OPTIONS,
          ],
        },
      },
    },
  ],
};
