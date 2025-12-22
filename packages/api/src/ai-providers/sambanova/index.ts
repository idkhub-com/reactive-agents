import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { ChatCompletionChoice } from '@shared/types/api/routes/chat-completions-api/response';
import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { chatCompleteParams, responseTransformers } from '../open-ai-base';
import sambanovaAPIConfig from './api';
import { sambanovaChatCompleteStreamChunkTransform } from './chatComplete';

const sambanovaConfig: AIProviderConfig = {
  chat_complete: chatCompleteParams(
    [
      'functions',
      'function_call',
      'presence_penalty',
      'frequency_penalty',
      'logit_bias',
      'user',
      'seed',
      'tools',
      'tool_choice',
      'response_format',
      'logprobs',
    ],
    {
      model: 'Meta-Llama-3.1-8B-Instruct',
    },
  ),
  api: sambanovaAPIConfig,
  responseTransforms: {
    ...responseTransformers(AIProvider.SAMBANOVA, {
      chatComplete: (
        aiProviderResponseBody,
        isError,
      ): ChatCompletionResponseBody | ErrorResponseBody => {
        if (
          isError ||
          !('choices' in aiProviderResponseBody) ||
          aiProviderResponseBody === undefined
        )
          return aiProviderResponseBody as ErrorResponseBody;

        const successResponse =
          aiProviderResponseBody as unknown as ChatCompletionResponseBody;

        return {
          ...successResponse,
          provider: AIProvider.SAMBANOVA,
          choices: successResponse.choices.map(
            (choice: ChatCompletionChoice) => ({
              //P
              ...choice,
              message: {
                ...(choice.message as ChatCompletionMessage),
                role: 'assistant',
              },
            }),
          ),
          usage: {
            prompt_tokens: successResponse.usage?.prompt_tokens || 0,
            completion_tokens: successResponse.usage?.completion_tokens || 0,
            total_tokens: successResponse.usage?.total_tokens || 0,
          },
        } as ChatCompletionResponseBody;
      },
    }),
    [FunctionName.STREAM_CHAT_COMPLETE]:
      sambanovaChatCompleteStreamChunkTransform,
  },
};

export default sambanovaConfig;
