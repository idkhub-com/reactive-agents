import { generateErrorResponse } from '@server/utils/ai-provider';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import { AIProvider } from '@shared/types/constants';

/**
 * Transform Ollama error response to standardized error format
 */
export const ollamaErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
  aiProviderResponseStatus?: number,
): ErrorResponseBody => {
  const errorObj = aiProviderResponseBody.error as
    | { message?: string; type?: string; code?: string }
    | string
    | undefined;

  let message = 'Unknown error';
  let type: string | undefined;
  let code: string | undefined;

  if (typeof errorObj === 'string') {
    message = errorObj;
  } else if (errorObj && typeof errorObj === 'object') {
    message = errorObj.message || 'Unknown error';
    type = errorObj.type;
    code = errorObj.code;
  }

  return generateErrorResponse(
    {
      message,
      type,
      param: undefined,
      code: code || aiProviderResponseStatus?.toString(),
    },
    AIProvider.OLLAMA,
  );
};
