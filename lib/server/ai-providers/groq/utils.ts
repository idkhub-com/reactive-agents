import { generateErrorResponse } from '@server/utils/ai-provider';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import { AIProvider } from '@shared/types/constants';

export const groqErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
  aiProviderResponseStatus: number,
): ErrorResponseBody => {
  return generateErrorResponse(
    {
      message: aiProviderResponseBody.error as string,
      type: undefined,
      param: undefined,
      code: aiProviderResponseStatus.toString(),
    },
    AIProvider.GROQ,
  );
};
