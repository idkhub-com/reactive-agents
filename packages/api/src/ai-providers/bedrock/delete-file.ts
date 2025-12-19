import { bedrockErrorResponseTransform } from '@api/ai-providers/bedrock/chat-complete';
import { GatewayError } from '@api/errors/gateway';
import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';

export const bedrockDeleteFileResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
) => {
  if (responseStatus !== 200) {
    const error = bedrockErrorResponseTransform(response);
    if (error) {
      return error;
    }
  }
  throw new GatewayError(`deleteFile is not supported by Bedrock`);
};
