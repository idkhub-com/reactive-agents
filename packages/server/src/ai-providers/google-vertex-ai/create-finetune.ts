import type {
  GoogleErrorResponse,
  GoogleFinetuneRecord,
} from '@server/ai-providers/google/types';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import {
  GoogleErrorResponseTransform,
  googleToOpenAIFinetune,
  transformVertexFinetune,
} from './utils';

export const GoogleVertexFinetuneConfig: AIProviderFunctionConfig = {
  model: {
    param: 'baseModel',
    required: true,
  },
  training_file: {
    param: 'supervisedTuningSpec',
    required: true,
    transform: transformVertexFinetune,
  },
  suffix: {
    param: 'tunedModelDisplayName',
    required: true,
  },
  validation_file: {
    param: 'supervisedTuningSpec',
    required: false,
    transform: transformVertexFinetune,
  },
  method: {
    param: 'supervisedTuningSpec',
    required: false,
    transform: transformVertexFinetune,
  },
  hyperparameters: {
    param: 'supervisedTuningSpec',
    required: false,
    transform: transformVertexFinetune,
  },
};

export const googleFinetuneCreateResponseTransform: ResponseTransformFunction =
  (response, status) => {
    if (status !== 200) {
      return GoogleErrorResponseTransform(
        response as unknown as GoogleErrorResponse,
      );
    }
    return googleToOpenAIFinetune(response as unknown as GoogleFinetuneRecord);
  };
