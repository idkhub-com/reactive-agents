import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const azureOpenAIEmbedConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
  },
  input: {
    param: 'input',
    required: true,
  },
  user: {
    param: 'user',
  },
  encoding_format: {
    param: 'encoding_format',
    required: false,
  },
  dimensions: {
    param: 'dimensions',
  },
};

export const azureOpenAIEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.AZURE_OPENAI,
    );
  }

  return aiProviderResponseBody as unknown as CreateEmbeddingsResponseBody;
};
