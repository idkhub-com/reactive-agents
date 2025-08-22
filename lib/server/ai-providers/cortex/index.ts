import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import {
  chatCompleteParams,
  completeParams,
  embedParams,
  responseTransformers,
} from '../open-ai-base';
import CortexAPIConfig from './api';

const CortexConfig: AIProviderConfig = {
  api: CortexAPIConfig,
  [FunctionName.CHAT_COMPLETE]: chatCompleteParams([], {
    model: 'mistral-large',
  }),
  [FunctionName.COMPLETE]: completeParams([], { model: 'mistral-large' }),
  [FunctionName.EMBED]: embedParams([], { model: 'mistral-large' }),
  responseTransforms: responseTransformers(AIProvider.CORTEX, {
    chatComplete: true,
  }),
};

export default CortexConfig;
