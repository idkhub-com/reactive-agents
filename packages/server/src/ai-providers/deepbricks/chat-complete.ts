import { generateErrorResponse } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const deepbricksChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'gpt-3.5-turbo',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      if (!raRequestBody.messages || raRequestBody.messages.length === 0) {
        return undefined;
      }
      return raRequestBody.messages.map((message: ChatCompletionMessage) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  functions: {
    param: 'functions',
  },
  function_call: {
    param: 'function_call',
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 2,
  },
  top_p: {
    param: 'top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  n: {
    param: 'n',
    default: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  stop: {
    param: 'stop',
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    min: -2,
    max: 2,
  },
  logit_bias: {
    param: 'logit_bias',
  },
  user: {
    param: 'user',
  },
  seed: {
    param: 'seed',
  },
  tools: {
    param: 'tools',
  },
  tool_choice: {
    param: 'tool_choice',
  },
  response_format: {
    param: 'response_format',
  },
  logprobs: {
    param: 'logprobs',
    default: false,
  },
  top_logprobs: {
    param: 'top_logprobs',
  },
  stream_options: {
    param: 'stream_options',
  },
};

export const deepbricksErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
  provider: string,
): ErrorResponseBody => {
  const error = aiProviderResponseBody.error as {
    message: string;
    type?: string;
    param?: string;
    code?: string;
  };

  return generateErrorResponse(
    {
      ...error,
    },
    provider,
  );
};

export const deepbricksChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return deepbricksErrorResponseTransform(
        aiProviderResponseBody,
        AIProvider.DEEPBRICKS,
      );
    }

    return aiProviderResponseBody as unknown as ChatCompletionResponseBody;
  };

// export const deepbricksChatCompleteJSONToStreamResponseTransform: JSONToStreamGeneratorTransformFunction =
//   (aiProviderResponseBody, provider) => {
//     const streamChunkArray: string[] = [];

//     const chatCompleteResponseBody =
//       aiProviderResponseBody as unknown as DeepbricksChatCompleteResponse;
//     const { id, model, system_fingerprint, choices } = chatCompleteResponseBody;

//     const { prompt_tokens, completion_tokens } =
//       chatCompleteResponseBody.usage || {};

//     let total_tokens;
//     if (prompt_tokens && completion_tokens)
//       total_tokens = prompt_tokens + completion_tokens;

//     const streamChunkTemplate: Record<string, unknown> = {
//       id,
//       object: 'chat.completion.chunk',
//       created: Date.now(),
//       model: model || '',
//       system_fingerprint: system_fingerprint || null,
//       provider,
//       usage: {
//         ...(completion_tokens && { completion_tokens }),
//         ...(prompt_tokens && { prompt_tokens }),
//         ...(total_tokens && { total_tokens }),
//       },
//     };

//     for (const [index, choice] of choices.entries()) {
//       if (choice.message?.tool_calls?.length) {
//         for (const [
//           toolCallIndex,
//           toolCall,
//         ] of choice.message.tool_calls.entries()) {
//           const toolCallNameChunk = {
//             index: toolCallIndex,
//             id: toolCall.id,
//             type: 'function',
//             function: {
//               name: toolCall.function.name,
//               arguments: '',
//             },
//           };

//           const toolCallArgumentChunk = {
//             index: toolCallIndex,
//             function: {
//               arguments: toolCall.function.arguments,
//             },
//           };

//           streamChunkArray.push(
//             `data: ${JSON.stringify({
//               ...streamChunkTemplate,
//               choices: [
//                 {
//                   index: index,
//                   delta: {
//                     role: 'assistant',
//                     content: null,
//                     tool_calls: [toolCallNameChunk],
//                   },
//                 },
//               ],
//             })}\n\n`,
//           );

//           streamChunkArray.push(
//             `data: ${JSON.stringify({
//               ...streamChunkTemplate,
//               choices: [
//                 {
//                   index: index,
//                   delta: {
//                     role: 'assistant',
//                     tool_calls: [toolCallArgumentChunk],
//                   },
//                 },
//               ],
//             })}\n\n`,
//           );
//         }
//       }

//       if (
//         typeof choice.message?.content === 'string' &&
//         choice.message.content.length > 0
//       ) {
//         const individualWords: string[] = [];
//         for (let i = 0; i < choice.message.content.length; i += 4) {
//           individualWords.push(choice.message.content.slice(i, i + 4));
//         }
//         individualWords.forEach((word: string) => {
//           streamChunkArray.push(
//             `data: ${JSON.stringify({
//               ...streamChunkTemplate,
//               choices: [
//                 {
//                   index: index,
//                   delta: {
//                     role: 'assistant',
//                     content: word,
//                   },
//                 },
//               ],
//             })}\n\n`,
//           );
//         });
//       }

//       streamChunkArray.push(
//         `data: ${JSON.stringify({
//           ...streamChunkTemplate,
//           choices: [
//             {
//               index: index,
//               delta: {},
//               finish_reason: choice.finish_reason,
//             },
//           ],
//         })}\n\n`,
//       );
//     }

//     streamChunkArray.push(`data: [DONE]\n\n`);
//     return streamChunkArray;
//   };  // TODO: fix this
