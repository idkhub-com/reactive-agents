/**
 * Centralized error classification that works with ALL 37+ AI providers automatically
 * This analyzes any error response format and determines the appropriate HTTP status code
 */

import type { ErrorResponseBody } from '@shared/types/api/response/body';

export enum ErrorClassification {
  CLIENT_ERROR = 'client_error',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown',
}

export interface ErrorAnalysis {
  classification: ErrorClassification;
  statusCode: number;
  genericMessage?: string;
}

/**
 * Analyzes any error response (regardless of provider format) and classifies it
 */
export function analyzeError(
  errorResponse: Record<string, unknown>,
  originalStatus: number,
): ErrorAnalysis {
  // Extract error information from ANY error response format
  const errorTexts = extractErrorTexts(errorResponse);

  // Start with HTTP status-based classification, but allow refinement
  if (originalStatus >= 400 && originalStatus < 500) {
    // For 4xx errors, determine the most appropriate specific status code
    const specificStatusCode = getSpecificClientErrorStatus(
      errorTexts,
      originalStatus,
    );
    return {
      classification: ErrorClassification.CLIENT_ERROR,
      statusCode: specificStatusCode,
      ...(specificStatusCode !== originalStatus && {
        genericMessage: getGenericClientMessage(errorTexts),
      }),
    };
  }

  if (originalStatus >= 500) {
    // For 5xx errors, determine the most appropriate specific status code
    const specificStatusCode = getSpecificServerErrorStatus(
      errorTexts,
      originalStatus,
    );
    return {
      classification: ErrorClassification.SERVER_ERROR,
      statusCode: specificStatusCode,
      genericMessage: getGenericServerMessage(errorTexts),
    };
  }

  // Check for client error indicators in any text field
  const isClientError = hasClientErrorIndicators(errorTexts);

  if (isClientError) {
    const specificStatusCode = getSpecificClientErrorStatus(errorTexts, 400);
    return {
      classification: ErrorClassification.CLIENT_ERROR,
      statusCode: specificStatusCode,
      genericMessage: getGenericClientMessage(errorTexts),
    };
  }

  // Default to server error for unknown cases
  return {
    classification: ErrorClassification.SERVER_ERROR,
    statusCode: 500,
    genericMessage: getGenericServerMessage(errorTexts),
  };
}

/**
 * Extracts all text values from an error response (works with any provider format)
 * Includes protection against circular references and excessive depth
 */
export function extractErrorTexts(obj: Record<string, unknown>): string[] {
  const texts: string[] = [];
  const visited = new WeakSet<object>();
  const MAX_DEPTH = 10; // Prevent excessive recursion depth

  function extract(value: unknown, depth = 0): void {
    // Prevent excessive recursion depth
    if (depth > MAX_DEPTH) {
      return;
    }

    if (typeof value === 'string') {
      texts.push(value.toLowerCase());
    } else if (typeof value === 'object' && value !== null) {
      // Prevent circular references
      if (visited.has(value)) {
        return;
      }
      visited.add(value);

      if (Array.isArray(value)) {
        value.forEach((item) => {
          extract(item, depth + 1);
        });
      } else {
        Object.entries(value).forEach(([_, val]) => {
          extract(val, depth + 1);
        });
      }
    }
  }

  extract(obj);
  return texts;
}

/**
 * Determines the most appropriate HTTP status code for client errors
 */
function getSpecificClientErrorStatus(
  texts: string[],
  originalStatus: number,
): number {
  const joinedText = texts.join(' ').toLowerCase();

  // Authentication errors -> 401
  if (
    joinedText.includes('invalid_api_key') ||
    joinedText.includes('authentication_error') ||
    joinedText.includes('unauthorized') ||
    joinedText.includes('api key') ||
    joinedText.includes('authentication') ||
    joinedText.includes('auth') ||
    joinedText.includes('credential')
  ) {
    return 401;
  }

  // Rate limiting errors -> 429
  if (
    joinedText.includes('rate_limit') ||
    joinedText.includes('usage_limit') ||
    joinedText.includes('quota') ||
    joinedText.includes('limit') ||
    joinedText.includes('exceeded') ||
    joinedText.includes('too many requests')
  ) {
    return 429;
  }

  // Not found errors -> 404
  if (
    joinedText.includes('model_not_found') ||
    joinedText.includes('model not found') ||
    joinedText.includes('not found') ||
    joinedText.includes('endpoint not found')
  ) {
    return 404;
  }

  // Validation/unprocessable entity errors -> 422
  if (
    joinedText.includes('validation_error') ||
    joinedText.includes('missing_parameter') ||
    joinedText.includes('required_parameter') ||
    joinedText.includes('invalid_parameter') ||
    joinedText.includes('validation') ||
    joinedText.includes('missing') ||
    joinedText.includes('required') ||
    joinedText.includes('malformed')
  ) {
    return 422;
  }

  // Forbidden/permission errors -> 403
  if (
    joinedText.includes('forbidden') ||
    joinedText.includes('permission') ||
    joinedText.includes('access denied') ||
    joinedText.includes('insufficient permissions')
  ) {
    return 403;
  }

  // If we have a specific 4xx status from the provider, prefer it over generic 400
  if (originalStatus >= 400 && originalStatus < 500 && originalStatus !== 400) {
    return originalStatus;
  }

  // Default to 400 for other client errors
  return 400;
}

/**
 * Determines the most appropriate HTTP status code for server errors
 */
function getSpecificServerErrorStatus(
  texts: string[],
  originalStatus: number,
): number {
  const joinedText = texts.join(' ').toLowerCase();

  // Timeout errors -> 408
  if (
    joinedText.includes('timeout') ||
    joinedText.includes('timed out') ||
    joinedText.includes('request timeout')
  ) {
    return 408;
  }

  // Bad gateway/upstream errors -> 502
  if (
    joinedText.includes('bad gateway') ||
    joinedText.includes('upstream') ||
    joinedText.includes('proxy error')
  ) {
    return 502;
  }

  // Service unavailable -> 503
  if (
    joinedText.includes('service unavailable') ||
    joinedText.includes('temporarily unavailable') ||
    joinedText.includes('maintenance') ||
    joinedText.includes('overload') ||
    joinedText.includes('capacity') ||
    joinedText.includes('busy')
  ) {
    return 503;
  }

  // If we have a specific 5xx status from the provider, prefer it over generic 500
  if (originalStatus >= 500 && originalStatus !== 500) {
    return originalStatus;
  }

  // Default to 500 for other server errors
  return 500;
}

/**
 * Checks if any text contains client error indicators
 */
function hasClientErrorIndicators(texts: string[]): boolean {
  const clientErrorIndicators = [
    // Authentication errors
    'invalid_api_key',
    'authentication_error',
    'unauthorized',
    'invalid_request_error',
    'api key',
    'authentication',
    'auth',
    'credential',

    // Quota/billing errors
    'insufficient_quota',
    'quota',
    'billing',
    'limit',
    'rate_limit',
    'usage_limit',
    'exceeded',
    'insufficient_credits',

    // Validation errors
    'validation_error',
    'invalid_request',
    'bad_request',
    'missing_parameter',
    'required_parameter',
    'invalid_parameter',
    'validation',
    'missing',
    'required',

    // Model/content errors
    'model_not_found',
    'invalid_prompt',
    'content_filter',
    'model not found',
    'invalid model',
    'content_filtering',
    'safety',

    // General client errors
    'invalid',
    'malformed',
    'unsupported',
    'forbidden',
  ];

  return texts.some((text) =>
    clientErrorIndicators.some((indicator) => text.includes(indicator)),
  );
}

/**
 * Generates generic client error messages based on error content
 */
function getGenericClientMessage(texts: string[]): string {
  const joinedText = texts.join(' ');

  if (
    joinedText.includes('authentication') ||
    joinedText.includes('api key') ||
    joinedText.includes('unauthorized')
  ) {
    return 'Authentication failed. Please check your API key.';
  }
  if (
    joinedText.includes('quota') ||
    joinedText.includes('limit') ||
    joinedText.includes('billing')
  ) {
    return 'Usage quota exceeded. Please check your billing and usage limits.';
  }
  if (
    joinedText.includes('model') &&
    (joinedText.includes('not found') || joinedText.includes('invalid'))
  ) {
    return 'The specified model was not found or is invalid.';
  }
  if (joinedText.includes('content_filter') || joinedText.includes('safety')) {
    return 'Request blocked by content filtering policies.';
  }
  if (
    joinedText.includes('validation') ||
    joinedText.includes('parameter') ||
    joinedText.includes('missing') ||
    joinedText.includes('required')
  ) {
    return 'Invalid request parameters. Please check your request format.';
  }

  return 'Bad request. Please check your request parameters and try again.';
}

/**
 * Generates generic server error messages based on error content
 */
function getGenericServerMessage(texts: string[]): string {
  const joinedText = texts.join(' ');

  if (joinedText.includes('timeout') || joinedText.includes('timed out')) {
    return 'Request timed out. The service is currently slow or unavailable.';
  }
  if (
    joinedText.includes('overload') ||
    joinedText.includes('capacity') ||
    joinedText.includes('busy')
  ) {
    return 'Service is currently overloaded. Please try again in a moment.';
  }
  if (joinedText.includes('internal') && joinedText.includes('error')) {
    return 'An internal server error occurred. Our team has been notified.';
  }
  if (
    joinedText.includes('maintenance') ||
    joinedText.includes('unavailable')
  ) {
    return 'Service is temporarily unavailable due to maintenance.';
  }
  if (joinedText.includes('connection') || joinedText.includes('network')) {
    return 'Network connectivity issue. Please check your connection and retry.';
  }

  return 'An unexpected server error occurred. Please retry your request.';
}

/**
 * Enhances ANY error response with classification and error details
 * Works with all provider formats automatically
 */
export function enhanceErrorResponse(
  errorResponse: ErrorResponseBody,
  originalStatus: number,
  originalProviderError?: Record<string, unknown>,
): ErrorResponseBody {
  const analysis = analyzeError(
    originalProviderError || errorResponse,
    originalStatus,
  );

  // For server errors (500), use generic message. For client errors (400), keep original message with provider prefix
  const shouldUseGenericMessage =
    analysis.classification === ErrorClassification.SERVER_ERROR;

  let finalMessage: string;
  if (shouldUseGenericMessage && analysis.genericMessage) {
    // Use generic message for server errors
    finalMessage = analysis.genericMessage;
  } else {
    // For client errors, ensure provider prefix is present
    const originalMessage = errorResponse.error.message;
    const provider = errorResponse.provider;

    // Check if the message already has a provider prefix
    const hasProviderPrefix =
      provider &&
      originalMessage.toLowerCase().includes(provider.toLowerCase());

    finalMessage = hasProviderPrefix
      ? originalMessage
      : `${provider} error: ${originalMessage}`;
  }

  return {
    ...errorResponse,
    error: {
      ...errorResponse.error,
      message: finalMessage, // Generic for 500, direct from provider for 400
    },
    error_details: {
      ...errorResponse.error_details,
      original_message: errorResponse.error.message, // Always preserve original
      original_error: originalProviderError || errorResponse,
      classification: analysis.classification,
      suggested_action: getSuggestedAction(analysis.classification),
    },
    status: analysis.statusCode,
  };
}

function getSuggestedAction(classification: ErrorClassification): string {
  switch (classification) {
    case ErrorClassification.CLIENT_ERROR:
      return 'Review and correct your request parameters, authentication, or usage limits.';
    case ErrorClassification.SERVER_ERROR:
      return 'This appears to be a server-side issue. Please retry your request.';
    default:
      return 'Please retry your request. Contact support if the issue persists.';
  }
}
