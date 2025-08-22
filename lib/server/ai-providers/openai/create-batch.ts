import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { CreateBatchResponseBody } from '@shared/types/api/routes/batch-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAICreateBatchConfig: AIProviderFunctionConfig = {
  input_file_id: {
    param: 'input_file_id',
    required: true,
  },
  endpoint: {
    param: 'endpoint',
    required: true,
  },
  completion_window: {
    param: 'completion_window',
    default: '24h',
    required: true,
  },
  metadata: {
    param: 'metadata',
    required: false,
  },
};

export const openAICreateBatchResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody as ErrorResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as CreateBatchResponseBody;
};
