import type {
  AIProviderFunctionConfig,
  CustomTransformer,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import {
  type DeleteResponseResponseBody,
  type GetResponseResponseBody,
  ResponsesResponseBody,
} from '@shared/types/api/routes/responses-api';
import type { ListResponsesResponseBody } from '@shared/types/api/routes/responses-api/response';
import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';
import { OpenAICreateModelResponseConfig } from './create-model-response';

type DefaultValues = {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  logprobs?: boolean;
  [key: string]: unknown;
};

const excludeObjectKeys = (
  keyList: string[],
  object: Record<string, unknown>,
): void => {
  if (keyList) {
    keyList.forEach((excludeKey) => {
      if (Object.hasOwn(object, excludeKey)) {
        delete object[excludeKey];
      }
    });
  }
};

export const chatCompleteParams = (
  exclude: string[],
  defaultValues?: DefaultValues,
  extra?: AIProviderFunctionConfig,
): AIProviderFunctionConfig => {
  const baseParams: AIProviderFunctionConfig = {
    model: {
      param: 'model',
      required: true,
      ...(defaultValues?.model && { default: defaultValues.model }),
    },
    messages: {
      param: 'messages',
      default: '',
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown>[] => {
        if (!idkRequestBody.messages) {
          return [];
        }

        const updatedMessages = idkRequestBody.messages?.map(
          (message: ChatCompletionMessage) => {
            if (message.role === ChatCompletionMessageRole.DEVELOPER) {
              return { ...message, role: ChatCompletionMessageRole.SYSTEM };
            }
            return message;
          },
        );

        return updatedMessages;
      },
    },
    functions: {
      param: 'functions',
    },
    function_call: {
      param: 'function_call',
    },
    max_tokens: {
      param: 'max_tokens',
      ...(defaultValues?.max_tokens && { default: defaultValues.max_tokens }),
      min: 0,
    },
    temperature: {
      param: 'temperature',
      ...(defaultValues?.temperature && { default: defaultValues.temperature }),
      min: 0,
      max: 2,
    },
    top_p: {
      param: 'top_p',
      ...(defaultValues?.top_p && { default: defaultValues.top_p }),
      min: 0,
      max: 1,
    },
    n: {
      param: 'n',
      default: 1,
    },
    stream: {
      param: 'stream',
      ...(defaultValues?.stream && { default: defaultValues.stream }),
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
    logit_bias: {
      param: 'logit_bias',
    },
    user: {
      param: 'user',
    },
    seed: {
      param: 'seed',
    },
    tools: {
      param: 'tools',
    },
    tool_choice: {
      param: 'tool_choice',
    },
    response_format: {
      param: 'response_format',
    },
    logprobs: {
      param: 'logprobs',
      ...(defaultValues?.logprobs && { default: defaultValues?.logprobs }),
    },
    stream_options: {
      param: 'stream_options',
    },
  };

  // Exclude params that are not needed.
  excludeObjectKeys(exclude, baseParams);

  return { ...baseParams, ...(extra ?? {}) };
};

export const completeParams = (
  exclude: string[],
  defaultValues?: DefaultValues,
  extra?: AIProviderFunctionConfig,
): AIProviderFunctionConfig => {
  const baseParams: AIProviderFunctionConfig = {
    model: {
      param: 'model',
      required: true,
      ...(defaultValues?.model && { default: defaultValues.model }),
    },
    prompt: {
      param: 'prompt',
      default: '',
    },
    max_tokens: {
      param: 'max_tokens',
      ...(defaultValues?.max_tokens && { default: defaultValues.max_tokens }),
      min: 0,
    },
    temperature: {
      param: 'temperature',
      ...(defaultValues?.temperature && { default: defaultValues.temperature }),
      min: 0,
      max: 2,
    },
    top_p: {
      param: 'top_p',
      ...(defaultValues?.top_p && { default: defaultValues.top_p }),
      min: 0,
      max: 1,
    },
    n: {
      param: 'n',
      default: 1,
    },
    stream: {
      param: 'stream',
      ...(defaultValues?.stream && { default: defaultValues.stream }),
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

  excludeObjectKeys(exclude, baseParams);

  return { ...baseParams, ...(extra ?? {}) };
};

export const embedParams = (
  exclude: string[],
  defaultValues?: Record<string, string>,
  extra?: AIProviderFunctionConfig,
): AIProviderFunctionConfig => {
  const baseParams: AIProviderFunctionConfig = {
    model: {
      param: 'model',
      required: true,
      ...(defaultValues?.model && { default: defaultValues.model }),
    },
    input: {
      param: 'input',
      required: true,
    },
    encoding_format: {
      param: 'encoding_format',
    },
    dimensions: {
      param: 'dimensions',
    },
    user: {
      param: 'user',
    },
  };

  excludeObjectKeys(exclude, baseParams);

  return { ...baseParams, ...(extra ?? {}) };
};

export const createSpeechParams = (
  exclude: string[],
  _defaultValues?: Record<string, string>,
  extra?: AIProviderFunctionConfig,
): AIProviderFunctionConfig => {
  const baseParams: AIProviderFunctionConfig = {
    model: {
      param: 'model',
      required: true,
      default: 'tts-1',
    },
    input: {
      param: 'input',
      required: true,
    },
    voice: {
      param: 'voice',
      required: true,
      default: 'alloy',
    },
    response_format: {
      param: 'response_format',
      required: false,
      default: 'mp3',
    },
    speed: {
      param: 'speed',
      required: false,
      default: 1,
    },
  };

  excludeObjectKeys(exclude, baseParams);

  return { ...baseParams, ...(extra ?? {}) };
};

export const createModelResponseParams = (
  exclude: string[],
  _defaultValues: Record<string, string> = {},
  extra?: AIProviderFunctionConfig,
): AIProviderFunctionConfig => {
  const baseParams: AIProviderFunctionConfig = {
    ...OpenAICreateModelResponseConfig,
  };
  excludeObjectKeys(exclude, baseParams);

  // Object.keys(defaultValues).forEach((key) => {
  //   if (Object.hasOwn(baseParams, key) && !Array.isArray(baseParams[key])) {
  //     baseParams[key].default = defaultValues[key];
  //   }
  // });

  return { ...baseParams, ...(extra ?? {}) };
};

const embedResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    CreateEmbeddingsResponseBody,
    CreateEmbeddingsResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      );
    }

    if (customTransformer) {
      return customTransformer(
        aiProviderResponseBody as unknown as CreateEmbeddingsResponseBody,
      );
    }

    Object.defineProperty(aiProviderResponseBody, 'provider', {
      value: provider,
      enumerable: true,
    });
    return aiProviderResponseBody as unknown as CreateEmbeddingsResponseBody;
  };

  return transformer;
};

const completeResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    CompletionResponseBody,
    CompletionResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      const errorResponse = openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      ) as Record<string, unknown>;
      if (customTransformer) {
        return customTransformer(
          errorResponse as unknown as CompletionResponseBody,
          true,
        );
      }
      return errorResponse as ErrorResponseBody;
    }

    if (customTransformer) {
      return customTransformer(
        aiProviderResponseBody as unknown as CompletionResponseBody,
      );
    }

    Object.defineProperty(aiProviderResponseBody, 'provider', {
      value: provider,
      enumerable: true,
    });

    return aiProviderResponseBody as unknown as CompletionResponseBody;
  };

  return transformer;
};

const chatCompleteResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    Record<string, unknown>,
    ChatCompletionResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      if (customTransformer) {
        return customTransformer(aiProviderResponseBody, true);
      }

      const errorResponse = openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      ) as Record<string, unknown>;

      return errorResponse as ErrorResponseBody;
    }

    if (customTransformer) {
      return customTransformer(
        aiProviderResponseBody as unknown as ChatCompletionResponseBody,
      );
    }

    Object.defineProperty(aiProviderResponseBody, 'provider', {
      value: provider,
      enumerable: true,
    });
    return aiProviderResponseBody as unknown as ChatCompletionResponseBody;
  };

  return transformer;
};

export const openAICreateModelResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    Record<string, unknown>,
    ResponsesResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      if (customTransformer) {
        return customTransformer(aiProviderResponseBody, true);
      }
      const errorResponse = openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      );

      return errorResponse;
    }

    if (customTransformer) {
      return customTransformer(aiProviderResponseBody);
    }

    const parsedResponse = ResponsesResponseBody.safeParse(
      aiProviderResponseBody,
    );

    if (!parsedResponse.success) {
      throw new Error(
        `IdkHub failed to parse response: ${parsedResponse.error.message}`,
      );
    }

    return parsedResponse.data;
  };

  return transformer;
};

export const openAIGetModelResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    Record<string, unknown>,
    GetResponseResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      if (customTransformer) {
        return customTransformer(aiProviderResponseBody, true);
      }
      const errorResponse = openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      );

      return errorResponse;
    }

    if (customTransformer) {
      return customTransformer(
        aiProviderResponseBody as unknown as GetResponseResponseBody,
      );
    }

    Object.defineProperty(aiProviderResponseBody, 'provider', {
      value: provider,
      enumerable: true,
    });
    return aiProviderResponseBody as unknown as GetResponseResponseBody;
  };

  return transformer;
};

export const openAIDeleteModelResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    Record<string, unknown>,
    DeleteResponseResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      const errorResponse = openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      );
      if (customTransformer) {
        return customTransformer(errorResponse, true);
      }

      return errorResponse;
    }

    if (customTransformer) {
      return customTransformer(
        aiProviderResponseBody as unknown as DeleteResponseResponseBody,
      );
    }

    Object.defineProperty(aiProviderResponseBody, 'provider', {
      value: provider,
      enumerable: true,
    });
    return aiProviderResponseBody as unknown as DeleteResponseResponseBody;
  };

  return transformer;
};

export const openAIListInputItemsResponseTransformer = (
  provider: AIProvider,
  customTransformer?: CustomTransformer<
    Record<string, unknown>,
    ListResponsesResponseBody | ErrorResponseBody
  >,
): ResponseTransformFunction => {
  const transformer: ResponseTransformFunction = (
    aiProviderResponseBody,
    aiProviderResponseStatus,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      if (customTransformer) {
        return customTransformer(aiProviderResponseBody, true);
      }
      const errorResponse = openAIErrorResponseTransform(
        aiProviderResponseBody as ErrorResponseBody,
        provider ?? AIProvider.OPENAI,
      );

      return errorResponse;
    }

    if (customTransformer) {
      return customTransformer(
        aiProviderResponseBody as unknown as ListResponsesResponseBody,
      );
    }

    Object.defineProperty(aiProviderResponseBody, 'provider', {
      value: provider,
      enumerable: true,
    });
    return aiProviderResponseBody as unknown as ListResponsesResponseBody;
  };

  return transformer;
};

/**
 *
 * @param provider Provider value
 * @param options Enable transformer functions to specific task (complete, chatComplete or embed)
 * @returns
 */
export const responseTransformers = <
  T extends CreateEmbeddingsResponseBody | ErrorResponseBody,
  U extends CompletionResponseBody | ErrorResponseBody,
  V extends ChatCompletionResponseBody | ErrorResponseBody,
  W extends Response | ErrorResponseBody,
>(
  provider: AIProvider,
  options: {
    embed?: boolean | CustomTransformer<Record<string, unknown>, T>;
    complete?: boolean | CustomTransformer<Record<string, unknown>, U>;
    chatComplete?: boolean | CustomTransformer<Record<string, unknown>, V>;
    createSpeech?: boolean | CustomTransformer<Record<string, unknown>, W>;
  },
): {
  [key in FunctionName]?: ResponseTransformFunction;
} => {
  const transformers: {
    [key in FunctionName]?: ResponseTransformFunction;
  } = {
    [FunctionName.COMPLETE]: undefined,
    [FunctionName.CHAT_COMPLETE]: undefined,
    [FunctionName.EMBED]: undefined,
  };

  if (options.embed) {
    transformers[FunctionName.EMBED] = embedResponseTransformer(
      provider,
      typeof options.embed === 'function' ? options.embed : undefined,
    );
  }

  if (options.complete) {
    transformers[FunctionName.COMPLETE] = completeResponseTransformer(
      provider,
      typeof options.complete === 'function' ? options.complete : undefined,
    );
  }

  if (options.chatComplete) {
    transformers[FunctionName.CHAT_COMPLETE] = chatCompleteResponseTransformer(
      provider,
      typeof options.chatComplete === 'function'
        ? options.chatComplete
        : undefined,
    );
  }

  return transformers;
};

export const openAIResponseTransform = (
  response: Response | ErrorResponseBody,
  responseStatus: number,
  provider: AIProvider,
): Response | ErrorResponseBody => {
  if (responseStatus !== 200 && 'error' in response) {
    return openAIErrorResponseTransform(
      response,
      provider ?? AIProvider.OPENAI,
    );
  }

  return response;
};
