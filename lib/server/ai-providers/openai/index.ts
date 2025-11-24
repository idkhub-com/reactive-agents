import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  createModelResponseParams,
  openAICreateModelResponseTransformer,
  openAIDeleteModelResponseTransformer,
  openAIGetModelResponseTransformer,
  openAIListInputItemsResponseTransformer,
} from '../open-ai-base';
import { openAIAPIConfig } from './api';
import { openAICancelBatchResponseTransform } from './cancel-batch';
import {
  openAIChatCompleteConfig,
  openAIChatCompleteResponseTransform,
} from './chat-complete';
import {
  openAICompleteConfig,
  openAICompleteResponseTransform,
} from './complete';
import {
  openAICreateBatchConfig,
  openAICreateBatchResponseTransform,
} from './create-batch';
import {
  openAICreateFinetuneConfig,
  openAIFinetuneResponseTransform,
} from './create-finetune';
import {
  openAICreateSpeechConfig,
  openAICreateSpeechResponseTransform,
} from './create-speech';
import { openAICreateTranscriptionResponseTransform } from './create-transcription';
import { openAICreateTranslationResponseTransform } from './create-translation';
import { openAIDeleteFileResponseTransform } from './delete-file';
import { openAIEmbedConfig } from './embed';
import {
  openAIImageGenerateConfig,
  openAIImageGenerateResponseTransform,
} from './image-generate';
import { openAIListBatchesResponseTransform } from './list-batches';
import { openAIGetFilesResponseTransform } from './list-files';
import { openAIModelCapabilities } from './model-capabilities';
import { openAIRetrieveBatchResponseTransform } from './retrieve-batch';
import { openAIGetFileContentResponseTransform } from './retrieve-file-content';
import {
  openAIFileUploadRequestTransform,
  openAIUploadFileResponseTransform,
} from './upload-file';

export const openAIConfig: AIProviderConfig = {
  api: openAIAPIConfig,
  modelCapabilities: openAIModelCapabilities,
  // Audio API
  [FunctionName.CREATE_SPEECH]: openAICreateSpeechConfig,

  // Batch API
  [FunctionName.CREATE_BATCH]: openAICreateBatchConfig,

  // Chat Completions API
  [FunctionName.CHAT_COMPLETE]: openAIChatCompleteConfig,
  [FunctionName.STREAM_CHAT_COMPLETE]: openAIChatCompleteConfig,

  // Completions API
  [FunctionName.COMPLETE]: openAICompleteConfig,
  [FunctionName.STREAM_COMPLETE]: openAICompleteConfig,

  // Embeddings API
  [FunctionName.EMBED]: openAIEmbedConfig,

  // Image Generation API
  [FunctionName.GENERATE_IMAGE]: openAIImageGenerateConfig,

  // Finetuning API
  [FunctionName.CREATE_FINE_TUNING_JOB]: openAICreateFinetuneConfig,

  // Responses API
  [FunctionName.CREATE_MODEL_RESPONSE]: createModelResponseParams([
    'temperature',
    'top_p',
    'frequency_penalty',
    'presence_penalty',
  ]),

  requestTransforms: {
    [FunctionName.UPLOAD_FILE]: openAIFileUploadRequestTransform,
  },
  responseTransforms: {
    // Audio API
    [FunctionName.CREATE_SPEECH]: openAICreateSpeechResponseTransform,
    [FunctionName.CREATE_TRANSCRIPTION]:
      openAICreateTranscriptionResponseTransform,
    [FunctionName.CREATE_TRANSLATION]: openAICreateTranslationResponseTransform,

    // Batch API
    [FunctionName.CREATE_BATCH]: openAICreateBatchResponseTransform,
    [FunctionName.RETRIEVE_BATCH]: openAIRetrieveBatchResponseTransform,
    [FunctionName.CANCEL_BATCH]: openAICancelBatchResponseTransform,
    [FunctionName.LIST_BATCHES]: openAIListBatchesResponseTransform,

    // Chat Completions API
    [FunctionName.CHAT_COMPLETE]: openAIChatCompleteResponseTransform,
    // Note: STREAM_CHAT_COMPLETE has no transformer - OpenAI already returns correct format

    // Completions API
    [FunctionName.COMPLETE]: openAICompleteResponseTransform,
    // Note: STREAM_COMPLETE has no transformer - OpenAI already returns correct format

    // Files API
    [FunctionName.UPLOAD_FILE]: openAIUploadFileResponseTransform,
    [FunctionName.LIST_FILES]: openAIGetFilesResponseTransform,
    [FunctionName.RETRIEVE_FILE]: openAIGetFilesResponseTransform,
    [FunctionName.DELETE_FILE]: openAIDeleteFileResponseTransform,
    [FunctionName.RETRIEVE_FILE_CONTENT]: openAIGetFileContentResponseTransform,

    // Finetuning API
    [FunctionName.CREATE_FINE_TUNING_JOB]: openAIFinetuneResponseTransform,
    [FunctionName.RETRIEVE_FINE_TUNING_JOB]: openAIFinetuneResponseTransform,

    // Images API
    [FunctionName.GENERATE_IMAGE]: openAIImageGenerateResponseTransform,

    // Responses API
    [FunctionName.CREATE_MODEL_RESPONSE]: openAICreateModelResponseTransformer(
      AIProvider.OPENAI,
    ),
    [FunctionName.GET_MODEL_RESPONSE]: openAIGetModelResponseTransformer(
      AIProvider.OPENAI,
    ),
    [FunctionName.DELETE_MODEL_RESPONSE]: openAIDeleteModelResponseTransformer(
      AIProvider.OPENAI,
    ),
    [FunctionName.LIST_RESPONSE_INPUT_ITEMS]:
      openAIListInputItemsResponseTransformer(AIProvider.OPENAI),
  },
};
