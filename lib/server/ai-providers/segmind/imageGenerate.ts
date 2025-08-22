import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type {
  GenerateImageRequestBody,
  GenerateImageResponseBody,
} from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';
import { segmindErrorResponseTransform } from './utils';

// Helper function to safely parse dimensions with proper fallbacks
const parseDimension = (
  sizeString: string | undefined,
  index: number,
  fallback: number,
): number => {
  if (!sizeString) return fallback;

  const parts = sizeString.toLowerCase().split('x');
  if (parts.length !== 2) return fallback;

  const parsed = parseInt(parts[index], 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

export const segmindImageGenerateConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  model: {
    param: 'model',
    required: true,
    default: 'sdxl1.0-txt2img',
  },
  n: {
    param: 'samples',
    min: 1,
    max: 10,
    default: 1,
  },
  size: [
    {
      param: 'img_height',
      transform: (idkRequestBody: GenerateImageRequestBody): number =>
        parseDimension(idkRequestBody.size, 1, 512), // Default height: 512
    },
    {
      param: 'img_width',
      transform: (idkRequestBody: GenerateImageRequestBody): number =>
        parseDimension(idkRequestBody.size, 0, 512), // Default width: 512
    },
  ],
  style: {
    param: 'style',
    default: 'base',
  },
  steps: {
    param: 'num_inference_steps',
    default: 20,
    required: true,
  },
  negative_prompt: {
    param: 'negative_prompt',
    default:
      'out of frame, duplicate, watermark, signature, text, error, deformed',
  },
  scheduler: {
    param: 'scheduler',
    default: 'UniPC',
  },
  guidance_scale: {
    param: 'guidance_scale',
    default: 7.5,
  },
  seed: {
    param: 'seed',
    transform: (params: Record<string, unknown>): number => {
      // Use user-provided seed if available, otherwise generate a random one per request
      // This ensures reproducible image generation when seed is specified,
      // and unique outputs for identical prompts when no seed is provided
      if (params.seed && typeof params.seed === 'number') {
        return params.seed;
      }
      return Math.floor(Math.random() * 1000000000);
    },
  },
  strength: {
    param: 'strength',
    default: 0.75,
  },
  refiner: {
    param: 'refiner',
    default: true,
  },
  high_noise_fraction: {
    param: 'high_noise_fraction',
    default: 0.8,
  },
  base64: {
    param: 'base64',
    transform: (_idkRequestBody: GenerateImageRequestBody): boolean => true, // Always true to handle uniform responses
    default: true,
    required: true,
  },
  control_scale: {
    param: 'control_scale',
    default: 1.8,
  },
  control_start: {
    param: 'control_start',
    default: 0.19,
  },
  control_end: {
    param: 'control_end',
    default: 1,
  },
  qr_text: {
    param: 'qr_text',
    default: 'https://portkey.ai',
  },
  invert: {
    param: 'invert',
    default: false,
  },
  qr_size: {
    param: 'qr_code_size',
    default: 768,
  },
};

interface SegmindImageGenerateResponse {
  image: string; // Single image encoded in base64
  status: string; // Status of the image generation
  interTime: number;
}

interface SegmindImageGenerateErrorResponse {
  'html-message'?: string;
  error?: string;
}

export const segmindImageGenerateResponseTransform: ResponseTransformFunction =
  (
    aiProviderResponseBody:
      | SegmindImageGenerateResponse
      | SegmindImageGenerateErrorResponse,
    aiProviderResponseStatus: number,
  ): GenerateImageResponseBody | ErrorResponseBody => {
    if (aiProviderResponseStatus !== 200) {
      return segmindErrorResponseTransform(
        aiProviderResponseBody as Record<string, unknown>,
      );
    }

    if ('image' in aiProviderResponseBody) {
      return {
        created: Math.floor(Date.now() / 1000),
        data: [{ b64_json: aiProviderResponseBody.image }],
        provider: AIProvider.SEGMIND,
      } as GenerateImageResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.SEGMIND,
    );
  };
