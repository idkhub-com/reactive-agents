import type {
  AIProviderConfig,
  InternalProviderAPIConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';

import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import bedrockAPIConfig from './api';
import { bedrockCancelBatchResponseTransform } from './cancel-batch';
import {
  bedrockAI21ChatCompleteConfig,
  bedrockAI21ChatCompleteResponseTransform,
  bedrockChatCompleteResponseTransform,
  bedrockChatCompleteStreamChunkTransform,
  bedrockCohereChatCompleteConfig,
  bedrockCohereChatCompleteResponseTransform,
  bedrockCohereChatCompleteStreamChunkTransform,
  bedrockConverseAI21ChatCompleteConfig,
  bedrockConverseAnthropicChatCompleteConfig,
  bedrockConverseChatCompleteConfig,
  bedrockConverseCohereChatCompleteConfig,
} from './chat-complete';
import {
  BedrockLLamaCompleteConfig,
  BedrockMistralCompleteConfig,
  bedrockAI21CompleteConfig,
  bedrockAI21CompleteResponseTransform,
  bedrockAnthropicCompleteConfig,
  bedrockAnthropicCompleteResponseTransform,
  bedrockAnthropicCompleteStreamChunkResponseTransform,
  bedrockCohereCompleteConfig,
  bedrockCohereCompleteResponseTransform,
  bedrockCohereCompleteStreamChunkResponseTransform,
  bedrockLlamaCompleteResponseTransform,
  bedrockLlamaCompleteStreamChunkResponseTransform,
  bedrockMistralCompleteResponseTransform,
  bedrockMistralCompleteStreamChunkResponseTransform,
  bedrockTitanCompleteConfig,
  bedrockTitanCompleteResponseTransform,
  bedrockTitanCompleteStreamChunkResponseTransform,
} from './complete';
import { BEDROCK_STABILITY_V1_MODELS } from './constants';
import {
  BedrockCreateBatchConfig,
  bedrockCreateBatchResponseTransform,
} from './create-batch';
import {
  BedrockCreateFinetuneConfig,
  bedrockCreateFinetuneResponseTransform,
} from './create-finetune';
import { bedrockDeleteFileResponseTransform } from './delete-file';
import {
  bedrockCohereEmbedConfig,
  bedrockCohereEmbedResponseTransform,
  bedrockTitanEmbedConfig,
  bedrockTitanEmbedResponseTransform,
} from './embed';
import { bedrockGetBatchOutputRequestHandler } from './get-batch-output';
import {
  bedrockStabilityAIImageGenerateV1Config,
  bedrockStabilityAIImageGenerateV1ResponseTransform,
  bedrockStabilityAIImageGenerateV2Config,
  bedrockStabilityAIImageGenerateV2ResponseTransform,
} from './image-generate';
import { bedrockListBatchesResponseTransform } from './list-batches';
import { bedrockListFilesResponseTransform } from './list-files';
import { bedrockListFinetuneResponseTransform } from './list-finetunes';
import { bedrockRetrieveBatchResponseTransform } from './retrieve-batch';
import { bedrockRetrieveFileRequestHandler } from './retrieve-file';
import {
  bedrockRetrieveFileContentRequestHandler,
  bedrockRetrieveFileContentResponseTransform,
} from './retrieve-file-content';
import { bedrockFinetuneResponseTransform } from './retrieve-finetune';
import {
  bedrockUploadFileRequestHandler,
  bedrockUploadFileResponseTransform,
} from './upload-file';

export const bedrockConfig: AIProviderConfig = {
  api: bedrockAPIConfig,
  requestHandlers: {
    [FunctionName.UPLOAD_FILE]: bedrockUploadFileRequestHandler,
    [FunctionName.RETRIEVE_FILE]: bedrockRetrieveFileRequestHandler,
    [FunctionName.GET_BATCH_OUTPUT]: bedrockGetBatchOutputRequestHandler,
    [FunctionName.RETRIEVE_FILE_CONTENT]:
      bedrockRetrieveFileContentRequestHandler,
  },
  getConfig: (idkRequestBody): AIProviderConfig => {
    // To remove the region in case its a cross-region inference profile ID
    // https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html
    let config: AIProviderConfig = {
      api: bedrockAPIConfig,
    };

    if (idkRequestBody && 'model' in idkRequestBody && idkRequestBody.model) {
      const providerModel = idkRequestBody.model.replace(/^(us\.|eu\.)/, '');
      const providerModelArray = providerModel?.split('.');
      const provider = providerModelArray?.[0];
      const model = providerModelArray?.slice(1).join('.');
      switch (provider) {
        case AIProvider.ANTHROPIC:
          config = {
            api: bedrockAPIConfig as unknown as InternalProviderAPIConfig,
            [FunctionName.COMPLETE]: bedrockAnthropicCompleteConfig,
            [FunctionName.CHAT_COMPLETE]:
              bedrockConverseAnthropicChatCompleteConfig,
            responseTransforms: {
              [FunctionName.STREAM_COMPLETE]:
                bedrockAnthropicCompleteStreamChunkResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.COMPLETE]:
                bedrockAnthropicCompleteResponseTransform as unknown as ResponseTransformFunction,
            },
          };
          break;
        case AIProvider.COHERE:
          config = {
            api: bedrockAPIConfig as unknown as InternalProviderAPIConfig,
            [FunctionName.COMPLETE]: bedrockCohereCompleteConfig,
            [FunctionName.CHAT_COMPLETE]:
              bedrockConverseCohereChatCompleteConfig,
            [FunctionName.EMBED]: bedrockCohereEmbedConfig,
            responseTransforms: {
              [FunctionName.STREAM_COMPLETE]:
                bedrockCohereCompleteStreamChunkResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.COMPLETE]:
                bedrockCohereCompleteResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.EMBED]:
                bedrockCohereEmbedResponseTransform as unknown as ResponseTransformFunction,
            },
          };
          if (['command-text-v14', 'command-light-text-v14'].includes(model)) {
            config[FunctionName.CHAT_COMPLETE] =
              bedrockCohereChatCompleteConfig;
            config.responseTransforms = config.responseTransforms || {};
            config.responseTransforms[FunctionName.STREAM_CHAT_COMPLETE] =
              bedrockCohereChatCompleteStreamChunkTransform as unknown as ResponseTransformFunction;
            config.responseTransforms[FunctionName.CHAT_COMPLETE] =
              bedrockCohereChatCompleteResponseTransform as unknown as ResponseTransformFunction;
          }
          break;
        case 'meta':
          config = {
            complete: BedrockLLamaCompleteConfig,
            api: bedrockAPIConfig as unknown as InternalProviderAPIConfig,
            responseTransforms: {
              [FunctionName.STREAM_COMPLETE]:
                bedrockLlamaCompleteStreamChunkResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.COMPLETE]:
                bedrockLlamaCompleteResponseTransform as unknown as ResponseTransformFunction,
            },
          };
          break;
        case 'mistral':
          config = {
            complete: BedrockMistralCompleteConfig,
            api: bedrockAPIConfig as unknown as InternalProviderAPIConfig,
            responseTransforms: {
              [FunctionName.STREAM_COMPLETE]:
                bedrockMistralCompleteStreamChunkResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.COMPLETE]:
                bedrockMistralCompleteResponseTransform as unknown as ResponseTransformFunction,
            },
          };
          break;
        case 'amazon':
          config = {
            complete: bedrockTitanCompleteConfig,
            embed: bedrockTitanEmbedConfig,
            api: bedrockAPIConfig as unknown as InternalProviderAPIConfig,
            responseTransforms: {
              [FunctionName.STREAM_COMPLETE]:
                bedrockTitanCompleteStreamChunkResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.COMPLETE]:
                bedrockTitanCompleteResponseTransform as unknown as ResponseTransformFunction,
              [FunctionName.EMBED]:
                bedrockTitanEmbedResponseTransform as unknown as ResponseTransformFunction,
            },
          };
          break;
        case AIProvider.AI21:
          config = {
            api: bedrockAPIConfig as unknown as InternalProviderAPIConfig,
            [FunctionName.COMPLETE]: bedrockAI21CompleteConfig,
            [FunctionName.CHAT_COMPLETE]: bedrockConverseAI21ChatCompleteConfig,
            responseTransforms: {
              [FunctionName.COMPLETE]:
                bedrockAI21CompleteResponseTransform as unknown as ResponseTransformFunction,
            },
          };
          if (['j2-mid-v1', 'j2-ultra-v1'].includes(model)) {
            config[FunctionName.CHAT_COMPLETE] = bedrockAI21ChatCompleteConfig;
            config.responseTransforms = config.responseTransforms || {};
            config.responseTransforms[FunctionName.CHAT_COMPLETE] =
              bedrockAI21ChatCompleteResponseTransform as unknown as ResponseTransformFunction;
          }
          break;
        case 'stability':
          if (model && BEDROCK_STABILITY_V1_MODELS.includes(model)) {
            return {
              [FunctionName.GENERATE_IMAGE]:
                bedrockStabilityAIImageGenerateV1Config,
              api: bedrockAPIConfig,
              responseTransforms: {
                [FunctionName.GENERATE_IMAGE]:
                  bedrockStabilityAIImageGenerateV1ResponseTransform,
              },
            };
          }
          return {
            [FunctionName.GENERATE_IMAGE]:
              bedrockStabilityAIImageGenerateV2Config,
            api: bedrockAPIConfig,
            responseTransforms: {
              [FunctionName.GENERATE_IMAGE]:
                bedrockStabilityAIImageGenerateV2ResponseTransform,
            },
          };
      }
      if (!config[FunctionName.CHAT_COMPLETE]) {
        config[FunctionName.CHAT_COMPLETE] = bedrockConverseChatCompleteConfig;
      }
      if (!config.responseTransforms?.[FunctionName.STREAM_CHAT_COMPLETE]) {
        config.responseTransforms = {
          ...(config.responseTransforms ?? {}),
          [FunctionName.STREAM_CHAT_COMPLETE]:
            bedrockChatCompleteStreamChunkTransform as unknown as ResponseTransformFunction,
        };
      }
      if (!config.responseTransforms?.[FunctionName.CHAT_COMPLETE]) {
        config.responseTransforms = {
          ...(config.responseTransforms ?? {}),
          [FunctionName.CHAT_COMPLETE]:
            bedrockChatCompleteResponseTransform as unknown as ResponseTransformFunction,
        };
      }
    }

    const commonResponseTransforms: {
      [key in FunctionName]?: ResponseTransformFunction;
    } = {
      [FunctionName.UPLOAD_FILE]: bedrockUploadFileResponseTransform,
      [FunctionName.CREATE_BATCH]: bedrockCreateBatchResponseTransform,
      [FunctionName.CANCEL_BATCH]: bedrockCancelBatchResponseTransform,
      [FunctionName.RETRIEVE_BATCH]: bedrockRetrieveBatchResponseTransform,
      [FunctionName.LIST_BATCHES]: bedrockListBatchesResponseTransform,
      // [FunctionName.GET_BATCH_OUTPUT]: bedrockGetBatchOutputResponseTransform, // TODO: Add this back in when we have a way to handle the response
      [FunctionName.RETRIEVE_FILE_CONTENT]:
        bedrockRetrieveFileContentResponseTransform,
      [FunctionName.CREATE_FINE_TUNING_JOB]:
        bedrockCreateFinetuneResponseTransform,
      [FunctionName.RETRIEVE_FINE_TUNING_JOB]: bedrockFinetuneResponseTransform,
      [FunctionName.LIST_FINE_TUNING_JOBS]:
        bedrockListFinetuneResponseTransform,
      [FunctionName.LIST_FILES]: bedrockListFilesResponseTransform,
      [FunctionName.DELETE_FILE]: bedrockDeleteFileResponseTransform,
    };
    if (!config.responseTransforms) {
      config.responseTransforms = commonResponseTransforms;
    } else {
      config.responseTransforms = {
        ...config.responseTransforms,
        ...commonResponseTransforms,
      };
    }
    config[FunctionName.CREATE_BATCH] = BedrockCreateBatchConfig;
    config[FunctionName.CREATE_FINE_TUNING_JOB] = BedrockCreateFinetuneConfig;
    config[FunctionName.CANCEL_BATCH] = {};
    config[FunctionName.CANCEL_FINE_TUNING_JOB] = {};
    return config;
  },
};
