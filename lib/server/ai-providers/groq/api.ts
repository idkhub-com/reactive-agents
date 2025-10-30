import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const groqAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.groq.com/openai/v1',
  headers: ({ raTarget, raRequestData }) => {
    const headersObj: Record<string, string> = {
      Authorization: `Bearer ${raTarget.api_key}`,
    };
    if (
      raRequestData.functionName === FunctionName.CREATE_TRANSCRIPTION ||
      raRequestData.functionName === FunctionName.CREATE_TRANSLATION
    )
      headersObj['Content-Type'] = 'multipart/form-data';
    return headersObj;
  },
  getEndpoint: ({ raRequestData }) => {
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.CREATE_TRANSCRIPTION:
        return '/audio/transcriptions';
      case FunctionName.CREATE_TRANSLATION:
        return '/audio/translations';
      case FunctionName.CREATE_SPEECH:
        return '/audio/speech';
      case FunctionName.CREATE_MODEL_RESPONSE:
        return '/chat/completions';
      default:
        return '';
    }
  },
};
