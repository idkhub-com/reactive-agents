import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import { GatewayError } from '../../errors/gateway';

export const bedrockListFilesResponseTransform: ResponseTransformFunction =
  () => {
    throw new GatewayError(`listFiles is not supported by Bedrock`);
  };
