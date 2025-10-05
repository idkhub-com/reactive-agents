import { handleGenerateArms } from '@server/optimization/skill-optimizations';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import { generateEmbeddingForRequest } from '@server/utils/embeddings';
import {
  cosineSimilarity,
  getInitialClusterCentroids,
  sampleBeta,
} from '@server/utils/math';
import { renderTemplate } from '@server/utils/templates';
import { debug, error } from '@shared/console-logging';
import {
  FunctionName,
  type IdkConfig,
  IdkTarget,
  type IdkTargetPreProcessed,
  OptimizationType,
  type TargetConfigurationParams,
} from '@shared/types/api/request';
import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import type { AIProvider } from '@shared/types/constants';
import type {
  SkillOptimizationArm,
  SkillOptimizationCluster,
} from '@shared/types/data';
import type { SkillOptimizationClusterCreateParams } from '@shared/types/data/skill-optimization-cluster';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

function getOptimalArm(arms: SkillOptimizationArm[]): SkillOptimizationArm {
  // Implement Thompson Sampling algorithm for multi-armed bandit
  // Thompson Sampling uses Bayesian approach: sample from posterior Beta distribution
  // and select the arm with highest sampled value

  let optimalArm = arms[0];
  let maxSample = -Infinity;

  for (const arm of arms) {
    // Beta distribution parameters with uniform prior (Beta(1,1))
    // alpha = successes + 1, beta = failures + 1
    const successes = arm.stats.total_reward;
    const failures = arm.stats.n - arm.stats.total_reward;
    const alpha = successes + 1;
    const beta = failures + 1;

    // Sample from Beta(alpha, beta)
    const sample = sampleBeta(alpha, beta);

    if (sample > maxSample) {
      maxSample = sample;
      optimalArm = arm;
    }
  }

  return optimalArm;
}

function getOptimalCluster(
  embedding: number[],
  clusters: SkillOptimizationCluster[],
): SkillOptimizationCluster {
  // Find the cluster with the highest cosine similarity to the embedding
  let optimalCluster = clusters[0];
  let maxSimilarity = -1;

  for (const cluster of clusters) {
    const similarity = cosineSimilarity(embedding, cluster.centroid);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      optimalCluster = cluster;
    }
  }

  return optimalCluster;
}

function getRandomValueInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const ReasoningMap: Record<number, ReasoningEffort | null> = {
  0: null,
  1: null,
  2: ReasoningEffort.MINIMAL,
  3: ReasoningEffort.MINIMAL,
  4: ReasoningEffort.LOW,
  5: ReasoningEffort.LOW,
  6: ReasoningEffort.MEDIUM,
  7: ReasoningEffort.MEDIUM,
  8: ReasoningEffort.HIGH,
  9: ReasoningEffort.HIGH,
};

function getRandomReasoningEffortFromRange(
  min: number,
  max: number,
): ReasoningEffort | null {
  const randomValue = getRandomValueInRange(min, max) * 9.9;

  const randomIndex = Math.floor(randomValue);

  return ReasoningMap[randomIndex];
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
      const skill = c.get('skill');

      let clusters =
        await userDataStorageConnector.getSkillOptimizationClusters({
          skill_id: skill.id,
        });

      if (clusters.length === 0) {
        // Create initial clusters with equally spaced centroids
        const initialCentroids = getInitialClusterCentroids(
          skill.max_configurations,
        );
        const clusterParams: SkillOptimizationClusterCreateParams[] =
          initialCentroids.map((centroid, index) => ({
            agent_id: skill.agent_id,
            skill_id: skill.id,
            name: `Cluster ${index + 1}`,
            total_steps: 0,
            centroid,
          }));

        clusters =
          await userDataStorageConnector.createSkillOptimizationClusters(
            clusterParams,
          );

        await handleGenerateArms(c, userDataStorageConnector, skill.id);
      }

      const optimalCluster = getOptimalCluster(embedding, clusters);

      const arms = await userDataStorageConnector.getSkillOptimizationArms({
        skill_id: skill.id,
        cluster_id: optimalCluster.id,
      });

      const optimalArm = getOptimalArm(arms);

      c.set('pulled_arm', optimalArm);

      const renderedSystemPrompt = renderTemplate(
        optimalArm.params.system_prompt!,
        idkTargetPreProcessed.system_prompt_variables || {},
      );

      // Resolve model_id to get model name and provider
      const models = await userDataStorageConnector.getModels({
        id: optimalArm.params.model_id,
      });

      if (models.length === 0) {
        return c.json(
          {
            error: `Model with ID '${optimalArm.params.model_id}' not found`,
          },
          422,
        );
      }

      const model = models[0];

      // Get the provider from the associated API key
      const apiKeyRecord =
        await userDataStorageConnector.getAIProviderAPIKeyById(
          model.ai_provider_api_key_id,
        );

      if (!apiKeyRecord) {
        return c.json(
          {
            error: `API key with ID '${model.ai_provider_api_key_id}' not found for model`,
          },
          422,
        );
      }

      resolvedApiKey = apiKeyRecord.api_key;

      const reasoningEffort = getRandomReasoningEffortFromRange(
        optimalArm.params.thinking_min,
        optimalArm.params.thinking_max,
      );

      debug(`Reasoning effort: ${reasoningEffort}`);

      idkTargetConfiguration = {
        ai_provider: apiKeyRecord.ai_provider as AIProvider,
        model: model.model_name,
        system_prompt: renderedSystemPrompt,
        temperature: getRandomValueInRange(
          optimalArm.params.temperature_min,
          optimalArm.params.temperature_max,
        ),
        top_p: getRandomValueInRange(
          optimalArm.params.top_p_min,
          optimalArm.params.top_p_max,
        ),
        frequency_penalty: getRandomValueInRange(
          optimalArm.params.frequency_penalty_min,
          optimalArm.params.frequency_penalty_max,
        ),
        presence_penalty: getRandomValueInRange(
          optimalArm.params.presence_penalty_min,
          optimalArm.params.presence_penalty_max,
        ),
        reasoning_effort: reasoningEffort,
        seed: null,
        max_tokens: null,
        additional_params: null,
        stop: null,
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
      reasoning_effort: null,
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

  debug(idkTargetConfiguration);

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
