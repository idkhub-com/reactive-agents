import type { UserDataStorageConnector } from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import { renderTemplate } from '@server/utils/templates';
import { error } from '@shared/console-logging';
import {
  type IdkConfig,
  IdkTarget,
  type IdkTargetPreProcessed,
  type TargetConfigurationParams,
} from '@shared/types/api/request';
import type { AIProvider } from '@shared/types/constants';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

async function validateIdkHubConfiguration(
  c: AppContext,
  userDataStorageConnector: UserDataStorageConnector,
  idkTargetPreProcessed: IdkTargetPreProcessed,
): Promise<IdkTarget | Response> {
  let idkTargetConfiguration: TargetConfigurationParams;
  let resolvedApiKey: string | undefined;

  // Apply configuration if specified
  if (idkTargetPreProcessed.configuration_name) {
    try {
      // Fetch configuration by name
      const configurations =
        await userDataStorageConnector.getSkillConfigurations({
          name: idkTargetPreProcessed.configuration_name,
          limit: 1,
        });

      if (configurations.length === 0) {
        return c.json(
          {
            error:
              'IdkHub configuration not found. Check your configuration name and ensure it exists.',
          },
          422,
        );
      }

      const configuration = configurations[0];

      // Get the specific version or default to 'current'
      const versionKey =
        idkTargetPreProcessed.configuration_version || 'current';
      const configVersion = configuration.data[versionKey];

      if (!configVersion) {
        return c.json(
          {
            error: `Configuration version '${versionKey}' not found for '${idkTargetPreProcessed.configuration_name}'`,
          },
          422,
        );
      }

      configVersion.params.system_prompt = renderTemplate(
        configVersion.params.system_prompt!,
        idkTargetPreProcessed.system_prompt_variables || {},
      );

      // Resolve model_id to get model name and provider
      const modelRecord = await userDataStorageConnector.getModelById(
        configVersion.params.model_id,
      );

      if (!modelRecord) {
        return c.json(
          {
            error: `Model with ID '${configVersion.params.model_id}' not found`,
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
        system_prompt: configVersion.params.system_prompt,
        temperature: configVersion.params.temperature,
        max_tokens: configVersion.params.max_tokens,
        top_p: configVersion.params.top_p,
        frequency_penalty: configVersion.params.frequency_penalty,
        presence_penalty: configVersion.params.presence_penalty,
        stop: configVersion.params.stop,
        seed: configVersion.params.seed,
        additional_params: configVersion.params.additional_params,
      };
    } catch (error) {
      return c.json(
        {
          error: `Failed to load configuration '${idkTargetPreProcessed.configuration_name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
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

        const idkTargetsOrResponses = await Promise.all(
          idkConfigPreProcessed.targets.map((target) =>
            validateIdkHubConfiguration(
              c,
              c.get('user_data_storage_connector'),
              target,
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
