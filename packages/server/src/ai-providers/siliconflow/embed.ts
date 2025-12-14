import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const siliconFlowEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'BAAI/bge-large-zh-v1.5',
  },
  input: {
    param: 'input',
    required: true,
  },
  encoding_format: {
    param: 'encoding_format',
    default: 'float',
  },
  dimensions: {
    param: 'dimensions',
  },
};

export const siliconFlowEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  // Handle error responses - prioritize status code over message field presence
  if (aiProviderResponseStatus !== 200) {
    if ('message' in aiProviderResponseBody) {
      return generateErrorResponse(
        {
          message: aiProviderResponseBody.message as string,
          type: (aiProviderResponseBody.type as string) || 'api_error',
          param: aiProviderResponseBody.param as string | undefined,
          code:
            (aiProviderResponseBody.code as string) ||
            aiProviderResponseStatus.toString(),
        },
        AIProvider.SILICONFLOW,
      );
    }

    // Handle error responses without message field
    return generateErrorResponse(
      {
        message: 'Request failed',
        type: 'api_error',
        param: undefined,
        code: aiProviderResponseStatus.toString(),
      },
      AIProvider.SILICONFLOW,
    );
  }

  if ('data' in aiProviderResponseBody) {
    return aiProviderResponseBody as unknown as CreateEmbeddingsResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as Record<string, unknown>,
    AIProvider.SILICONFLOW,
  );
};
