import { aI21Config } from '@server/ai-providers/ai21';
import { anthropicConfig } from '@server/ai-providers/anthropic';
import { anyscaleConfig } from '@server/ai-providers/anyscale';
import {
  azureAIInferenceConfig,
  githubModelAPiConfig,
} from '@server/ai-providers/azure-ai-foundry';
import { azureOpenAIConfig } from '@server/ai-providers/azure-openai';
import { bedrockConfig } from '@server/ai-providers/bedrock';
import { cerebrasProviderAPIConfig } from '@server/ai-providers/cerebras';
import { deepbricksConfig } from '@server/ai-providers/deepbricks';
import { deepInfraConfig } from '@server/ai-providers/deepinfra';
import { deepSeekConfig } from '@server/ai-providers/deepseek';
import { googleConfig } from '@server/ai-providers/google';
import { googleVertexAIConfig } from '@server/ai-providers/google-vertex-ai';
import { groqConfig } from '@server/ai-providers/groq';
import { openAIConfig } from '@server/ai-providers/openai';
import { openrouterConfig } from '@server/ai-providers/openrouter';
import { palmAIConfig } from '@server/ai-providers/palm';
import { predibaseConfig } from '@server/ai-providers/predibase';
import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { AIProvider } from '@shared/types/constants';

export const providerConfigs: {
  [key in AIProvider]: AIProviderConfig | undefined;
} = {
  [AIProvider.AI21]: aI21Config,
  [AIProvider.ANTHROPIC]: anthropicConfig,
  [AIProvider.ANYSCALE]: anyscaleConfig,
  [AIProvider.AZURE_AI]: azureAIInferenceConfig,
  [AIProvider.AZURE_OPENAI]: azureOpenAIConfig,
  [AIProvider.BEDROCK]: bedrockConfig,
  [AIProvider.CEREBRAS]: cerebrasProviderAPIConfig,
  [AIProvider.COHERE]: undefined,
  [AIProvider.CORTEX]: undefined,
  [AIProvider.DASHSCOPE]: undefined,
  [AIProvider.DEEPBRICKS]: deepbricksConfig,
  [AIProvider.DEEPINFRA]: deepInfraConfig,
  [AIProvider.DEEPSEEK]: deepSeekConfig,
  [AIProvider.FIREWORKS_AI]: undefined,
  [AIProvider.GITHUB]: githubModelAPiConfig,
  [AIProvider.GOOGLE]: googleConfig,
  [AIProvider.GOOGLE_VERTEX_AI]: googleVertexAIConfig,
  [AIProvider.GROQ]: groqConfig,
  [AIProvider.HUGGINGFACE]: undefined,
  [AIProvider.INFERENCE_NET]: undefined,
  [AIProvider.JINA]: undefined,
  [AIProvider.LAMBDA]: undefined,
  [AIProvider.LEMONFOX_AI]: undefined,
  [AIProvider.LEPTON]: undefined,
  [AIProvider.LINGYI]: undefined,
  [AIProvider.MILVUS]: undefined,
  [AIProvider.MISTRAL_AI]: undefined,
  [AIProvider.MONSTERAPI]: undefined,
  [AIProvider.MOONSHOT]: undefined,
  [AIProvider.NCOMPASS]: undefined,
  [AIProvider.NEBIUS]: undefined,
  [AIProvider.NOMIC]: undefined,
  [AIProvider.NOVITA_AI]: undefined,
  [AIProvider.OLLAMA]: undefined,
  [AIProvider.OPENAI]: openAIConfig,
  [AIProvider.OPENROUTER]: openrouterConfig,
  [AIProvider.PALM]: palmAIConfig,
  [AIProvider.PERPLEXITY_AI]: undefined,
  [AIProvider.PREDIBASE]: predibaseConfig,
  [AIProvider.RECRFT_AI]: undefined,
  [AIProvider.REKA_AI]: undefined,
  [AIProvider.REPLICATE]: undefined,
  [AIProvider.SAGEMAKER]: undefined,
  [AIProvider.SAMBANOVA]: undefined,
  [AIProvider.SEGMIND]: undefined,
  [AIProvider.SILICONFLOW]: undefined,
  [AIProvider.STABILITY_AI]: undefined,
  [AIProvider.TOGETHER_AI]: undefined,
  [AIProvider.TRITON]: undefined,
  [AIProvider.UPSTAGE]: undefined,
  [AIProvider.VOYAGE]: undefined,
  [AIProvider.WORKERS_AI]: undefined,
  [AIProvider.X_AI]: undefined,
  [AIProvider.ZHIPU]: undefined,
};
