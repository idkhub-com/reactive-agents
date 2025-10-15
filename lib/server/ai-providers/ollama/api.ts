import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const OllamaAPIConfig: InternalProviderAPIConfig = {
  headers: ({ idkTarget }) => {
    return {
      'Content-Type': 'application/json',
      'x-ollama-api-key': idkTarget.api_key ?? '',
    };
  },
  getBaseURL: ({ idkTarget }) => {
    return idkTarget.custom_host ?? 'http://localhost:11434';
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
        return '/v1/chat/completions';
      }
      case FunctionName.EMBED: {
        return '/api/embeddings';
      }
      default:
        return '';
    }
  },
};

export default OllamaAPIConfig;
