import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import sagemakerAPIConfig from './api';

const sagemakerConfig: AIProviderConfig = {
  api: sagemakerAPIConfig,
};

export default sagemakerConfig;
