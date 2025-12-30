import { generateErrorResponse } from '@api/utils/ai-provider';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import { AIProvider } from '@shared/types/constants';

export const groqErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
  aiProviderResponseStatus: number,
): ErrorResponseBody => {
  const error = aiProviderResponseBody.error;

  // Extract error details with proper type checking
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : typeof error === 'string'
        ? error
        : 'Unknown error occurred';

  const type =
    typeof error === 'object' && error && 'type' in error
      ? String(error.type)
      : undefined;

  const param =
    typeof error === 'object' && error && 'param' in error
      ? String(error.param)
      : undefined;

  const code =
    typeof error === 'object' && error && 'code' in error
      ? String(error.code)
      : aiProviderResponseStatus.toString();

  return generateErrorResponse(
    {
      message,
      type,
      param,
      code,
    },
    AIProvider.GROQ,
  );
};
