import type { AIProviderFunctionConfig } from '@shared/types/ai-providers/config';

export const azureOpenAICreateBatchConfig: AIProviderFunctionConfig = {
  input_file_id: {
    param: 'input_file_id',
    required: true,
  },
  endpoint: {
    param: 'endpoint',
    required: true,
  },
  completion_window: {
    param: 'completion_window',
    default: '24h',
    required: true,
  },
  metadata: {
    param: 'metadata',
    required: false,
  },
};
