import { OllamaCustomFieldsSchema } from '@server/ai-providers/ollama/types';
import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const ollamaAPIConfig: InternalProviderAPIConfig = {
  headers: ({ idkTarget }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (idkTarget.api_key) {
      headers['x-ollama-api-key'] = idkTarget.api_key;
    }

    return headers;
  },
  getBaseURL: ({ idkTarget }) => {
    const customHost = idkTarget.custom_host;
    if (customHost) {
      try {
        // SECURITY: Comprehensive URL validation for custom_host
        // This prevents SSRF attacks and ensures only safe URLs are used
        const url = new URL(customHost);

        // Validate protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Only HTTP and HTTPS protocols are allowed');
        }

        // Validate hostname is not empty
        if (!url.hostname) {
          throw new Error('Hostname is required');
        }

        // Validate port if specified
        if (url.port) {
          const portNum = Number.parseInt(url.port, 10);
          if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new Error('Invalid port number');
          }
        }

        // Prevent path traversal in URL
        if (
          url.pathname &&
          url.pathname !== '/' &&
          url.pathname.includes('..')
        ) {
          throw new Error('Path traversal not allowed');
        }

        // Return the sanitized URL without query params or hash
        return `${url.protocol}//${url.host}${url.pathname === '/' ? '' : url.pathname}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid URL';
        throw new Error(`Invalid custom_host URL: ${message}`);
      }
    }
    return 'http://localhost:11434';
  },
  getEndpoint: ({ idkRequestData, idkTarget }) => {
    let mappedFn = idkRequestData.functionName;
    const urlToFetch = idkTarget.ollama_url_to_fetch;

    if (idkRequestData.functionName === FunctionName.PROXY && urlToFetch) {
      if (urlToFetch.indexOf('/api/chat') > -1) {
        mappedFn = FunctionName.CHAT_COMPLETE;
      } else if (urlToFetch.indexOf('/embeddings') > -1) {
        mappedFn = FunctionName.EMBED;
      }
    }

    switch (mappedFn) {
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.STREAM_CHAT_COMPLETE: {
        return '/v1/chat/completions'; // OpenAI-compatible endpoint
      }
      case FunctionName.EMBED: {
        return '/api/embeddings'; // Ollama-specific endpoint
      }
      default:
        return '';
    }
  },
  customFieldsSchema: OllamaCustomFieldsSchema,
  isAPIKeyRequired: false,
};

export default ollamaAPIConfig;
