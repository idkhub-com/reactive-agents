import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateSpeechResponseBody } from '@shared/types/api/routes/audio-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAICreateSpeechConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'tts-1',
  },
  input: {
    param: 'input',
    required: true,
  },
  voice: {
    param: 'voice',
    required: true,
    default: 'alloy',
  },
  response_format: {
    param: 'response_format',
    required: false,
    default: 'mp3',
  },
  speed: {
    param: 'speed',
    required: false,
    default: 1,
  },
};

export const openAICreateSpeechResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as unknown as CreateSpeechResponseBody;
};
