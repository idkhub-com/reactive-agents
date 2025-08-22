import type { EmbedInstancesData } from '@server/ai-providers/google/types';
import type { EmbeddingsParameterTransformFunction } from '@shared/types/api/response/body';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsRequestBody } from '@shared/types/api/routes/embeddings-api';

/**
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini#request_body
 */
export const vertexTransformGenerationConfig = (
  params: ChatCompletionRequestBody | CompletionRequestBody,
): Record<
  string,
  string | string[] | number | boolean | Record<string, unknown>
> => {
  const generationConfig: Record<
    string,
    string | string[] | number | boolean | Record<string, unknown>
  > = {};
  if (params.temperature) {
    generationConfig.temperature = params.temperature;
  }
  if (params.top_p) {
    generationConfig.topP = params.top_p;
  }
  // if ('top_k' in params && params.top_k) {
  //   generationConfig.topK = params.top_k;
  // } // TODO: add top_k support
  if (params.max_tokens) {
    generationConfig.maxOutputTokens = params.max_tokens;
  }
  if (params.stop) {
    generationConfig.stopSequences = params.stop;
  }
  if (params.logprobs) {
    generationConfig.responseLogprobs = params.logprobs;
  }
  if (params.top_logprobs) {
    generationConfig.logprobs = params.top_logprobs; // range 1-5, openai supports 1-20
  }

  return generationConfig;
};

export const googleTransformEmbeddingsDimension: EmbeddingsParameterTransformFunction =
  (params: CreateEmbeddingsRequestBody): Record<string, string | number> => {
    const embeddingsParameters: Record<string, string | number> = {};
    if (params.dimensions) {
      // for multimodal embeddings, the parameter is dimension
      if (Array.isArray(params.input) && typeof params.input[0] === 'object') {
        embeddingsParameters.dimension = params.dimensions;
      } else {
        embeddingsParameters.outputDimensionality = params.dimensions;
      }
    }

    return embeddingsParameters;
  };

export const googleTransformEmbeddingInput: EmbeddingsParameterTransformFunction =
  (params: CreateEmbeddingsRequestBody): EmbedInstancesData[] => {
    const instances: EmbedInstancesData[] = [];
    if (Array.isArray(params.input)) {
      params.input.forEach((input) => {
        if (typeof input === 'string') {
          instances.push({
            content: input,
            task_type: params.input_type ?? 'text',
          });
        }
      });
    } else {
      instances.push({
        content: params.input,
        task_type: params.input_type ?? 'text',
      });
    }
    return instances;
  };
