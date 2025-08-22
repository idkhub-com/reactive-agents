import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api/request';
import type {
  CompletionFinishReason,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api/response';
import { AIProvider } from '@shared/types/constants';

// Triton KServe v2 API inference request format
export interface TritonInferenceRequest {
  model_name?: string;
  model_version?: string;
  id?: string;
  parameters?: Record<string, unknown>;
  inputs: Array<{
    name: string;
    shape: number[];
    datatype: string;
    data: unknown[];
    parameters?: Record<string, unknown>;
  }>;
  outputs?: Array<{
    name: string;
    parameters?: Record<string, unknown>;
  }>;
}

// Triton KServe v2 API inference response format
interface TritonInferenceResponse {
  model_name: string;
  model_version?: string;
  id?: string;
  parameters?: Record<string, unknown>;
  outputs: Array<{
    name: string;
    shape: number[];
    datatype: string;
    data: unknown[];
    parameters?: Record<string, unknown>;
  }>;
}

interface TritonErrorResponse {
  error: string;
  detail?: string;
}

export const tritonCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model_name',
    required: true,
    default: 'model',
  },
  prompt: {
    param: 'inputs',
    required: true,
    transform: (idkRequestBody: CompletionRequestBody) => [
      {
        name: 'text_input',
        shape: [1],
        datatype: 'BYTES',
        data: [idkRequestBody.prompt || ''],
      },
    ],
  },
  max_tokens: {
    param: 'parameters.max_tokens',
    default: 100,
    min: 1,
  },
  temperature: {
    param: 'parameters.temperature',
    default: 0.7,
    min: 0,
    max: 2,
  },
  top_p: {
    param: 'parameters.top_p',
    default: 0.9,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'parameters.top_k',
    default: 50,
    min: 1,
  },
  stop: {
    param: 'parameters.stop_words',
    transform: (idkRequestBody: CompletionRequestBody) => {
      if (idkRequestBody.stop === null || idkRequestBody.stop === undefined) {
        return [];
      }
      return Array.isArray(idkRequestBody.stop)
        ? idkRequestBody.stop
        : [idkRequestBody.stop];
    },
  },
  stream: {
    param: 'parameters.stream',
    default: false,
  },
  user: {
    param: 'id',
  },
  // Additional Triton-specific parameters
  presence_penalty: {
    param: 'parameters.presence_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  frequency_penalty: {
    param: 'parameters.frequency_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  n: {
    param: 'parameters.n',
    default: 1,
    min: 1,
    max: 10,
  },
  logprobs: {
    param: 'parameters.logprobs',
    default: false,
  },
  echo: {
    param: 'parameters.echo',
    default: false,
  },
  best_of: {
    param: 'parameters.best_of',
    min: 1,
  },
  suffix: {
    param: 'parameters.suffix',
  },
  logit_bias: {
    param: 'parameters.logit_bias',
  },
};

const tritonErrorResponseTransform = (
  response: TritonErrorResponse,
): ErrorResponseBody => ({
  error: {
    message: response.error || 'Unknown error occurred',
    type: 'triton_error',
    param: undefined,
    code: response.detail || undefined,
  },
  provider: AIProvider.TRITON,
});

export const tritonCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    if ('error' in aiProviderResponseBody) {
      return tritonErrorResponseTransform(
        aiProviderResponseBody as unknown as TritonErrorResponse,
      );
    }
  }

  const response = aiProviderResponseBody as unknown as TritonInferenceResponse;

  if ('outputs' in response && response.outputs?.length > 0) {
    // Extract text output from the outputs - look for common output names
    const textOutput = response.outputs.find((output) =>
      ['text_output', 'output', 'generated_text', 'response'].includes(
        output.name.toLowerCase(),
      ),
    );

    if (textOutput?.data?.length && textOutput.data.length > 0) {
      const text = String(textOutput.data[0] || '');

      // Handle token usage if provided in parameters
      const usage = {
        prompt_tokens: (response.parameters?.prompt_tokens as number) || -1,
        completion_tokens:
          (response.parameters?.completion_tokens as number) || -1,
        total_tokens: (response.parameters?.total_tokens as number) || -1,
      };

      const responseObject: CompletionResponseBody = {
        id: response.id || crypto.randomUUID(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model_name || 'triton-model',
        choices: [
          {
            text,
            index: 0,
            logprobs: null,
            finish_reason:
              (response.parameters?.finish_reason as CompletionFinishReason) ||
              'stop',
          },
        ],
        usage,
      };

      return responseObject;
    }
  }

  return generateInvalidProviderResponseError(
    response as unknown as Record<string, unknown>,
    AIProvider.TRITON,
  );
};

// Stream chunk transformation for Triton
export const tritonCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();

    // Handle SSE format
    if (chunk.startsWith('data: ')) {
      chunk = chunk.replace(/^data: /, '');
    }

    chunk = chunk.trim();

    if (chunk === '[DONE]') {
      return 'data: [DONE]\n\n';
    }

    if (chunk === '') {
      return '';
    }

    try {
      const parsedChunk: TritonInferenceResponse = JSON.parse(chunk);

      // Extract text from outputs
      const textOutput = parsedChunk.outputs?.find((output) =>
        ['text_output', 'output', 'generated_text', 'response'].includes(
          output.name.toLowerCase(),
        ),
      );

      const text = textOutput?.data?.[0] ? String(textOutput.data[0]) : '';

      return `data: ${JSON.stringify({
        id: parsedChunk.id || crypto.randomUUID(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: parsedChunk.model_name || 'triton-model',
        provider: AIProvider.TRITON,
        choices: [
          {
            text,
            index: 0,
            logprobs: null,
            finish_reason:
              (parsedChunk.parameters
                ?.finish_reason as CompletionFinishReason) || null,
          },
        ],
      })}\n\n`;
    } catch (_error) {
      // If parsing fails, return empty to skip this chunk
      return '';
    }
  };
