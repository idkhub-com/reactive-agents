import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const mistralAIAPIConfig: InternalProviderAPIConfig = {
  headers: ({ idkTarget }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (idkTarget.api_key) {
      headers.Authorization = `Bearer ${idkTarget.api_key}`;
    }

    return headers;
  },
  getBaseURL: ({ idkTarget }) => {
    const customHost = idkTarget.custom_host;
    if (customHost) {
      try {
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
    return 'https://api.mistral.ai/v1';
  },
  getEndpoint: ({ idkRequestData, idkTarget }) => {
    const mappedFn = idkRequestData.functionName;
    const mistralFimCompletion = idkTarget.mistral_fim_completion;

    if (mistralFimCompletion === 'true') {
      return '/fim/completions';
    }

    switch (mappedFn) {
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.STREAM_CHAT_COMPLETE: {
        return '/chat/completions';
      }
      case FunctionName.EMBED: {
        return '/embeddings';
      }
      default:
        return '';
    }
  },
};

export default mistralAIAPIConfig;
