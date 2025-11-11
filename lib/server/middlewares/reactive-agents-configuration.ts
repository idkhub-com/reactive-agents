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
import { error } from '@shared/console-logging';
import {
  FunctionName,
  OptimizationType,
  type ReactiveAgentsConfig,
  ReactiveAgentsTarget,
  type ReactiveAgentsTargetPreProcessed,
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

function getOptimalArm(
  arms: SkillOptimizationArm[],
  explorationTemperature = 1.0,
): SkillOptimizationArm {
  // Implement Thompson Sampling algorithm for multi-armed bandit
  // Thompson Sampling uses Bayesian approach: sample from posterior Beta distribution
  // and select the arm with highest sampled value
  //
  // The exploration_temperature parameter controls exploration/exploitation:
  // - temperature = 1.0: Standard Thompson Sampling (balanced)
  // - temperature > 1.0: More exploration (flattens distribution, takes more risks)
  // - temperature < 1.0: More exploitation (sharpens distribution, sticks to known good arms)

  let optimalArm = arms[0];
  let maxSample = -Infinity;
  const samples: {
    armId: string;
    n: number;
    total_reward: number;
    alpha: number;
    beta: number;
    alpha_adjusted: number;
    beta_adjusted: number;
    baseSample: number;
    sample: number;
  }[] = [];

  for (const arm of arms) {
    // Beta distribution parameters with uniform prior (Beta(1,1))
    // alpha = successes + 1, beta = failures + 1
    const successes = arm.stats.total_reward;
    const failures = arm.stats.n - arm.stats.total_reward;
    const baseAlpha = successes + 1;
    const baseBeta = failures + 1;

    // Apply temperature to Beta parameters BEFORE sampling
    // Higher temperature (> 1) shrinks parameters toward 1, making distribution more uniform
    // Lower temperature (< 1) exaggerates parameters, making distribution more peaked
    // This is the correct way to apply temperature in Thompson Sampling
    const alpha = (baseAlpha - 1) / explorationTemperature + 1;
    const beta = (baseBeta - 1) / explorationTemperature + 1;

    const baseSample = sampleBeta(alpha, beta);
    const sample = baseSample;

    samples.push({
      armId: arm.id,
      n: arm.stats.n,
      total_reward: arm.stats.total_reward,
      alpha: baseAlpha,
      beta: baseBeta,
      alpha_adjusted: alpha,
      beta_adjusted: beta,
      baseSample,
      sample,
    });

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
  raTargetPreProcessed: ReactiveAgentsTargetPreProcessed,
  embedding: number[] | null,
): Promise<ReactiveAgentsTarget | Response> {
  let raTargetConfiguration: TargetConfigurationParams;
  let resolvedApiKey: string | undefined;
  let resolvedCustomHost: string | undefined;

  // Apply optimization if specified
  // Optimizations can only be applied if the embedding is provided
  if (
    embedding &&
    raTargetPreProcessed.optimization === OptimizationType.AUTO
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
          skill.configuration_count,
        );
        const clusterParams: SkillOptimizationClusterCreateParams[] =
          initialCentroids.map((centroid, index) => ({
            agent_id: skill.agent_id,
            skill_id: skill.id,
            name: `Partition ${index + 1}`,
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

      const optimalArm = getOptimalArm(arms, skill.exploration_temperature);

      c.set('pulled_arm', optimalArm);

      const renderedSystemPrompt = renderTemplate(
        optimalArm.params.system_prompt!,
        raTargetPreProcessed.system_prompt_variables || {},
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
          model.ai_provider_id,
        );

      if (!apiKeyRecord) {
        return c.json(
          {
            error: `API key with ID '${model.ai_provider_id}' not found for model`,
          },
          422,
        );
      }

      resolvedApiKey = apiKeyRecord.api_key || undefined;
      resolvedCustomHost =
        (apiKeyRecord.custom_fields?.custom_host as string) || undefined;

      const reasoningEffort = getRandomReasoningEffortFromRange(
        optimalArm.params.thinking_min,
        optimalArm.params.thinking_max,
      );

      raTargetConfiguration = {
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
    } catch (e) {
      error(e);
      return c.json(
        {
          error: `Failed to load optimization parameters: ${e instanceof Error ? e.message : 'Unknown error'}`,
        },
        500,
      );
    }
  } else if (raTargetPreProcessed.provider) {
    const provider = raTargetPreProcessed.provider;
    const model = raTargetPreProcessed.model;

    if (!model) {
      return c.json(
        {
          error: `model must be defined`,
        },
        422,
      );
    }

    raTargetConfiguration = {
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

  if (raTargetPreProcessed.api_key) {
    resolvedApiKey = raTargetPreProcessed.api_key;
  }

  const rawData = {
    ...raTargetPreProcessed,
    configuration: raTargetConfiguration,
    api_key: resolvedApiKey,
    // Use resolved custom_host from API key if available, otherwise keep any directly provided value
    custom_host: resolvedCustomHost || raTargetPreProcessed.custom_host,
    provider: undefined,
    configuration_name: undefined,
    configuration_version: undefined,
    model: undefined,
  };

  const parseResult = ReactiveAgentsTarget.safeParse(rawData);

  if (!parseResult.success) {
    error(
      'Error while parsing Reactive Agents target configuration',
      parseResult.error,
    );
    return c.json(
      {
        error: `Error while parsing Reactive Agents target configuration`,
      },
      500,
    );
  }

  return parseResult.data;
}

export const raConfigurationInjectorMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    const url = new URL(c.req.url);

    // Only set variables for API requests
    if (url.pathname.startsWith('/v1/')) {
      // Don't set variables for Reactive Agents API requests
      if (!url.pathname.startsWith('/v1/reactive-agents')) {
        const raConfigPreProcessed = c.get('ra_config_pre_processed');
        const raRequestData = c.get('ra_request_data');

        // Generate embeddings for specific endpoints
        // The embedding will be saved with the log after the request is completed
        let embedding = null;
        if (
          raRequestData &&
          (raRequestData.functionName === FunctionName.CHAT_COMPLETE ||
            raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE ||
            raRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE)
        ) {
          try {
            embedding = await generateEmbeddingForRequest(raRequestData);
          } catch {
            embedding = null;
          }
          c.set('embedding', embedding);
        }

        const raTargetsOrResponses = await Promise.all(
          raConfigPreProcessed.targets.map((target) =>
            validateTargetConfiguration(
              c,
              c.get('user_data_storage_connector'),
              target,
              embedding,
            ),
          ),
        );

        // In case of an error return a response
        for (const raTargetOrResponse of raTargetsOrResponses) {
          if (raTargetOrResponse instanceof Response) {
            return raTargetOrResponse;
          }
        }

        const raTargets = raTargetsOrResponses.filter(
          (target) => !(target instanceof Response),
        ) as ReactiveAgentsTarget[];

        const raConfig: ReactiveAgentsConfig = {
          ...raConfigPreProcessed,
          targets: raTargets,
        };

        c.set('ra_config', raConfig);
      }
    }
    await next();
  },
);
