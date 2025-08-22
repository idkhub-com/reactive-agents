import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api';

export interface DeepbricksChatCompleteResponse
  extends ChatCompletionResponseBody {
  system_fingerprint: string;
}

interface DeepbricksImageObject {
  b64_json?: string; // The base64-encoded JSON of the generated image, if response_format is b64_json.
  url?: string; // The URL of the generated image, if response_format is url (default).
  revised_prompt?: string; // The prompt that was used to generate the image, if there was any revision to the prompt.
}

export interface DeepbricksImageGenerateResponse
  extends GenerateImageResponseBody {
  data: DeepbricksImageObject[];
}
