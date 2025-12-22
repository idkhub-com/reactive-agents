import type { ResponseTransformFunction } from '@shared/types/ai-providers/config';
import { fireworksAIErrorResponseTransform } from './chat-complete';
import type { FireworksFile } from './types';
import { fireworksDatasetToOpenAIFile } from './utils';

export const FireworksFileListResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus === 200) {
    const datasets = aiProviderResponseBody.datasets as FireworksFile[];
    const records = datasets.map(fireworksDatasetToOpenAIFile);
    return {
      object: 'list',
      data: records,
      last_id: records.at(-1)?.id,
      has_more:
        (aiProviderResponseBody.totalSize as number) >
        (aiProviderResponseBody.datasets as FireworksFile[]).length,
      total: aiProviderResponseBody.totalSize,
    };
  }

  return fireworksAIErrorResponseTransform(aiProviderResponseBody);
};
