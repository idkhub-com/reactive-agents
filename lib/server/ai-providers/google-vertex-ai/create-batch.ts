import type {
  GoogleBatchRecord,
  GoogleBatchRecordOutputConfig,
} from '@server/ai-providers/google/types';

import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';

import type { CreateBatchResponseBody } from '@shared/types/api/routes/batch-api';
import type { CreateEmbeddingsRequestBody } from '@shared/types/api/routes/embeddings-api';
import { GoogleToOpenAIBatch, getModelAndProvider } from './utils';

export const GoogleBatchCreateConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    transform: (idkRequestBody: CreateEmbeddingsRequestBody): string => {
      if (!idkRequestBody.model) {
        throw new Error('Model is required');
      }

      const { model, provider } = getModelAndProvider(idkRequestBody.model);
      return `publishers/${provider}/models/${model}`;
    },
  },
  input_file_id: {
    param: 'inputConfig',
    required: true,
    transform: (params: Record<string, unknown>) => {
      return {
        instancesFormat: 'jsonl',
        gcsSource: {
          uris: decodeURIComponent(params.input_file_id as string),
        },
      };
    },
  },
  output_data_config: {
    param: 'outputConfig',
    required: true,
    transform: (
      params: Record<string, unknown>,
    ): GoogleBatchRecordOutputConfig => {
      return {
        predictionsFormat: 'jsonl',
        gcsDestination: {
          outputUriPrefix: decodeURIComponent(
            params.output_data_config as string,
          ),
        },
      };
    },
    default: (params: Record<string, unknown>) => {
      const inputFileId = decodeURIComponent(params.input_file_id as string);
      const gcsURLToContainingFolder = `${inputFileId.split('/').slice(0, -1).join('/')}/`;
      return {
        predictionsFormat: 'jsonl',
        gcsDestination: {
          outputUriPrefix: gcsURLToContainingFolder,
        },
      };
    },
  },
  job_name: {
    param: 'displayName',
    required: true,
    default: () => {
      return crypto.randomUUID();
    },
  },
};

export const googleBatchCreateResponseTransform: ResponseTransformFunction = (
  response,
  status,
) => {
  if (status === 200) {
    return GoogleToOpenAIBatch(response as unknown as GoogleBatchRecord);
  }
  return response as unknown as CreateBatchResponseBody;
};
