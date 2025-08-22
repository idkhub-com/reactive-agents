import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  CompletionFinishReason,
  CompletionRequestBody,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';
import { togetherAIErrorResponseTransform } from './chat-complete';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const togetherAICompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'togethercomputer/RedPajama-INCITE-7B-Instruct',
  },
  prompt: {
    param: 'prompt',
    required: true,
    default: '',
  },
  max_tokens: {
    param: 'max_tokens',
    required: true,
    default: 128,
    min: 1,
  },
  stop: {
    param: 'stop',
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: 0.9,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'top_k',
    default: 40,
    min: 1,
  },
  frequency_penalty: {
    param: 'repetition_penalty',
    default: 1.0,
    min: 0.1,
    max: 2.0,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  logprobs: {
    param: 'logprobs',
    default: false,
  },
  n: {
    param: 'n',
    default: 1,
    min: 1,
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  echo: {
    param: 'echo',
    default: false,
  },
  best_of: {
    param: 'best_of',
    default: 1,
    min: 1,
  },
  logit_bias: {
    param: 'logit_bias',
  },
  user: {
    param: 'user',
  },
  suffix: {
    param: 'suffix',
  },
};

export interface TogetherAICompleteResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    text: string;
    index: number;
    logprobs: null;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TogetherAICompletionStreamChunk {
  id: string;
  model: string;
  request_id?: string;
  object: string;
  choices: {
    text: string;
    index?: number;
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export const togetherAICompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = togetherAIErrorResponseTransform(
      aiProviderResponseBody,
    );
    if (errorResponse) return errorResponse;
  }

  if ('choices' in aiProviderResponseBody) {
    const response =
      aiProviderResponseBody as unknown as TogetherAICompleteResponse;
    const _requestBody =
      idkRequestData.requestBody as unknown as CompletionRequestBody;

    const responseBody: CompletionResponseBody = {
      id: response.id,
      object: response.object as 'text_completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice) => ({
        text: choice.text,
        index: choice.index,
        logprobs: null,
        finish_reason: choice.finish_reason as CompletionFinishReason,
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };

    return responseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.TOGETHER_AI,
  );
};

export const togetherAICompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    let parsedChunk: TogetherAICompletionStreamChunk;
    try {
      parsedChunk = JSON.parse(chunk);
    } catch (error) {
      console.warn(
        'Failed to parse Together AI completion stream chunk:',
        error,
      );
      return `data: ${JSON.stringify({
        id: 'error-chunk',
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: 'unknown',
        provider: AIProvider.TOGETHER_AI,
        choices: [
          {
            text: '',
            index: 0,
            logprobs: null,
            finish_reason: null,
          },
        ],
      })}\n\n`;
    }

    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object || 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: parsedChunk.model,
      provider: AIProvider.TOGETHER_AI,
      choices: [
        {
          text: parsedChunk.choices?.[0]?.text || '',
          index: parsedChunk.choices?.[0]?.index || 0,
          logprobs: null,
          finish_reason: parsedChunk.choices?.[0]?.finish_reason || null,
        },
      ],
      ...(parsedChunk.usage && { usage: parsedChunk.usage }),
    })}\n\n`;
  };
