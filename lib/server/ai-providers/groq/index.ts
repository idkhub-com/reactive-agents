import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  chatCompleteParams,
  createSpeechParams,
  responseTransformers,
} from '../open-ai-base';
import { groqAPIConfig } from './api';
import { groqChatCompleteStreamChunkTransform } from './chat-complete';

export const groqConfig: AIProviderConfig = {
  api: groqAPIConfig,
  [FunctionName.CHAT_COMPLETE]: chatCompleteParams([
    'logprobs',
    'logits_bias',
    'top_logprobs',
  ]),
  [FunctionName.CREATE_TRANSCRIPTION]: {},
  [FunctionName.CREATE_TRANSLATION]: {},
  [FunctionName.CREATE_SPEECH]: createSpeechParams([]),
  responseTransforms: {
    ...responseTransformers(AIProvider.GROQ, {
      chatComplete: true,
      createSpeech: true,
    }),
    [FunctionName.STREAM_CHAT_COMPLETE]: groqChatCompleteStreamChunkTransform,
  },
};
