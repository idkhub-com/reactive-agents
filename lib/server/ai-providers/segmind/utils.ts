import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type { ErrorResponseBody } from '@shared/types/api/response';
import { AIProvider } from '@shared/types/constants';

interface SegmindErrorResponse {
  'html-message'?: string;
  error?: string;
}

export const segmindErrorResponseTransform = (
  aiProviderResponseBody: SegmindErrorResponse | Record<string, unknown>,
): ErrorResponseBody => {
  if ('error' in aiProviderResponseBody && aiProviderResponseBody.error) {
    return generateErrorResponse(
      {
        message: aiProviderResponseBody.error as string,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.SEGMIND,
    );
  }

  if (
    'html-message' in aiProviderResponseBody &&
    aiProviderResponseBody['html-message']
  ) {
    return generateErrorResponse(
      {
        message: aiProviderResponseBody['html-message'] as string,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.SEGMIND,
    );
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as Record<string, unknown>,
    AIProvider.SEGMIND,
  );
};
