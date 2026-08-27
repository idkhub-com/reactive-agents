import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';

const inferenceFunctions = [
  FunctionName.COMPLETE,
  FunctionName.CHAT_COMPLETE,
  FunctionName.EMBED,
  FunctionName.GENERATE_IMAGE,
];

const FireworksAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ saRequestData, saTarget: providerOptions }) => {
    if (inferenceFunctions.includes(saRequestData.functionName)) {
      return 'https://api.fireworks.ai/inference/v1';
    }
    const accountId = providerOptions.fireworks_account_id;
    return `https://api.fireworks.ai/v1/accounts/${accountId}`;
  },
  headers: ({ saTarget: providerOptions }) => {
    return {
      Authorization: `Bearer ${providerOptions.api_key}`,
      Accept: 'application/json',
    };
  },
  getEndpoint: ({ saRequestData, c }) => {
    switch (saRequestData.functionName) {
      case FunctionName.COMPLETE:
        return '/completions';
      case FunctionName.CHAT_COMPLETE:
        return '/chat/completions';
      case FunctionName.EMBED:
        return '/embeddings';
      case FunctionName.GENERATE_IMAGE: {
        const model = saRequestData.requestBody.model;
        return `/image_generation/${model}`;
      }
      case FunctionName.UPLOAD_FILE:
        return `/datasets`;
      case FunctionName.RETRIEVE_FILE: {
        const datasetId = c.req.param('id');
        return `/datasets/${datasetId}`;
      }
      case FunctionName.LIST_FILES:
        return `/datasets`;
      case FunctionName.DELETE_FILE: {
        const datasetId = c.req.param('id');
        return `/datasets/${datasetId}`;
      }
      case FunctionName.CREATE_FINE_TUNING_JOB:
        return `/fineTuningJobs`;
      case FunctionName.RETRIEVE_FINE_TUNING_JOB:
        return `/fineTuningJobs/${c.req.param('jobId')}`;
      case FunctionName.LIST_FINE_TUNING_JOBS:
        return `/fineTuningJobs`;
      case FunctionName.CANCEL_FINE_TUNING_JOB:
        return `/fineTuningJobs/${c.req.param('jobId')}`;
      default:
        return '';
    }
  },
};

export default FireworksAIAPIConfig;
