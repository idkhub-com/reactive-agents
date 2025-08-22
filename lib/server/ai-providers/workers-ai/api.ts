import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

export const workersAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget }) => {
    // Workers AI requires account ID which should be part of the target configuration
    // Multiple ways to provide the account ID:
    // 1. Direct custom_host with full URL
    // 2. custom_host with just the account ID
    // 3. Future: dedicated account_id field

    let accountId: string | null = null;

    // Check if custom_host is provided
    if (idkTarget.custom_host) {
      // If custom_host contains a full Cloudflare URL, extract account ID
      if (idkTarget.custom_host.includes('cloudflare.com')) {
        const match = idkTarget.custom_host.match(/\/accounts\/([^/]+)/);
        accountId = match ? match[1] : null;
      } else {
        // If custom_host is just the account ID
        accountId = idkTarget.custom_host;
      }
    }

    // If no account ID found, throw a helpful error
    if (!accountId) {
      throw new Error(
        'Cloudflare Workers AI requires an account ID. Please provide it in one of these ways:\n' +
          '1. Set custom_host to your full Cloudflare API URL (e.g., "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/run")\n' +
          '2. Set custom_host to just your account ID (e.g., "YOUR_ACCOUNT_ID")\n' +
          '3. Add a dedicated account_id field to the configuration (future enhancement)',
      );
    }

    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
  },
  headers: ({ idkTarget }) => {
    return {
      Authorization: `Bearer ${idkTarget.api_key}`,
      'Content-Type': 'application/json',
    };
  },
  getEndpoint: ({ idkRequestData }) => {
    // Extract model from request body
    const requestBody = idkRequestData.requestBody as Record<string, unknown>;
    const model = requestBody.model as string;

    switch (idkRequestData.functionName) {
      case FunctionName.COMPLETE:
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.EMBED:
      case FunctionName.GENERATE_IMAGE:
        return `/${model}`;
      default:
        return '';
    }
  },
};
