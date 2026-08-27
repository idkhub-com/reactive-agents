import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const openAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.openai.com/v1',
  headers: ({ saTarget, saRequestData }) => {
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${saTarget.api_key}`,
    };
    if (saTarget.openai_organization) {
      headersObj['OpenAI-Organization'] =
        saTarget.openai_organization as string;
    }

    if (saTarget.openai_project) {
      headersObj['OpenAI-Project'] = saTarget.openai_project as string;
    }

    if (
      saRequestData.functionName === FunctionName.CREATE_TRANSCRIPTION ||
      saRequestData.functionName === FunctionName.CREATE_TRANSLATION ||
      saRequestData.functionName === FunctionName.UPLOAD_FILE
    ) {
      headersObj['Content-Type'] = 'multipart/form-data';
    } else {
      headersObj['Content-Type'] = 'application/json';
    }

    if (saTarget.openai_beta) {
      headersObj['OpenAI-Beta'] = saTarget.openai_beta as string;
    }

    return headersObj;
  },
  getEndpoint: ({ saRequestData }) => {
    const basePath = saRequestData.url.split('/v1')?.[1];
    switch (saRequestData.functionName) {
      case FunctionName.COMPLETE:
      case FunctionName.STREAM_COMPLETE:
        return '/completions';
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.STREAM_CHAT_COMPLETE:
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
