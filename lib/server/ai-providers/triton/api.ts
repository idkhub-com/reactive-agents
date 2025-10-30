import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const tritonAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget }) => {
    // Use custom host if provided, otherwise default to localhost with standard Triton port
    if (raTarget.custom_host) {
      return raTarget.custom_host;
    }

    // Default Triton HTTP port is 8000
    return 'http://localhost:8000';
  },

  headers: ({ raTarget }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key authentication if provided
    if (raTarget.api_key) {
      headers.Authorization = `Bearer ${raTarget.api_key}`;
    }

    return headers;
  },

  getEndpoint: ({ raRequestData }) => {
    // Extract model name from request body for KServe v2 endpoints
    const model =
      ((raRequestData.requestBody as Record<string, unknown>)?.model as
        | string
        | undefined) || 'default';
    const encodedModel = encodeURIComponent(model);

    switch (raRequestData.functionName) {
      // Core inference endpoints using KServe v2 protocol
      case FunctionName.COMPLETE:
      case FunctionName.CHAT_COMPLETE:
        return `/v2/models/${encodedModel}/infer`;

      case FunctionName.STREAM_COMPLETE:
      case FunctionName.STREAM_CHAT_COMPLETE:
        // Triton handles streaming via parameters in the same endpoint
        return `/v2/models/${encodedModel}/infer`;

      // Embeddings
      case FunctionName.EMBED:
        return `/v2/models/${encodedModel}/infer`;

      // Model management endpoints
      case FunctionName.RETRIEVE_FILE: // Model metadata
        return `/v2/models/${encodedModel}`;

      case FunctionName.GET_BATCH_OUTPUT: // Model stats
        return `/v2/models/${encodedModel}/stats`;

      // Health endpoints
      case FunctionName.CREATE_SPEECH: // Server liveness
        return '/v2/health/live';

      case FunctionName.CREATE_TRANSCRIPTION: // Server readiness
        return '/v2/health/ready';

      case FunctionName.CREATE_TRANSLATION: // Model readiness
        return `/v2/models/${encodedModel}/ready`;

      // Server metadata
      case FunctionName.LIST_BATCHES: // Server info
        return '/v2';

      // Repository management
      case FunctionName.LIST_FILES: // List models
        return '/v2/repository/index';

      default:
        return '';
    }
  },
};

export default tritonAPIConfig;
