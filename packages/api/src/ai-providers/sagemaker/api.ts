import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import {
  generateAWSHeaders,
  providerAssumedRoleCredentials,
} from '../bedrock/utils';

const sagemakerAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ saTarget }) => {
    return `https://runtime.sagemaker.${saTarget.aws_region || 'us-east-1'}.amazonaws.com`;
  },
  headers: async ({ saTarget, saRequestData }) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (saTarget.aws_auth_type === 'assumedRole') {
      await providerAssumedRoleCredentials(saTarget);
    }

    // Add SageMaker-specific headers
    if (saTarget.amzn_sagemaker_custom_attributes) {
      headers['x-amzn-sagemaker-custom-attributes'] =
        saTarget.amzn_sagemaker_custom_attributes;
    }

    if (saTarget.amzn_sagemaker_target_model) {
      headers['x-amzn-sagemaker-target-model'] =
        saTarget.amzn_sagemaker_target_model;
    }

    if (saTarget.amzn_sagemaker_target_variant) {
      headers['x-amzn-sagemaker-target-variant'] =
        saTarget.amzn_sagemaker_target_variant;
    }

    if (saTarget.amzn_sagemaker_target_container_hostname) {
      headers['x-amzn-sagemaker-target-container-hostname'] =
        saTarget.amzn_sagemaker_target_container_hostname;
    }

    if (saTarget.amzn_sagemaker_inference_id) {
      headers['x-amzn-sagemaker-inference-id'] =
        saTarget.amzn_sagemaker_inference_id;
    }

    // if (saTarget.amzn_sagemaker_enable_explanations) {
    //   headers['x-amzn-sagemaker-enable-explanations'] =
    //     saTarget.amzn_sagemaker_enable_explanations;
    // }

    // if (saTarget.amzn_sagemaker_inference_component) {
    //   headers['x-amzn-sagemaker-inference-component'] =
    //     saTarget.amzn_sagemaker_inference_component;
    // }

    // if (saTarget.amzn_sagemaker_session_id) {
    //   headers['x-amzn-sagemaker-session-id'] =
    //     saTarget.amzn_sagemaker_session_id;
    // }

    return generateAWSHeaders(
      saRequestData.requestBody,
      headers,
      saRequestData.url,
      'POST',
      'sagemaker',
      saTarget.aws_region || 'us-east-1',
      saTarget.aws_access_key_id || '',
      saTarget.aws_secret_access_key || '',
      saTarget.aws_session_token || '',
    );
  },
  getEndpoint: ({ saRequestData }) => {
    // SageMaker endpoints are typically model-specific
    // Extract endpoint name from the request or use a mapping
    switch (saRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.COMPLETE:
        return '/invocations';
      default:
        return '/invocations';
    }
  },
};

export default sagemakerAPIConfig;
