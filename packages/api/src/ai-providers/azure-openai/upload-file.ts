import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import type { FileUploadResponseBody } from '@shared/types/api/routes/files-api';

export const azureOpenAIResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
) => {
  return aiProviderResponseBody as unknown as FileUploadResponseBody;
};
