import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ParameterConfigDefaultFunction } from '@shared/types/api/response/body';
import type { CreateFineTuningJobRequestBody } from '@shared/types/api/routes/fine-tuning-api/request';
import {
  type CreateFineTuningJobResponseBody,
  FineTuningJobStatus,
} from '@shared/types/api/routes/fine-tuning-api/response';
import { bedrockErrorResponseTransform } from './chat-complete';
import { populateHyperParameters } from './utils';

export const BedrockCreateFinetuneConfig: AIProviderFunctionConfig = {
  model: {
    param: 'baseModelIdentifier',
    required: true,
  },
  suffix: {
    param: 'customModelName',
    required: true,
  },
  hyperparameters: {
    param: 'hyperParameters',
    required: false,
    transform: (raRequestBody: CreateFineTuningJobRequestBody) => {
      const hyperParameters = populateHyperParameters(
        raRequestBody as unknown as CreateFineTuningJobRequestBody,
      );
      const epochCount = hyperParameters.n_epochs;
      const learningRateMultiplier = hyperParameters.learning_rate_multiplier;
      const batchSize = hyperParameters.batch_size;
      return {
        epochCount: epochCount ? String(epochCount) : undefined,
        learningRateMultiplier: learningRateMultiplier
          ? String(learningRateMultiplier)
          : undefined,
        batchSize: batchSize ? String(batchSize) : undefined,
      };
    },
  },
  training_file: {
    param: 'trainingDataConfig',
    required: true,
    transform: (raRequestBody: CreateFineTuningJobRequestBody) => {
      return {
        s3Uri: decodeURIComponent(raRequestBody.training_file as string),
      };
    },
  },
  validation_file: {
    param: 'validationDataConfig',
    required: false,
    transform: (raRequestBody: CreateFineTuningJobRequestBody) => {
      if (!raRequestBody.validation_file) {
        return undefined;
      }
      return {
        s3Uri: decodeURIComponent(raRequestBody.validation_file as string),
      };
    },
  },
  output_file: {
    param: 'outputDataConfig',
    required: true,
    default: (({ raRequestBody }): Record<string, unknown> => {
      const finetuneRequestBody =
        raRequestBody as CreateFineTuningJobRequestBody;
      const trainingFile = decodeURIComponent(
        finetuneRequestBody.training_file as string,
      );
      const uri =
        trainingFile.substring(0, trainingFile.lastIndexOf('/') + 1) +
        finetuneRequestBody.suffix;
      return {
        s3Uri: uri,
      };
    }) as ParameterConfigDefaultFunction,
  },
  // job_name: {
  //   param: 'jobName',
  //   required: true,
  //   default: (({ raRequestBody }): string => {
  //     const finetuneRequestBody =
  //       raRequestBody as CreateFineTuningJobRequestBody;
  //     return (
  //       finetuneRequestBody.job_name ?? `ra-finetune-${crypto.randomUUID()}`
  //     );
  //   }) as ParameterConfigDefaultFunction,
  // },  // TODO: Fix this
  role_arn: {
    param: 'roleArn',
    required: true,
  },
  customization_type: {
    param: 'customizationType',
    required: true,
    default: 'FINE_TUNING',
  },
};

const OK_STATUS = [200, 201];

export const bedrockCreateFinetuneResponseTransform: ResponseTransformFunction =
  (response, responseStatus) => {
    if (!OK_STATUS.includes(responseStatus) || 'error' in response) {
      const errorResponse = bedrockErrorResponseTransform(response);
      if (errorResponse) {
        return errorResponse;
      }
    }

    // AWS Bedrock CreateModelCustomizationJob returns a simple response with jobArn
    // We need to construct the OpenAI-compatible response
    const awsResponse = response as unknown as {
      jobArn: string;
      creationTime?: string;
    };

    const finetuneResponseBody: CreateFineTuningJobResponseBody = {
      id: encodeURIComponent(awsResponse.jobArn) as string,
      object: 'fine_tuning.job',
      created_at: awsResponse.creationTime
        ? new Date(awsResponse.creationTime).getTime()
        : Date.now(), // Use current time if creationTime not provided
      status: FineTuningJobStatus.VALIDATING_FILES, // Initial status for newly created job
      model: '', // Will be populated when job completes
      hyperparameters: {
        n_epochs: 'auto', // Default values as per OpenAI spec
        batch_size: 'auto',
        learning_rate_multiplier: 'auto',
      },
      training_file: '', // These will be populated from the original request context
      fine_tuned_model: null, // Will be available when job completes
      finished_at: null,
      trained_tokens: null,
      validation_file: null,
    };

    return finetuneResponseBody;
  };
