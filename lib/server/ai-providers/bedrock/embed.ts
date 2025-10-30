import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  CreateEmbeddingsRequestBody,
  CreateEmbeddingsResponseBody,
} from '@shared/types/api/routes/embeddings-api';
import { AIProvider } from '@shared/types/constants';
import { bedrockErrorResponseTransform } from './chat-complete';

export const bedrockCohereEmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'texts',
    required: true,
    transform: (raRequestBody: CreateEmbeddingsRequestBody): string[] => {
      if (Array.isArray(raRequestBody.input)) {
        return raRequestBody.input as string[];
      } else {
        return [raRequestBody.input as string];
      }
    },
  },
  input_type: {
    param: 'input_type',
    required: true,
  },
  truncate: {
    param: 'truncate',
  },
};

export const bedrockTitanEmbedConfig: AIProviderFunctionConfig = {
  input: {
    param: 'inputText',
    required: true,
  },
};

export const bedrockTitanEmbedResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  raRequestData,
) => {
  if (responseStatus !== 200) {
    const errorResposne = bedrockErrorResponseTransform(response);
    if (errorResposne) return errorResposne;
  }

  const embedRequestBody =
    raRequestData.requestBody as CreateEmbeddingsRequestBody;

  const model = (embedRequestBody.model as string) || '';
  if ('embedding' in response) {
    const embedResponseBody: CreateEmbeddingsResponseBody = {
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: response.embedding as number[],
          index: 0,
        },
      ],
      model,
      usage: {
        prompt_tokens: response.inputTextTokenCount as number,
        total_tokens: response.inputTextTokenCount as number,
      },
    };
    return embedResponseBody;
  }

  return generateInvalidProviderResponseError(
    response as unknown as Record<string, unknown>,
    AIProvider.BEDROCK,
  );
};

export const bedrockCohereEmbedResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  raRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResposne = bedrockErrorResponseTransform(aiProviderResponseBody);
    if (errorResposne) return errorResposne;
  }

  const embedRequestBody =
    raRequestData.requestBody as CreateEmbeddingsRequestBody;

  const model = (embedRequestBody.model as string) || '';

  if ('embeddings' in aiProviderResponseBody) {
    const embeddings = aiProviderResponseBody.embeddings as unknown as {
      embedding: number[];
    }[];
    return {
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding: embedding.embedding,
        index: index,
      })),
      provider: AIProvider.BEDROCK,
      model,
      usage: {
        prompt_tokens:
          Number(
            aiProviderResponseHeaders.get('X-Amzn-Bedrock-Input-Token-Count'),
          ) || -1,
        total_tokens:
          Number(
            aiProviderResponseHeaders.get('X-Amzn-Bedrock-Input-Token-Count'),
          ) || -1,
      },
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.BEDROCK,
  );
};
