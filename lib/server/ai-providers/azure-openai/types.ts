import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api';

export interface AzureOpenAIChatCompleteResponse
  extends ChatCompletionResponseBody {}

export interface AzureOpenAICompleteResponse extends CompletionResponseBody {}

export interface AzureOpenAIFinetuneResponse {
  status: string;
  [key: string]: unknown;
}

export interface AzureOpenAIEmbedResponse
  extends CreateEmbeddingsResponseBody {}

interface AzureOpenAIImageObject {
  b64_json?: string; // The base64-encoded JSON of the generated image, if response_format is b64_json.
  url?: string; // The URL of the generated image, if response_format is url (default).
  revised_prompt?: string; // The prompt that was used to generate the image, if there was any revision to the prompt.
}

export interface AzureOpenAIImageGenerateResponse
  extends GenerateImageResponseBody {
  data: AzureOpenAIImageObject[];
}
