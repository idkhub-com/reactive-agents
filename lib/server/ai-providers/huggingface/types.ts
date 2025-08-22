import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';

export interface HuggingfaceChatCompleteResponse
  extends ChatCompletionResponseBody {}

export interface HuggingfaceCompleteResponse extends CompletionResponseBody {}

export interface HuggingfaceErrorResponse extends ErrorResponseBody {}
