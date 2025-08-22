import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const openAIEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'text-embedding-ada-002',
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

export const openAIEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as unknown as CreateEmbeddingsResponseBody;
};
