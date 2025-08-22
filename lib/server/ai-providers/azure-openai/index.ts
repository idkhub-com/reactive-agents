import { azureOpenAICreateTranscriptionResponseTransform } from '@server/ai-providers/azure-openai/create-transcription';
import { azureOpenAICreateTranslationResponseTransform } from '@server/ai-providers/azure-openai/create-translation';
import { azureOpenAIResponseTransform } from '@server/ai-providers/azure-openai/upload-file';
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
import { openAICreateFinetuneConfig } from '../openai/create-finetune';
import { openAIFileUploadRequestTransform } from '../openai/upload-file';
import { azureOpenAIAPIConfig } from './api';
import {
  azureOpenAIChatCompleteConfig,
  azureOpenAIChatCompleteResponseTransform,
} from './chat-complete';
import {
  azureOpenAICompleteConfig,
  azureOpenAICompleteResponseTransform,
} from './complete';
import { azureOpenAICreateBatchConfig } from './create-batch';
import {
  azureOpenAICreateSpeechConfig,
  azureOpenAICreateSpeechResponseTransform,
} from './create-speech';
import {
  azureOpenAIEmbedConfig,
  azureOpenAIEmbedResponseTransform,
} from './embed';
import { azureOpenAIGetBatchOutputRequestHandler } from './get-batch-output';
import {
  azureOpenAIImageGenerateConfig,
  azureOpenAIImageGenerateResponseTransform,
} from './image-generate';
import { azureOpenAIFinetuneResponseTransform } from './utils';

export const azureOpenAIConfig: AIProviderConfig = {
  api: azureOpenAIAPIConfig,
  [FunctionName.COMPLETE]: azureOpenAICompleteConfig,
  [FunctionName.EMBED]: azureOpenAIEmbedConfig,
  [FunctionName.GENERATE_IMAGE]: azureOpenAIImageGenerateConfig,
  [FunctionName.CHAT_COMPLETE]: azureOpenAIChatCompleteConfig,
  [FunctionName.CREATE_SPEECH]: azureOpenAICreateSpeechConfig,
  [FunctionName.CREATE_FINE_TUNING_JOB]: openAICreateFinetuneConfig,
  [FunctionName.CREATE_TRANSCRIPTION]: {},
  [FunctionName.CREATE_TRANSLATION]: {},
  [FunctionName.REALTIME]: {},
  [FunctionName.CANCEL_FINE_TUNING_JOB]: {},
  [FunctionName.CANCEL_BATCH]: {},
  [FunctionName.CREATE_BATCH]: azureOpenAICreateBatchConfig,
  [FunctionName.CREATE_MODEL_RESPONSE]: createModelResponseParams([]),
  [FunctionName.GET_MODEL_RESPONSE]: {},
  [FunctionName.DELETE_MODEL_RESPONSE]: {},
  [FunctionName.LIST_RESPONSE_INPUT_ITEMS]: {},
  requestHandlers: {
    [FunctionName.GET_BATCH_OUTPUT]: azureOpenAIGetBatchOutputRequestHandler,
  },
  // Transforms the Azure OpenAI response to the IDK response
  responseTransforms: {
    [FunctionName.COMPLETE]: azureOpenAICompleteResponseTransform,
    [FunctionName.CHAT_COMPLETE]: azureOpenAIChatCompleteResponseTransform,
    [FunctionName.EMBED]: azureOpenAIEmbedResponseTransform,
    [FunctionName.GENERATE_IMAGE]: azureOpenAIImageGenerateResponseTransform,
    [FunctionName.CREATE_SPEECH]: azureOpenAICreateSpeechResponseTransform,
    [FunctionName.CREATE_TRANSCRIPTION]:
      azureOpenAICreateTranscriptionResponseTransform,
    [FunctionName.CREATE_TRANSLATION]:
      azureOpenAICreateTranslationResponseTransform,
    [FunctionName.UPLOAD_FILE]: azureOpenAIResponseTransform,
    [FunctionName.LIST_FILES]: azureOpenAIResponseTransform,
    [FunctionName.RETRIEVE_FILE]: azureOpenAIResponseTransform,
    [FunctionName.DELETE_FILE]: azureOpenAIResponseTransform,
    [FunctionName.RETRIEVE_FILE_CONTENT]: azureOpenAIResponseTransform,
    [FunctionName.CREATE_FINE_TUNING_JOB]: azureOpenAIResponseTransform,
    [FunctionName.RETRIEVE_FINE_TUNING_JOB]:
      azureOpenAIFinetuneResponseTransform,
    [FunctionName.CREATE_BATCH]: azureOpenAIResponseTransform,
    [FunctionName.GET_BATCH_OUTPUT]: azureOpenAIResponseTransform,
    [FunctionName.CANCEL_BATCH]: azureOpenAIResponseTransform,
    [FunctionName.LIST_BATCHES]: azureOpenAIResponseTransform,
    [FunctionName.CREATE_MODEL_RESPONSE]: openAICreateModelResponseTransformer(
      AIProvider.AZURE_OPENAI,
    ),
    [FunctionName.GET_MODEL_RESPONSE]: openAIGetModelResponseTransformer(
      AIProvider.AZURE_OPENAI,
    ),
    [FunctionName.DELETE_MODEL_RESPONSE]: openAIDeleteModelResponseTransformer(
      AIProvider.AZURE_OPENAI,
    ),
    [FunctionName.LIST_RESPONSE_INPUT_ITEMS]:
      openAIListInputItemsResponseTransformer(AIProvider.AZURE_OPENAI),
  },
  requestTransforms: {
    // [FunctionName.CREATE_FINETUNING_JOB]: azureTransformFinetuneBody,
    [FunctionName.UPLOAD_FILE]: openAIFileUploadRequestTransform,
  },
};
