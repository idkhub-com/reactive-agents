import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CreateFineTuningJobResponseBody } from '@shared/types/api/routes/fine-tuning-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from './utils';

export const openAICreateFinetuneConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
  },
  suffix: {
    param: 'suffix',
    required: true,
  },
  hyperparameters: {
    param: 'hyperparameters',
    required: false,
  },
  training_file: {
    param: 'training_file',
    required: true,
  },
  validation_file: {
    param: 'validation_file',
    required: false,
  },
  integrations: {
    param: 'integrations',
    required: false,
  },
  seed: {
    param: 'seed',
    required: false,
  },
  method: {
    param: 'method',
    required: false,
  },
};

export const openAIFinetuneResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiResponseStatus,
) => {
  if (aiResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.OPENAI,
    );
  }

  return aiProviderResponseBody as unknown as CreateFineTuningJobResponseBody;
};
