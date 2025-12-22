import type { ErrorResponseBody } from '@shared/types/api/response/body';

export function generateInvalidProviderResponseError(
  aiProviderResponseBody: Record<string, unknown>,
  provider: string,
): ErrorResponseBody {
  return {
    error: {
      message: `Invalid response received from ${provider}: ${JSON.stringify(
        aiProviderResponseBody,
      )}`,
    },
    provider: provider,
  } as ErrorResponseBody;
}

export function generateErrorResponse(
  errorDetails: {
    message: string;
    type?: string;
    param?: string;
    code?: string;
  },
  provider: string,
): ErrorResponseBody {
  const errorResponse: ErrorResponseBody = {
    error: {
      message: `${provider} error: ${errorDetails.message}`,
      type: errorDetails.type,
      param: errorDetails.param,
      code: errorDetails.code,
    },
    provider: provider,
  };
  return errorResponse;
}

type SplitResult = {
  before: string;
  after: string;
};

export function splitString(input: string, separator: string): SplitResult {
  const sepIndex = input.indexOf(separator);

  if (sepIndex === -1) {
    return {
      before: input,
      after: '',
    };
  }

  return {
    before: input.substring(0, sepIndex),
    after: input.substring(sepIndex + 1),
  };
}
