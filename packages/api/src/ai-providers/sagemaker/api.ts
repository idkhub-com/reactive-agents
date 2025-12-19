import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import {
  generateAWSHeaders,
  providerAssumedRoleCredentials,
} from '../bedrock/utils';

const sagemakerAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget }) => {
    return `https://runtime.sagemaker.${raTarget.aws_region || 'us-east-1'}.amazonaws.com`;
  },
  headers: async ({ raTarget, raRequestData }) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (raTarget.aws_auth_type === 'assumedRole') {
      await providerAssumedRoleCredentials(raTarget);
    }

    // Add SageMaker-specific headers
    if (raTarget.amzn_sagemaker_custom_attributes) {
      headers['x-amzn-sagemaker-custom-attributes'] =
        raTarget.amzn_sagemaker_custom_attributes;
    }

    if (raTarget.amzn_sagemaker_target_model) {
      headers['x-amzn-sagemaker-target-model'] =
        raTarget.amzn_sagemaker_target_model;
    }

    if (raTarget.amzn_sagemaker_target_variant) {
      headers['x-amzn-sagemaker-target-variant'] =
        raTarget.amzn_sagemaker_target_variant;
    }

    if (raTarget.amzn_sagemaker_target_container_hostname) {
      headers['x-amzn-sagemaker-target-container-hostname'] =
        raTarget.amzn_sagemaker_target_container_hostname;
    }

    if (raTarget.amzn_sagemaker_inference_id) {
      headers['x-amzn-sagemaker-inference-id'] =
        raTarget.amzn_sagemaker_inference_id;
    }

    // if (raTarget.amzn_sagemaker_enable_explanations) {
    //   headers['x-amzn-sagemaker-enable-explanations'] =
    //     raTarget.amzn_sagemaker_enable_explanations;
    // }

    // if (raTarget.amzn_sagemaker_inference_component) {
    //   headers['x-amzn-sagemaker-inference-component'] =
    //     raTarget.amzn_sagemaker_inference_component;
    // }

    // if (raTarget.amzn_sagemaker_session_id) {
    //   headers['x-amzn-sagemaker-session-id'] =
    //     raTarget.amzn_sagemaker_session_id;
    // }

    return generateAWSHeaders(
      raRequestData.requestBody,
      headers,
      raRequestData.url,
      'POST',
      'sagemaker',
      raTarget.aws_region || 'us-east-1',
      raTarget.aws_access_key_id || '',
      raTarget.aws_secret_access_key || '',
      raTarget.aws_session_token || '',
    );
  },
  getEndpoint: ({ raRequestData }) => {
    // SageMaker endpoints are typically model-specific
    // Extract endpoint name from the request or use a mapping
    switch (raRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.COMPLETE:
        return '/invocations';
      default:
        return '/invocations';
    }
  },
};

export default sagemakerAPIConfig;
