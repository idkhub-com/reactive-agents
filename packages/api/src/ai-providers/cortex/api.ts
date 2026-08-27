import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const CortexAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ saTarget: providerOptions }) =>
    `https://${providerOptions.snowflake_account}.snowflakecomputing.com/api/v2`,
  headers: ({ saTarget: providerOptions }) => ({
    'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
    Authorization: `Bearer ${providerOptions.api_key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }),
  getEndpoint: ({ saRequestData }) => {
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
        return '/cortex/inference:complete';
      default:
        return '';
    }
  },
};

export default CortexAPIConfig;
