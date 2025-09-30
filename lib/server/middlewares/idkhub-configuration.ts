import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import { generateEmbeddingForRequest } from '@server/utils/embeddings';
import { cosineSimilarity } from '@server/utils/math';
import { renderTemplate } from '@server/utils/templates';
import { error } from '@shared/console-logging';
import {
  FunctionName,
  type IdkConfig,
  IdkTarget,
  type IdkTargetPreProcessed,
  OptimizationType,
  type TargetConfigurationParams,
} from '@shared/types/api/request';
import type { AIProvider } from '@shared/types/constants';
import type { SkillOptimizationConfiguration } from '@shared/types/data';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

function getOptimalConfiguration(
  embedding: number[],
  configurations: SkillOptimizationConfiguration[],
): SkillOptimizationConfiguration {
  if (configurations.length === 0) {
    throw new Error('No configurations provided');
  }

  if (configurations.length === 1) {
    return configurations[0];
  }

  let bestConfiguration = configurations[0];
  let bestSimilarity = -1;

  for (const config of configurations) {
    if (!config.cluster_center || config.cluster_center.length === 0) {
      continue;
    }

    const similarity = cosineSimilarity(embedding, config.cluster_center);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestConfiguration = config;
    }
  }

  return bestConfiguration;
}

async function validateTargetConfiguration(
  c: AppContext,
  userDataStorageConnector: UserDataStorageConnector,
  idkTargetPreProcessed: IdkTargetPreProcessed,
  embedding: number[] | null,
): Promise<IdkTarget | Response> {
  let idkTargetConfiguration: TargetConfigurationParams;
  let resolvedApiKey: string | undefined;

  // Apply optimization if specified
  // Optimizations can only be applied if the embedding is provided
  if (
    embedding &&
    idkTargetPreProcessed.optimization === OptimizationType.AUTO
  ) {
    try {
      // Fetch optimizations by version, if available. Otherwise, the latest optimization is returned.
      const optimizations =
        await userDataStorageConnector.getSkillOptimizationClusters({
          version: idkTargetPreProcessed.optimization_version,
          limit: 1,
        });

      if (optimizations.length === 0) {
        return c.json(
          {
            error:
              'IdkHub optimization not found. Check your optimization version and ensure it exists.',
          },
          422,
        );
      }

      const optimization = optimizations[0];

      c.set('skill_optimization', optimization);

      const configurations = optimization.configurations;

      const optimalConfiguration = getOptimalConfiguration(
        embedding,
        configurations,
      );

      optimalConfiguration.model_params.system_prompt = renderTemplate(
        optimalConfiguration.model_params.system_prompt!,
        idkTargetPreProcessed.system_prompt_variables || {},
      );

      // Resolve model_id to get model name and provider
      const modelRecord = await userDataStorageConnector.getModelById(
        optimalConfiguration.model_params.model_id,
      );

      if (!modelRecord) {
        return c.json(
          {
            error: `Model with ID '${optimalConfiguration.model_params.model_id}' not found`,
          },
          422,
        );
      }

      // Get the provider from the associated API key
      const apiKeyRecord =
        await userDataStorageConnector.getAIProviderAPIKeyById(
          modelRecord.ai_provider_api_key_id,
        );

      if (!apiKeyRecord) {
        return c.json(
          {
            error: `API key with ID '${modelRecord.ai_provider_api_key_id}' not found for model`,
          },
          422,
        );
      }

      resolvedApiKey = apiKeyRecord.api_key;

      idkTargetConfiguration = {
        ai_provider: apiKeyRecord.ai_provider as AIProvider,
        model: modelRecord.model_name,
        system_prompt: optimalConfiguration.model_params.system_prompt,
        temperature: optimalConfiguration.model_params.temperature,
        max_tokens: optimalConfiguration.model_params.max_tokens,
        top_p: optimalConfiguration.model_params.top_p,
        frequency_penalty: optimalConfiguration.model_params.frequency_penalty,
        presence_penalty: optimalConfiguration.model_params.presence_penalty,
        stop: optimalConfiguration.model_params.stop,
        seed: optimalConfiguration.model_params.seed,
        additional_params: optimalConfiguration.model_params.additional_params,
      };
    } catch (error) {
      return c.json(
        {
          error: `Failed to load optimization parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        500,
      );
    }
  } else if (idkTargetPreProcessed.provider) {
    const provider = idkTargetPreProcessed.provider;
    const model = idkTargetPreProcessed.model;

    if (!model) {
      return c.json(
        {
          error: `model must be defined`,
        },
        422,
      );
    }

    idkTargetConfiguration = {
      ai_provider: provider,
      model: model,
      system_prompt: null,
      temperature: null,
      max_tokens: null,
      top_p: null,
      frequency_penalty: null,
      presence_penalty: null,
      stop: null,
      seed: null,
      additional_params: null,
    };
  } else {
    return c.json(
      {
        error: `No configuration_name or provider defined`,
      },
      500,
    );
  }

  if (idkTargetPreProcessed.api_key) {
    resolvedApiKey = idkTargetPreProcessed.api_key;
  }

  // Ensure we have an API key after resolution
  if (!resolvedApiKey) {
    return c.json(
      {
        error: `No API key available. Either provide an api_key directly or use a skill configuration.`,
      },
      422,
    );
  }

  const rawData = {
    ...idkTargetPreProcessed,
    configuration: idkTargetConfiguration,
    api_key: resolvedApiKey,
    provider: undefined,
    configuration_name: undefined,
    configuration_version: undefined,
    model: undefined,
  };

  const parseResult = IdkTarget.safeParse(rawData);

  if (!parseResult.success) {
    error('Error while parsing IDK target configuration', parseResult.error);
    return c.json(
      {
        error: `Error while parsing IDK target configuration`,
      },
      500,
    );
  }

  return parseResult.data;
}

export const idkHubConfigurationInjectorMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    const url = new URL(c.req.url);

    // Only set variables for API requests
    if (url.pathname.startsWith('/v1/')) {
      // Don't set variables for IDK API requests
      if (!url.pathname.startsWith('/v1/idk')) {
        const idkConfigPreProcessed = c.get('idk_config_pre_processed');
        const idkRequestData = c.get('idk_request_data');

        // Generate embeddings for specific endpoints
        // The embedding will be saved with the log after the request is completed
        let embedding = null;
        if (
          idkRequestData &&
          (idkRequestData.functionName === FunctionName.CHAT_COMPLETE ||
            idkRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE ||
            idkRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE)
        ) {
          try {
            embedding = await generateEmbeddingForRequest(idkRequestData);
          } catch {
            embedding = null;
          }
          c.set('embedding', embedding);
        }

        const idkTargetsOrResponses = await Promise.all(
          idkConfigPreProcessed.targets.map((target) =>
            validateTargetConfiguration(
              c,
              c.get('user_data_storage_connector'),
              target,
              embedding,
            ),
          ),
        );

        for (const idkTargetOrResponse of idkTargetsOrResponses) {
          if (idkTargetOrResponse instanceof Response) {
            return idkTargetOrResponse;
          }
        }

        const idkTargets = idkTargetsOrResponses.filter(
          (target) => !(target instanceof Response),
        ) as IdkTarget[];

        const idkConfig: IdkConfig = {
          ...idkConfigPreProcessed,
          targets: idkTargets,
        };

        c.set('idk_config', idkConfig);
      }
    }
    await next();
  },
);
