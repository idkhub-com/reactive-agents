import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import qdrantAPIConfig from './api';

const QdrantConfig: AIProviderConfig = {
  api: qdrantAPIConfig,
  responseTransforms: {},
};

export default QdrantConfig;
