import { generateErrorResponse } from '@server/utils/ai-provider';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import { AIProvider } from '@shared/types/constants';

export interface WorkersAIErrorResponse {
  success: boolean;
  errors: WorkersAIErrorObject[];
}

export interface WorkersAIErrorObject {
  code: string;
  message: string;
}

export const workersAIErrorResponseTransform = (
  response: Record<string, unknown>,
): ErrorResponseBody => {
  if ('errors' in response && Array.isArray(response.errors)) {
    const errors = response.errors as WorkersAIErrorObject[];
    return generateErrorResponse(
      {
        message: errors
          .map((error) => `Error ${error.code}: ${error.message}`)
          .join(', '),
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.WORKERS_AI,
    );
  }

  return generateErrorResponse(
    {
      message: 'Unknown error occurred',
      type: undefined,
      param: undefined,
      code: undefined,
    },
    AIProvider.WORKERS_AI,
  );
};
