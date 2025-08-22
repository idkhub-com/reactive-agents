import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';

export interface AzureAIInferenceChatCompleteResponse
  extends ChatCompletionResponseBody {}

export interface AzureAIInferenceCompleteResponse
  extends CompletionResponseBody {}

export interface AzureAIInferenceEmbedResponse
  extends CreateEmbeddingsResponseBody {}
