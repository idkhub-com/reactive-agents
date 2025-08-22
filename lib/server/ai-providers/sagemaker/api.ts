import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import {
  generateAWSHeaders,
  providerAssumedRoleCredentials,
} from '../bedrock/utils';

const sagemakerAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget }) => {
    return `https://runtime.sagemaker.${idkTarget.aws_region || 'us-east-1'}.amazonaws.com`;
  },
  headers: async ({ idkTarget, idkRequestData }) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (idkTarget.aws_auth_type === 'assumedRole') {
      await providerAssumedRoleCredentials(idkTarget);
    }

    // Add SageMaker-specific headers
    if (idkTarget.amzn_sagemaker_custom_attributes) {
      headers['x-amzn-sagemaker-custom-attributes'] =
        idkTarget.amzn_sagemaker_custom_attributes;
    }

    if (idkTarget.amzn_sagemaker_target_model) {
      headers['x-amzn-sagemaker-target-model'] =
        idkTarget.amzn_sagemaker_target_model;
    }

    if (idkTarget.amzn_sagemaker_target_variant) {
      headers['x-amzn-sagemaker-target-variant'] =
        idkTarget.amzn_sagemaker_target_variant;
    }

    if (idkTarget.amzn_sagemaker_target_container_hostname) {
      headers['x-amzn-sagemaker-target-container-hostname'] =
        idkTarget.amzn_sagemaker_target_container_hostname;
    }

    if (idkTarget.amzn_sagemaker_inference_id) {
      headers['x-amzn-sagemaker-inference-id'] =
        idkTarget.amzn_sagemaker_inference_id;
    }

    // if (idkTarget.amzn_sagemaker_enable_explanations) {
    //   headers['x-amzn-sagemaker-enable-explanations'] =
    //     idkTarget.amzn_sagemaker_enable_explanations;
    // }

    // if (idkTarget.amzn_sagemaker_inference_component) {
    //   headers['x-amzn-sagemaker-inference-component'] =
    //     idkTarget.amzn_sagemaker_inference_component;
    // }

    // if (idkTarget.amzn_sagemaker_session_id) {
    //   headers['x-amzn-sagemaker-session-id'] =
    //     idkTarget.amzn_sagemaker_session_id;
    // }

    return generateAWSHeaders(
      idkRequestData.requestBody,
      headers,
      idkRequestData.url,
      'POST',
      'sagemaker',
      idkTarget.aws_region || 'us-east-1',
      idkTarget.aws_access_key_id || '',
      idkTarget.aws_secret_access_key || '',
      idkTarget.aws_session_token || '',
    );
  },
  getEndpoint: ({ idkRequestData }) => {
    // SageMaker endpoints are typically model-specific
    // Extract endpoint name from the request or use a mapping
    switch (idkRequestData.functionName) {
      case FunctionName.CHAT_COMPLETE:
      case FunctionName.COMPLETE:
        return '/invocations';
      default:
        return '/invocations';
    }
  },
};

export default sagemakerAPIConfig;
