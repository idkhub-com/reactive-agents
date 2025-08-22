import type {} from '@shared/types/api/request/body';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';

export const getStreamModeSplitPattern = (
  provider: string,
  aiProviderRequestURL: string,
): SplitPatternType => {
  let splitPattern: SplitPatternType = '\n\n';

  if (
    provider === AIProvider.ANTHROPIC &&
    aiProviderRequestURL.endsWith('/complete')
  ) {
    splitPattern = '\r\n\r\n';
  }

  if (provider === AIProvider.COHERE) {
    splitPattern = '\n';
  }

  if (provider === AIProvider.GOOGLE) {
    splitPattern = '\r\n';
  }

  // In Vertex Anthropic and LLama have \n\n as the pattern only Gemini has \r\n\r\n
  if (
    provider === AIProvider.GOOGLE_VERTEX_AI &&
    aiProviderRequestURL.includes('/publishers/google')
  ) {
    splitPattern = '\r\n\r\n';
  }

  if (provider === AIProvider.PERPLEXITY_AI) {
    splitPattern = '\r\n\r\n';
  }

  if (provider === AIProvider.DEEPINFRA) {
    splitPattern = '\n';
  }

  if (provider === AIProvider.SAMBANOVA) {
    splitPattern = '\n';
  }

  return splitPattern;
};
export type SplitPatternType = '\n\n' | '\r\n\r\n' | '\n' | '\r\n';

export const getStreamingMode = (
  idkRequestBody: ChatCompletionRequestBody | CompletionRequestBody,
  provider: AIProvider,
  aiProviderRequestURL: string,
): boolean | undefined => {
  if (
    provider === AIProvider.GOOGLE ||
    (provider === AIProvider.GOOGLE_VERTEX_AI &&
      aiProviderRequestURL.indexOf('stream') > -1)
  ) {
    return true;
  }
  if (
    provider === AIProvider.BEDROCK &&
    (aiProviderRequestURL.indexOf('invoke-with-response-stream') > -1 ||
      aiProviderRequestURL.indexOf('converse-stream') > -1)
  ) {
    return true;
  }
  return idkRequestBody.stream;
};

export function convertKeysToCamelCase(
  obj: Record<string, unknown>,
  parentKeysToPreserve: string[] = [],
): Record<string, unknown> | Record<string, unknown>[] {
  if (typeof obj !== 'object' || obj === null) {
    return obj; // Return unchanged for non-objects or null
  }

  if (Array.isArray(obj)) {
    // If it's an array, recursively convert each element
    return obj.map((item) =>
      convertKeysToCamelCase(item, parentKeysToPreserve),
    ) as Record<string, unknown>[];
  }

  return Object.keys(obj).reduce(
    (result: Record<string, unknown>, key: string) => {
      const value = obj[key];
      const camelCaseKey = toCamelCase(key);
      const isParentKeyToPreserve = parentKeysToPreserve.includes(key);
      if (typeof value === 'object' && !isParentKeyToPreserve) {
        // Recursively convert child objects
        result[camelCaseKey] = convertKeysToCamelCase(
          value as Record<string, unknown>,
          parentKeysToPreserve,
        );
      } else {
        // Add key in camelCase to the result
        result[camelCaseKey] = value;
      }

      return result;
    },
    {},
  );

  function toCamelCase(snakeCase: string): string {
    // Remove any leading underscores first, then replace one or more
    // underscores with the following alphanumeric character's uppercase
    // version and strip any trailing underscores.
    return snakeCase
      .replace(/^_+/, '')
      .replace(/_+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
      .replace(/_+$/g, '');
  }
}
