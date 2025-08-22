import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
  StreamResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const openAICompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'text-davinci-003',
  },
  prompt: {
    param: 'prompt',
    default: '',
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 2,
  },
  top_p: {
    param: 'top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  n: {
    param: 'n',
    default: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  logprobs: {
    param: 'logprobs',
    max: 5,
  },
  echo: {
    param: 'echo',
    default: false,
  },
  stop: {
    param: 'stop',
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    min: -2,
    max: 2,
  },
  best_of: {
    param: 'best_of',
  },
  logit_bias: {
    param: 'logit_bias',
  },
  user: {
    param: 'user',
  },
  seed: {
    param: 'seed',
  },
  suffix: {
    param: 'suffix',
  },
};

export const openAICompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody as ErrorResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as CompletionResponseBody;
};

/**
 * Transforms an OpenAI-format completions JSON into an array of formatted OpenAI compatible text/event-stream chunks.
 *
 * @param {Object} response - The OpenAICompleteResponse object.
 * @param {string} provider - The provider string.
 * @returns {Array<string>} - An array of formatted stream chunks.
 */
export const openAICompleteJSONToStreamResponseTransform: StreamResponseTransformFunction =
  (response, provider) => {
    const openAICompleteResponse =
      response as unknown as CompletionResponseBody;
    const streamChunkArray: string[] = [];
    const { id, model, choices } = openAICompleteResponse;
    const { prompt_tokens, completion_tokens } =
      openAICompleteResponse.usage || {};

    let total_tokens: number | undefined;
    if (prompt_tokens && completion_tokens)
      total_tokens = prompt_tokens + completion_tokens;

    const streamChunkTemplate = {
      id: id,
      object: 'text_completion',
      created: Date.now(),
      model: model ?? '',
      provider,
      usage: {
        ...(completion_tokens && { completion_tokens }),
        ...(prompt_tokens && { prompt_tokens }),
        ...(total_tokens && { total_tokens }),
      },
    };

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      if (choice.text) {
        const inidividualWords = [];
        for (let i = 0; i < choice.text.length; i += 500) {
          inidividualWords.push(choice.text.slice(i, i + 500));
        }
        inidividualWords.forEach((word: string) => {
          streamChunkArray.push(
            `data: ${JSON.stringify({
              ...streamChunkTemplate,
              choices: [
                {
                  index: i,
                  text: word,
                },
              ],
            })}\n\n`,
          );
        });
      }

      streamChunkArray.push(
        `data: ${JSON.stringify({
          ...streamChunkTemplate,
          choices: [
            {
              index: i,
              text: '',
              finish_reason: choice.finish_reason,
            },
          ],
        })}\n\n`,
      );
    }

    streamChunkArray.push(`data: [DONE]\n\n`);
    return streamChunkArray;
  };
