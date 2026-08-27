import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import {
  FunctionName,
  type GenerateImageRequestData,
} from '@shared/types/api/request';
import type { GenerateImageRequestBody } from '@shared/types/api/routes/images-api';
import { ContentTypeName } from '@shared/types/constants';
import { isStabilityV1Model } from './utils';

const StabilityAIAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: () => 'https://api.stability.ai',
  headers: ({ saTarget, saRequestData }) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${saTarget.api_key}`,
    };
    if (saRequestData.functionName === FunctionName.GENERATE_IMAGE) {
      if (isStabilityV1Model(saRequestData.requestBody.model)) return headers;
    }
    headers.Content_Type = ContentTypeName.MULTIPART_FORM_DATA;
    headers.Accept = ContentTypeName.APPLICATION_JSON;
    return headers;
  },
  getEndpoint: ({ saRequestData, saTarget }) => {
    const { stability_url_to_fetch } = saTarget;
    let updatedRequestData = saRequestData;
    if (
      saRequestData.functionName === FunctionName.PROXY &&
      stability_url_to_fetch &&
      stability_url_to_fetch?.indexOf('text-to-image') > -1
    ) {
      updatedRequestData = {
        ...saRequestData,
        functionName: FunctionName.GENERATE_IMAGE,
      } as GenerateImageRequestData;
    }

    switch (updatedRequestData.functionName) {
      case FunctionName.GENERATE_IMAGE: {
        if (isStabilityV1Model(updatedRequestData.requestBody.model))
          return `/v1/generation/${updatedRequestData.requestBody.model}/text-to-image`;
        return `/v2beta/stable-image/generate/${updatedRequestData.requestBody.model}`;
      }
      default:
        return '';
    }
  },
  transformToFormData: ({ saRequestData }) => {
    const generateImageRequestBody =
      saRequestData.requestBody as GenerateImageRequestBody;
    if (isStabilityV1Model(generateImageRequestBody.model)) return false;
    return true;
  },
};

export default StabilityAIAPIConfig;
