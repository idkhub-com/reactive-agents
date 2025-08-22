import type {
  BedrockAI21CompleteResponse,
  BedrockAnthropicCompleteResponse,
  BedrockAnthropicStreamChunk,
  BedrockCohereCompleteResponse,
  BedrockCohereStreamChunk,
  BedrockLlamaCompleteResponse,
  BedrockLlamaStreamChunk,
  BedrockMistralCompleteResponse,
  BedrocMistralStreamChunk as BedrockMistralStreamChunk,
  BedrockTitanCompleteResponse,
  BedrockTitanStreamChunk,
} from '@server/ai-providers/bedrock/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api/request';
import type {
  CompletionFinishReason,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api/response';
import { AIProvider } from '@shared/types/constants';
import { bedrockErrorResponseTransform } from './chat-complete';

export const bedrockAnthropicCompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    transform: (params: CompletionRequestBody) =>
      `\n\nHuman: ${params.prompt}\n\nAssistant:`,
    required: true,
  },
  max_tokens: {
    param: 'max_tokens_to_sample',
    required: true,
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: -1,
    min: -1,
  },
  top_k: {
    param: 'top_k',
    default: -1,
  },
  stop: {
    param: 'stop_sequences',
    transform: (idkRequestBody: CompletionRequestBody) => {
      if (idkRequestBody.stop === null) {
        return [];
      }
      return idkRequestBody.stop;
    },
  },
  user: {
    param: 'metadata.user_id',
  },
};

export const bedrockCohereCompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  max_tokens: {
    param: 'max_tokens',
    default: 20,
    min: 1,
  },
  temperature: {
    param: 'temperature',
    default: 0.75,
    min: 0,
    max: 5,
  },
  top_p: {
    param: 'p',
    default: 0.75,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'k',
    default: 0,
    max: 500,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    default: 0,
    min: 0,
    max: 1,
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: 0,
    max: 1,
  },
  logit_bias: {
    param: 'logit_bias',
  },
  n: {
    param: 'num_generations',
    default: 1,
    min: 1,
    max: 5,
  },
  stop: {
    param: 'end_sequences',
  },
  stream: {
    param: 'stream',
  },
};

export const BedrockLLamaCompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  max_tokens: {
    param: 'max_gen_len',
    default: 512,
    min: 1,
    max: 2048,
  },
  temperature: {
    param: 'temperature',
    default: 0.5,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: 0.9,
    min: 0,
    max: 1,
  },
};

export const BedrockMistralCompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  max_tokens: {
    param: 'max_tokens',
    default: 20,
    min: 1,
  },
  temperature: {
    param: 'temperature',
    default: 0.75,
    min: 0,
    max: 5,
  },
  top_p: {
    param: 'top_p',
    default: 0.75,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'top_k',
    default: 0,
  },
  stop: {
    param: 'stop',
  },
};

const transformTitanGenerationConfig = (
  params: CompletionRequestBody,
): Record<string, unknown> => {
  const generationConfig: Record<string, unknown> = {};
  if (params.temperature) {
    generationConfig.temperature = params.temperature;
  }
  if (params.top_p) {
    generationConfig.topP = params.top_p;
  }
  if (params.max_tokens) {
    generationConfig.maxTokenCount = params.max_tokens;
  }
  if (params.stop) {
    generationConfig.stopSequences = params.stop;
  }
  return generationConfig;
};

export const bedrockTitanCompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'inputText',
    required: true,
  },
  temperature: {
    param: 'textGenerationConfig',
    transform: (idkRequestBody: CompletionRequestBody) =>
      transformTitanGenerationConfig(idkRequestBody),
  },
  max_tokens: {
    param: 'textGenerationConfig',
    transform: (idkRequestBody: CompletionRequestBody) =>
      transformTitanGenerationConfig(idkRequestBody),
  },
  top_p: {
    param: 'textGenerationConfig',
    transform: (idkRequestBody: CompletionRequestBody) =>
      transformTitanGenerationConfig(idkRequestBody),
  },
};

export const bedrockAI21CompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  max_tokens: {
    param: 'maxTokens',
    default: 200,
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'topP',
    default: 1,
  },
  stop: {
    param: 'stopSequences',
  },
  presence_penalty: {
    param: 'presencePenalty',
    transform: (params: CompletionRequestBody) => {
      return {
        scale: params.presence_penalty,
      };
    },
  },
  frequency_penalty: {
    param: 'frequencyPenalty',
    transform: (params: CompletionRequestBody) => {
      return {
        scale: params.frequency_penalty,
      };
    },
  },
  countPenalty: {
    param: 'countPenalty',
  },
  frequencyPenalty: {
    param: 'frequencyPenalty',
  },
  presencePenalty: {
    param: 'presencePenalty',
  },
};

export const bedrockLlamaCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    _responseHeaders,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(response);
      if (errorResponse) return errorResponse;
    }

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    if ('generation' in response) {
      const bedrockResponse =
        response as unknown as BedrockLlamaCompleteResponse;
      const completionResponse: CompletionResponseBody = {
        id: Date.now().toString(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',

        choices: [
          {
            text: bedrockResponse.generation,
            index: 0,
            logprobs: null,
            finish_reason:
              bedrockResponse.stop_reason as CompletionFinishReason,
          },
        ],
        usage: {
          prompt_tokens: bedrockResponse.prompt_token_count,
          completion_tokens: bedrockResponse.generation_token_count,
          total_tokens:
            bedrockResponse.prompt_token_count +
            bedrockResponse.generation_token_count,
        },
      };
      return completionResponse;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.BEDROCK,
    );
  };

export const bedrockLlamaCompleteStreamChunkResponseTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.trim();
    const parsedChunk: BedrockLlamaStreamChunk = JSON.parse(chunk);

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    const model = completionRequestBody.model ?? '';
    if (parsedChunk.stop_reason) {
      return [
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              text: '',
              index: 0,
              logprobs: null,
              finish_reason: parsedChunk.stop_reason,
            },
          ],
          usage: {
            prompt_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount,
            completion_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
            total_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount +
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
          },
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];
    }

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: AIProvider.BEDROCK,
      choices: [
        {
          text: parsedChunk.generation,
          index: 0,
          logprobs: null,
          finish_reason: null,
        },
      ],
    })}\n\n`;
  };

export const bedrockTitanCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    _responseHeaders,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(response);
      if (errorResponse) return errorResponse;
    }

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    if ('results' in response) {
      const bedrockResponse =
        response as unknown as BedrockTitanCompleteResponse;
      const completionTokens = bedrockResponse.results
        .map((r) => r.tokenCount)
        .reduce((partialSum, a) => partialSum + a, 0);
      const completionResponse: CompletionResponseBody = {
        id: Date.now().toString(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',
        choices: bedrockResponse.results.map((generation, index) => ({
          text: generation.outputText,
          index: index,
          logprobs: null,
          finish_reason: generation.completionReason as CompletionFinishReason,
        })),
        usage: {
          prompt_tokens: bedrockResponse.inputTextTokenCount,
          completion_tokens: completionTokens,
          total_tokens: bedrockResponse.inputTextTokenCount + completionTokens,
        },
      };
      return completionResponse;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.BEDROCK,
    );
  };

export const bedrockTitanCompleteStreamChunkResponseTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.trim();
    const parsedChunk: BedrockTitanStreamChunk = JSON.parse(chunk);

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    return [
      `data: ${JSON.stringify({
        id: fallbackId,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',
        choices: [
          {
            text: parsedChunk.outputText,
            index: 0,
            logprobs: null,
            finish_reason: null,
          },
        ],
      })}\n\n`,
      `data: ${JSON.stringify({
        id: fallbackId,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',
        choices: [
          {
            text: '',
            index: 0,
            logprobs: null,
            finish_reason: parsedChunk.completionReason,
          },
        ],
        usage: {
          prompt_tokens:
            parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount,
          completion_tokens:
            parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
          total_tokens:
            parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount +
            parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
        },
      })}\n\n`,
      `data: [DONE]\n\n`,
    ];
  };

export const bedrockAI21CompleteResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
  responseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (responseStatus !== 200) {
    const errorResposne = bedrockErrorResponseTransform(response);
    if (errorResposne) return errorResposne;
  }

  const completionRequestBody =
    idkRequestData.requestBody as CompletionRequestBody;

  if ('completions' in response) {
    const bedrockResponse = response as unknown as BedrockAI21CompleteResponse;
    const prompt_tokens =
      Number(responseHeaders.get('X-Amzn-Bedrock-Input-Token-Count')) || 0;
    const completion_tokens =
      Number(responseHeaders.get('X-Amzn-Bedrock-Output-Token-Count')) || 0;
    const completionResponse: CompletionResponseBody = {
      id: bedrockResponse.id.toString(),
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: completionRequestBody.model ?? '',
      choices: bedrockResponse.completions.map((completion, index) => ({
        text: completion.data.text,
        index: index,
        logprobs: null,
        finish_reason: completion.finishReason
          ?.reason as CompletionFinishReason,
      })),
      usage: {
        prompt_tokens: prompt_tokens,
        completion_tokens: completion_tokens,
        total_tokens: prompt_tokens + completion_tokens,
      },
    };
    return completionResponse;
  }

  return generateInvalidProviderResponseError(
    response as unknown as Record<string, unknown>,
    AIProvider.BEDROCK,
  );
};

export const bedrockAnthropicCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    responseHeaders,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResposne = bedrockErrorResponseTransform(response);
      if (errorResposne) return errorResposne;
    }

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    if ('completion' in response) {
      const bedrockResponse =
        response as unknown as BedrockAnthropicCompleteResponse;
      const prompt_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Input-Token-Count')) || 0;
      const completion_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Output-Token-Count')) || 0;
      const completionResponse: CompletionResponseBody = {
        id: Date.now().toString(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',
        choices: [
          {
            text: bedrockResponse.completion,
            index: 0,
            logprobs: null,
            finish_reason:
              bedrockResponse.stop_reason as CompletionFinishReason,
          },
        ],
        usage: {
          prompt_tokens: prompt_tokens,
          completion_tokens: completion_tokens,
          total_tokens: prompt_tokens + completion_tokens,
        },
      };
      return completionResponse;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.BEDROCK,
    );
  };

export const bedrockAnthropicCompleteStreamChunkResponseTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    const chunk = responseChunk.trim();
    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;
    const model = completionRequestBody.model ?? '';

    const parsedChunk: BedrockAnthropicStreamChunk = JSON.parse(chunk);
    if (parsedChunk.stop_reason) {
      return [
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model,
          provider: AIProvider.BEDROCK,
          choices: [
            {
              text: parsedChunk.completion,
              index: 0,
              logprobs: null,
              finish_reason: null,
            },
          ],
        })}\n\n`,
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model,
          provider: AIProvider.BEDROCK,
          choices: [
            {
              text: '',
              index: 0,
              logprobs: null,
              finish_reason: parsedChunk.stop_reason,
            },
          ],
          usage: {
            prompt_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount,
            completion_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
            total_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount +
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
          },
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];
    }
    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: AIProvider.BEDROCK,
      choices: [
        {
          text: parsedChunk.completion,
          index: 0,
          logprobs: null,
          finish_reason: null,
        },
      ],
    })}\n\n`;
  };

export const bedrockCohereCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    responseHeaders,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResposne = bedrockErrorResponseTransform(response);
      if (errorResposne) return errorResposne;
    }

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    if ('generations' in response) {
      const bedrockResponse =
        response as unknown as BedrockCohereCompleteResponse;
      const prompt_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Input-Token-Count')) || 0;
      const completion_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Output-Token-Count')) || 0;
      const completionResponse: CompletionResponseBody = {
        id: bedrockResponse.id,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',
        choices: bedrockResponse.generations.map((generation, index) => ({
          text: generation.text,
          index: index,
          logprobs: null,
          finish_reason: generation.finish_reason as CompletionFinishReason,
        })),
        usage: {
          prompt_tokens: prompt_tokens,
          completion_tokens: completion_tokens,
          total_tokens: prompt_tokens + completion_tokens,
        },
      };
      return completionResponse;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.BEDROCK,
    );
  };

export const bedrockCohereCompleteStreamChunkResponseTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    const parsedChunk: BedrockCohereStreamChunk = JSON.parse(chunk);

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    // discard the last cohere chunk as it sends the whole response combined.
    if (parsedChunk.is_finished) {
      return [
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model: completionRequestBody.model ?? '',
          provider: AIProvider.BEDROCK,
          choices: [
            {
              text: '',
              index: 0,
              logprobs: null,
              finish_reason: parsedChunk.finish_reason,
            },
          ],
          usage: {
            prompt_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount,
            completion_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
            total_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount +
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
          },
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];
    }

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: completionRequestBody.model ?? '',
      provider: AIProvider.BEDROCK,
      choices: [
        {
          text: parsedChunk.text,
          index: parsedChunk.index ?? 0,
          logprobs: null,
          finish_reason: null,
        },
      ],
    })}\n\n`;
  };

export const bedrockMistralCompleteStreamChunkResponseTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.trim();
    const parsedChunk: BedrockMistralStreamChunk = JSON.parse(chunk);

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    if (parsedChunk.outputs[0].stop_reason) {
      return [
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model: completionRequestBody.model ?? '',
          provider: AIProvider.BEDROCK,
          choices: [
            {
              text: parsedChunk.outputs[0].text,
              index: 0,
              logprobs: null,
              finish_reason: parsedChunk.outputs[0].stop_reason,
            },
          ],
          usage: {
            prompt_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount,
            completion_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
            total_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount +
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
          },
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];
    }

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: completionRequestBody.model ?? '',
      provider: AIProvider.BEDROCK,
      choices: [
        {
          text: parsedChunk.outputs[0].text,
          index: 0,
          logprobs: null,
          finish_reason: null,
        },
      ],
    })}\n\n`;
  };

export const bedrockMistralCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    responseHeaders,
    _strictOpenAiCompliance,
    idkRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(response);
      if (errorResponse) return errorResponse;
    }

    const completionRequestBody =
      idkRequestData.requestBody as CompletionRequestBody;

    if ('outputs' in response) {
      const bedrockResponse =
        response as unknown as BedrockMistralCompleteResponse;
      const prompt_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Input-Token-Count')) || 0;
      const completion_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Output-Token-Count')) || 0;
      const completionResponse: CompletionResponseBody = {
        id: Date.now().toString(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: completionRequestBody.model ?? '',
        choices: [
          {
            text: bedrockResponse.outputs[0].text,
            index: 0,
            logprobs: null,
            finish_reason: bedrockResponse.outputs[0]
              .stop_reason as CompletionFinishReason,
          },
        ],
        usage: {
          prompt_tokens: prompt_tokens,
          completion_tokens: completion_tokens,
          total_tokens: prompt_tokens + completion_tokens,
        },
      };
      return completionResponse;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.BEDROCK,
    );
  };
