import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const openAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.openai.com/v1',
  headers: ({ raTarget, raRequestData }) => {
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${raTarget.api_key}`,
    };
    if (raTarget.openai_organization) {
      headersObj['OpenAI-Organization'] =
        raTarget.openai_organization as string;
    }

    if (raTarget.openai_project) {
      headersObj['OpenAI-Project'] = raTarget.openai_project as string;
    }

    if (
      raRequestData.functionName === FunctionName.CREATE_TRANSCRIPTION ||
      raRequestData.functionName === FunctionName.CREATE_TRANSLATION ||
      raRequestData.functionName === FunctionName.UPLOAD_FILE
    ) {
      headersObj['Content-Type'] = 'multipart/form-data';
    } else {
      headersObj['Content-Type'] = 'application/json';
    }

    if (raTarget.openai_beta) {
      headersObj['OpenAI-Beta'] = raTarget.openai_beta as string;
    }

    return headersObj;
  },
  getEndpoint: ({ raRequestData }) => {
    const basePath = raRequestData.url.split('/v1')?.[1];
    switch (raRequestData.functionName) {
      case FunctionName.COMPLETE:
        return '/completions';
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.EMBED:
        return '/embeddings';
      case FunctionName.GENERATE_IMAGE:
        return '/images/generations';
      case FunctionName.CREATE_SPEECH:
        return '/audio/speech';
      case FunctionName.CREATE_TRANSCRIPTION:
        return '/audio/transcriptions';
      case FunctionName.CREATE_TRANSLATION:
        return '/audio/translations';
      // case FunctionName.REALTIME:
      //   return basePath; // TODO: Implement this
      case FunctionName.UPLOAD_FILE:
        return basePath;
      case FunctionName.RETRIEVE_FILE:
        return basePath;
      case FunctionName.LIST_FILES:
        return basePath;
      case FunctionName.DELETE_FILE:
        return basePath;
      case FunctionName.RETRIEVE_FILE_CONTENT:
        return basePath;
      case FunctionName.CREATE_BATCH:
        return basePath;
      case FunctionName.CREATE_FINE_TUNING_JOB:
        return basePath;
      case FunctionName.RETRIEVE_FINE_TUNING_JOB:
        return basePath;
      case FunctionName.LIST_FINE_TUNING_JOBS:
        return basePath;
      case FunctionName.CANCEL_FINE_TUNING_JOB:
        return basePath;
      case FunctionName.CANCEL_BATCH:
        return basePath;
      case FunctionName.LIST_BATCHES:
        return basePath;
      case FunctionName.CREATE_MODEL_RESPONSE:
        return basePath;
      // case FunctionName.GET_MODEL_RESPONSE:
      //   return basePath; // TODO: Implement this
      // case FunctionName.DELETE_MODEL_RESPONSE:
      //   return basePath; // TODO: Implement this
      // case FunctionName.LIST_RESPONSE_INPUT_ITEMS:
      //   return basePath; // TODO: Implement this
      default:
        return '';
    }
  },
};
