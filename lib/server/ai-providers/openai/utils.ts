import { generateErrorResponse } from '@server/utils/ai-provider';
import type { ErrorResponseBody } from '@shared/types/api/response/body';

export const openAIErrorResponseTransform = (
  response: Record<string, unknown>,
  provider: string,
): ErrorResponseBody => {
  return generateErrorResponse(
    {
      ...(response.error as unknown as {
        message: string;
        type?: string;
        param?: string;
        code?: string;
      }),
    },
    provider,
  );
};
