import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { GenerateImageRequestBody } from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';
import { StabilityAIImageGenerateV2Config } from '../stability-ai/image-generate-v2';
import { bedrockErrorResponseTransform } from './chat-complete';

export const bedrockStabilityAIImageGenerateV1Config: AIProviderFunctionConfig =
  {
    prompt: {
      param: 'text_prompts',
      required: true,
      transform: (idkRequestBody: GenerateImageRequestBody) => {
        return [
          {
            text: idkRequestBody.prompt,
            weight: 1,
          },
        ];
      },
    },
    n: {
      param: 'samples',
      min: 1,
      max: 10,
    },
    size: [
      {
        param: 'height',
        transform: (idkRequestBody: GenerateImageRequestBody): number =>
          parseInt(idkRequestBody.size?.toLowerCase().split('x')[1] || '0'),
        min: 320,
      },
      {
        param: 'width',
        transform: (idkRequestBody: GenerateImageRequestBody): number =>
          parseInt(idkRequestBody.size?.toLowerCase().split('x')[0] || '0'),
        min: 320,
      },
    ],
    style: {
      param: 'style_preset',
    },
  };

interface ImageArtifact {
  base64: string;
  finishReason: 'CONTENT_FILTERED' | 'ERROR' | 'SUCCESS';
  seed: number;
}

export const bedrockStabilityAIImageGenerateV1ResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(
        aiProviderResponseBody,
      );
      if (errorResponse) return errorResponse;
    }

    if ('artifacts' in aiProviderResponseBody) {
      const artifacts =
        aiProviderResponseBody.artifacts as unknown as ImageArtifact[];
      return {
        created: Math.floor(Date.now() / 1000),
        data: artifacts.map((art) => ({ b64_json: art.base64 })),
        provider: AIProvider.BEDROCK,
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockStabilityAIImageGenerateV2Config =
  StabilityAIImageGenerateV2Config;

export const bedrockStabilityAIImageGenerateV2ResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(
        aiProviderResponseBody,
      );
      if (errorResponse) return errorResponse;
    }

    if ('images' in aiProviderResponseBody) {
      const images = aiProviderResponseBody.images as unknown as string[];
      return {
        created: Math.floor(Date.now() / 1000),
        data: images.map((image) => ({
          b64_json: image,
        })),
        provider: AIProvider.BEDROCK,
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };
