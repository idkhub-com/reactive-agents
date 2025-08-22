import type {
  AIProviderConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { IdkRequestBody } from '@shared/types/api/request/body';
import { AIProvider } from '@shared/types/constants';
import { chatCompleteParams, responseTransformers } from '../open-ai-base';
import { vertexAPIConfig } from './api';
import { googleCancelBatchResponseTransform } from './cancel-batch';
import {
  vertexAnthropicChatCompleteConfig,
  vertexAnthropicChatCompleteResponseTransform,
  vertexAnthropicChatCompleteStreamChunkTransform,
  vertexGoogleChatCompleteConfig,
  vertexGoogleChatCompleteResponseTransform,
  vertexGoogleChatCompleteStreamChunkTransform,
  vertexLlamaChatCompleteConfig,
  vertexLlamaChatCompleteResponseTransform,
  vertexLlamaChatCompleteStreamChunkTransform,
} from './chat-complete';
import {
  GoogleBatchCreateConfig,
  googleBatchCreateResponseTransform,
} from './create-batch';
import {
  GoogleVertexFinetuneConfig,
  googleFinetuneCreateResponseTransform,
} from './create-finetune';
import { googleEmbedConfig, vertexGoogleEmbedResponseTransform } from './embed';
import {
  BatchOutputResponseTransform,
  googleBatchOutputRequestHandler,
} from './get-batch-output';
import {
  googleImageGenConfig,
  vertexGoogleImageGenResponseTransform,
} from './image-generate';
import { googleListBatchesResponseTransform } from './list-batches';
import { googleListFilesRequestHandler } from './list-files';
import { googleFinetuneListResponseTransform } from './list-finetunes';
import { googleRetrieveBatchResponseTransform } from './retrieve-batch';
import {
  googleRetrieveFileRequestHandler,
  googleRetrieveFileResponseTransform,
} from './retrieve-file';
import { googleRetrieveFileContentResponseTransform } from './retrieve-file-content';
import { googleFinetuneRetrieveResponseTransform } from './retrieve-finetune';
import {
  googleFileUploadRequestHandler,
  googleFileUploadResponseTransform,
} from './upload-file';
import { getModelAndProvider } from './utils';

export const googleVertexAIConfig: AIProviderConfig = {
  api: vertexAPIConfig,
  getConfig: (
    idkRequestBody?: IdkRequestBody | ReadableStream | FormData | ArrayBuffer,
  ) => {
    const requestConfig = {
      [FunctionName.UPLOAD_FILE]: {},
      [FunctionName.CREATE_BATCH]: GoogleBatchCreateConfig,
      [FunctionName.RETRIEVE_BATCH]: {},
      [FunctionName.LIST_BATCHES]: {},
      [FunctionName.CANCEL_BATCH]: {},
      [FunctionName.CREATE_FINE_TUNING_JOB]: GoogleVertexFinetuneConfig,
      [FunctionName.RETRIEVE_FILE]: {},
      [FunctionName.CANCEL_FINE_TUNING_JOB]: {},
      [FunctionName.RETRIEVE_FILE_CONTENT]: {},
    };

    const responseTransforms: {
      [key in FunctionName]?: ResponseTransformFunction;
    } = {
      [FunctionName.UPLOAD_FILE]: googleFileUploadResponseTransform,
      [FunctionName.RETRIEVE_BATCH]: googleRetrieveBatchResponseTransform,
      [FunctionName.GET_BATCH_OUTPUT]: BatchOutputResponseTransform,
      [FunctionName.LIST_BATCHES]: googleListBatchesResponseTransform,
      [FunctionName.CANCEL_BATCH]: googleCancelBatchResponseTransform,
      [FunctionName.CREATE_BATCH]: googleBatchCreateResponseTransform,
      [FunctionName.RETRIEVE_FILE_CONTENT]:
        googleRetrieveFileContentResponseTransform,
      [FunctionName.RETRIEVE_FILE]: googleRetrieveFileResponseTransform,
      [FunctionName.CREATE_FINE_TUNING_JOB]:
        googleFinetuneCreateResponseTransform,
      [FunctionName.RETRIEVE_FINE_TUNING_JOB]:
        googleFinetuneRetrieveResponseTransform,
      [FunctionName.LIST_FINE_TUNING_JOBS]: googleFinetuneListResponseTransform,
    };

    const baseConfig: AIProviderConfig = {
      ...requestConfig,
      responseTransforms,
      api: {
        ...vertexAPIConfig,
      },
    };

    if (!idkRequestBody || !('model' in idkRequestBody)) {
      return baseConfig;
    }

    const providerModel = idkRequestBody?.model;

    if (!providerModel) {
      return baseConfig;
    }

    const { provider } = getModelAndProvider(providerModel as string);
    switch (provider) {
      case 'google': {
        const config: AIProviderConfig = {
          api: vertexAPIConfig,
          [FunctionName.CHAT_COMPLETE]: vertexGoogleChatCompleteConfig,
          [FunctionName.EMBED]: googleEmbedConfig,
          [FunctionName.GENERATE_IMAGE]: googleImageGenConfig,
          [FunctionName.CREATE_BATCH]: GoogleBatchCreateConfig,
          [FunctionName.CREATE_FINE_TUNING_JOB]:
            baseConfig[FunctionName.CREATE_FINE_TUNING_JOB],
          responseTransforms: {
            [FunctionName.STREAM_CHAT_COMPLETE]:
              vertexGoogleChatCompleteStreamChunkTransform,
            [FunctionName.CHAT_COMPLETE]:
              vertexGoogleChatCompleteResponseTransform,
            [FunctionName.EMBED]: vertexGoogleEmbedResponseTransform,
            [FunctionName.GENERATE_IMAGE]:
              vertexGoogleImageGenResponseTransform,
            ...responseTransforms,
          },
        };
        return config;
      }
      case 'anthropic': {
        const config: AIProviderConfig = {
          api: vertexAPIConfig,
          [FunctionName.CHAT_COMPLETE]: vertexAnthropicChatCompleteConfig,
          [FunctionName.CREATE_BATCH]: GoogleBatchCreateConfig,
          [FunctionName.CREATE_FINE_TUNING_JOB]:
            baseConfig[FunctionName.CREATE_FINE_TUNING_JOB],
          responseTransforms: {
            [FunctionName.STREAM_CHAT_COMPLETE]:
              vertexAnthropicChatCompleteStreamChunkTransform,
            [FunctionName.CHAT_COMPLETE]:
              vertexAnthropicChatCompleteResponseTransform,
            ...responseTransforms,
          },
        };
        return config;
      }
      case 'meta': {
        const config: AIProviderConfig = {
          api: vertexAPIConfig,
          [FunctionName.CHAT_COMPLETE]: vertexLlamaChatCompleteConfig,
          [FunctionName.CREATE_BATCH]: GoogleBatchCreateConfig,
          [FunctionName.CREATE_FINE_TUNING_JOB]:
            baseConfig[FunctionName.CREATE_FINE_TUNING_JOB],
          responseTransforms: {
            [FunctionName.CHAT_COMPLETE]:
              vertexLlamaChatCompleteResponseTransform,
            [FunctionName.STREAM_CHAT_COMPLETE]:
              vertexLlamaChatCompleteStreamChunkTransform,
            ...responseTransforms,
          },
        };
        return config;
      }
      case 'endpoints': {
        const config: AIProviderConfig = {
          api: vertexAPIConfig,
          [FunctionName.CHAT_COMPLETE]: chatCompleteParams([], {
            model: 'meta-llama-3-8b-instruct',
          }),
          [FunctionName.CREATE_BATCH]: GoogleBatchCreateConfig,
          [FunctionName.CREATE_FINE_TUNING_JOB]:
            baseConfig[FunctionName.CREATE_FINE_TUNING_JOB],
          responseTransforms: {
            ...responseTransformers(AIProvider.GOOGLE_VERTEX_AI, {
              chatComplete: true,
            }),
            ...responseTransforms,
          },
        };
        return config;
      }
      default:
        return baseConfig;
    }
  },
  requestHandlers: {
    [FunctionName.UPLOAD_FILE]: googleFileUploadRequestHandler,
    [FunctionName.RETRIEVE_BATCH]: googleBatchOutputRequestHandler,
    [FunctionName.LIST_FILES]: googleListFilesRequestHandler,
    [FunctionName.RETRIEVE_FILE]: googleRetrieveFileRequestHandler,
  },
};
