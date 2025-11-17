import {
  AzureAIFoundryConfig,
  AzureOpenAIConfig,
  HeaderKey,
  NonPrivateReactiveAgentsConfig,
  OptimizationType,
  ReactiveAgentsConfig,
  ReactiveAgentsConfigPreProcessed,
  ReactiveAgentsTarget,
  ReactiveAgentsTargetPreProcessed,
  RetrySettings,
  Strategy,
  StrategyModes,
} from '@shared/types/api/request/headers';
import { AIProvider } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import { describe, expect, it } from 'vitest';

describe('Request Headers Types', () => {
  describe('HeaderKey Enum', () => {
    it('should have correct enum values', () => {
      expect(HeaderKey.CONFIG).toBe('ra-config');
      expect(HeaderKey.CONTENT_TYPE).toBe('content-type');
    });
  });

  describe('RetrySettings', () => {
    it('should validate basic retry settings', () => {
      const retrySettings = {
        attempts: 3,
      };

      expect(() => RetrySettings.parse(retrySettings)).not.toThrow();
      const parsed = RetrySettings.parse(retrySettings);
      expect(parsed.attempts).toBe(3);
    });

    it('should validate retry settings with all fields', () => {
      const retrySettings = {
        attempts: 5,
        on_status_codes: [500, 502, 503, 504],
        use_retry_after_header: true,
      };

      expect(() => RetrySettings.parse(retrySettings)).not.toThrow();
      const parsed = RetrySettings.parse(retrySettings);
      expect(parsed.attempts).toBe(5);
      expect(parsed.on_status_codes).toEqual([500, 502, 503, 504]);
      expect(parsed.use_retry_after_header).toBe(true);
    });

    it('should apply default on_status_codes when not provided', () => {
      const retrySettings = {
        attempts: 2,
      };

      const parsed = RetrySettings.parse(retrySettings);
      expect(parsed.on_status_codes).toBeDefined();
      expect(Array.isArray(parsed.on_status_codes)).toBe(true);
    });

    it('should reject invalid attempts type', () => {
      const invalidSettings = {
        attempts: 'invalid',
      };

      expect(() => RetrySettings.parse(invalidSettings)).toThrow();
    });

    it('should handle optional fields', () => {
      const settings = {
        attempts: 1,
        use_retry_after_header: false,
      };

      expect(() => RetrySettings.parse(settings)).not.toThrow();
      const parsed = RetrySettings.parse(settings);
      expect(parsed.use_retry_after_header).toBe(false);
    });
  });

  describe('AzureOpenAIConfig', () => {
    it('should validate valid Azure OpenAI URL', () => {
      const config = {
        url: 'https://my-resource.openai.azure.com',
      };

      expect(() => AzureOpenAIConfig.parse(config)).not.toThrow();
      const parsed = AzureOpenAIConfig.parse(config);
      expect(parsed.url).toBe('https://my-resource.openai.azure.com');
    });

    it('should transform URL by removing trailing slash', () => {
      const config = {
        url: 'https://my-resource.openai.azure.com/',
      };

      const parsed = AzureOpenAIConfig.parse(config);
      expect(parsed.url).toBe('https://my-resource.openai.azure.com');
    });

    it('should transform URL by removing ending path', () => {
      const config = {
        url: 'https://my-resource.openai.azure.com/openai/deployments/gpt-4',
      };

      const parsed = AzureOpenAIConfig.parse(config);
      // The transformation should remove ending paths
      expect(parsed.url).toMatch(/^https:\/\/my-resource\.openai\.azure\.com/);
    });

    it('should reject invalid URL format', () => {
      const config = {
        url: 'not-a-valid-url',
      };

      expect(() => AzureOpenAIConfig.parse(config)).toThrow(
        '`url` is required',
      );
    });

    it('should require URL field', () => {
      const config = {};

      expect(() => AzureOpenAIConfig.parse(config)).toThrow();
    });
  });

  describe('AzureAIFoundryConfig', () => {
    it('should validate valid Azure AI Foundry URL', () => {
      const config = {
        url: 'https://my-foundry.inference.ai.azure.com',
      };

      expect(() => AzureAIFoundryConfig.parse(config)).not.toThrow();
      const parsed = AzureAIFoundryConfig.parse(config);
      expect(parsed.url).toBe('https://my-foundry.inference.ai.azure.com');
    });

    it('should handle URL transformations', () => {
      const config = {
        url: 'https://my-foundry.inference.ai.azure.com/',
      };

      const parsed = AzureAIFoundryConfig.parse(config);
      expect(parsed.url).toBe('https://my-foundry.inference.ai.azure.com');
    });

    it('should reject invalid URL', () => {
      const config = {
        url: 'invalid-url',
      };

      expect(() => AzureAIFoundryConfig.parse(config)).toThrow();
    });
  });

  describe('StrategyModes Enum', () => {
    it('should have correct enum values', () => {
      expect(StrategyModes.LOADBALANCE).toBe('loadbalance');
      expect(StrategyModes.FALLBACK).toBe('fallback');
      expect(StrategyModes.SINGLE).toBe('single');
      expect(StrategyModes.CONDITIONAL).toBe('conditional');
    });
  });

  describe('Strategy', () => {
    it('should validate basic strategy', () => {
      const strategy = {
        mode: StrategyModes.SINGLE,
      };

      expect(() => Strategy.parse(strategy)).not.toThrow();
      const parsed = Strategy.parse(strategy);
      expect(parsed.mode).toBe('single');
    });

    it('should validate strategy with all fields', () => {
      const strategy = {
        mode: StrategyModes.CONDITIONAL,
        on_status_codes: [404, 500],
        conditions: [
          {
            query: { model: 'gpt-4' },
            target: 'openai-target',
          },
        ],
        default: 'fallback-target',
      };

      expect(() => Strategy.parse(strategy)).not.toThrow();
      const parsed = Strategy.parse(strategy);
      expect(parsed.mode).toBe('conditional');
      expect(parsed.on_status_codes).toEqual([404, 500]);
      expect(parsed.conditions).toHaveLength(1);
      expect(parsed.conditions![0].target).toBe('openai-target');
      expect(parsed.default).toBe('fallback-target');
    });

    it('should validate loadbalance strategy', () => {
      const strategy = {
        mode: StrategyModes.LOADBALANCE,
        on_status_codes: [429, 503],
      };

      expect(() => Strategy.parse(strategy)).not.toThrow();
      const parsed = Strategy.parse(strategy);
      expect(parsed.mode).toBe('loadbalance');
    });

    it('should validate fallback strategy', () => {
      const strategy = {
        mode: StrategyModes.FALLBACK,
        on_status_codes: [500, 502, 503],
      };

      expect(() => Strategy.parse(strategy)).not.toThrow();
      const parsed = Strategy.parse(strategy);
      expect(parsed.mode).toBe('fallback');
    });

    it('should reject invalid strategy mode', () => {
      const strategy = {
        mode: 'invalid-mode',
      };

      expect(() => Strategy.parse(strategy)).toThrow();
    });

    it('should handle complex conditional strategy', () => {
      const strategy = {
        mode: StrategyModes.CONDITIONAL,
        conditions: [
          {
            query: {
              model: 'gpt-4',
              temperature: 0.5,
            },
            target: 'openai-gpt4',
          },
          {
            query: {
              model: 'claude-3-opus',
            },
            target: 'anthropic-claude',
          },
        ],
        default: 'default-target',
      };

      expect(() => Strategy.parse(strategy)).not.toThrow();
      const parsed = Strategy.parse(strategy);
      expect(parsed.conditions).toHaveLength(2);
    });
  });

  describe('ReactiveAgentsTargetPreProcessed', () => {
    it('should validate minimal target configuration with provider', () => {
      const target = {
        provider: AIProvider.OPENAI,
        model: 'gpt-4',
      };

      expect(() =>
        ReactiveAgentsTargetPreProcessed.parse(target),
      ).not.toThrow();
      const parsed = ReactiveAgentsTargetPreProcessed.parse(target);
      expect(parsed.provider).toBe(AIProvider.OPENAI);
      expect(parsed.model).toBe('gpt-4');
      expect(parsed.weight).toBe(1); // default value
    });

    it('should validate minimal target configuration with configuration_name', () => {
      const target = {
        optimization: OptimizationType.AUTO,
      };

      expect(() =>
        ReactiveAgentsTargetPreProcessed.parse(target),
      ).not.toThrow();
      const parsed = ReactiveAgentsTargetPreProcessed.parse(target);
      expect(parsed.optimization).toBe(OptimizationType.AUTO);
      expect(parsed.weight).toBe(1); // default value
    });

    it('should validate target with optimization and optimization_version', () => {
      const target = {
        optimization: OptimizationType.AUTO,
        optimization_version: 1,
      };

      expect(() =>
        ReactiveAgentsTargetPreProcessed.parse(target),
      ).not.toThrow();
      const parsed = ReactiveAgentsTargetPreProcessed.parse(target);
      expect(parsed.optimization).toBe(OptimizationType.AUTO);
      expect(parsed.optimization_version).toBe(1);
    });

    it('should reject optimization_version without optimization set to auto', () => {
      const target = {
        provider: AIProvider.OPENAI,
        model: 'gpt-4',
        optimization_version: 1,
      };

      expect(() => ReactiveAgentsTargetPreProcessed.parse(target)).toThrow(
        '`optimization_version` is defined, but `optimization` is set to none. Set `optimization` to auto to use an optimization version.',
      );
    });

    it('should reject target without provider when optimization is not auto', () => {
      const target = {
        api_key: 'test-key',
      };

      expect(() => ReactiveAgentsTargetPreProcessed.parse(target)).toThrow(
        '`provider` is required when optimization is not set to auto',
      );
    });

    it('should reject provider without model', () => {
      const target = {
        provider: AIProvider.OPENAI,
      };

      expect(() => ReactiveAgentsTargetPreProcessed.parse(target)).toThrow(
        'A model is required when using a provider.',
      );
    });

    it('should validate complete pre-processed target configuration', () => {
      const target = {
        id: 'openai-target-1',
        index: 0,
        weight: 2,
        on_status_codes: [429, 500],
        request_timeout: 30000,
        custom_host: 'custom.openai.com',
        forward_headers: ['Authorization', 'User-Agent'],
        cache: {
          mode: CacheMode.SIMPLE,
          ttl: 300,
        },
        retry: {
          attempts: 3,
          on_status_codes: [500, 502],
        },
        provider: AIProvider.OPENAI,
        model: 'gpt-4',
        api_key: 'sk-test-key',
        openai_project: 'proj_123',
        openai_organization: 'org_456',
        openai_beta: 'assistants=v2',
      };

      expect(() =>
        ReactiveAgentsTargetPreProcessed.parse(target),
      ).not.toThrow();
      const parsed = ReactiveAgentsTargetPreProcessed.parse(target);
      expect(parsed.id).toBe('openai-target-1');
      expect(parsed.weight).toBe(2);
      expect(parsed.provider).toBe(AIProvider.OPENAI);
      expect(parsed.openai_project).toBe('proj_123');
    });
  });

  describe('ReactiveAgentsTarget', () => {
    it('should validate minimal target configuration', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'sk-test-key',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.OPENAI);
      expect(parsed.configuration.model).toBe('gpt-4');
      expect(parsed.api_key).toBe('sk-test-key');
      expect(parsed.weight).toBe(1); // default value
    });

    it('should validate complete target configuration', () => {
      const target = {
        id: 'openai-target-1',
        index: 0,
        weight: 2,
        on_status_codes: [429, 500],
        request_timeout: 30000,
        custom_host: 'custom.openai.com',
        forward_headers: ['Authorization', 'User-Agent'],
        cache: {
          mode: CacheMode.SIMPLE,
          ttl: 300,
        },
        retry: {
          attempts: 3,
          on_status_codes: [500, 502],
        },
        configuration: {
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
          frequency_penalty: 0,
          presence_penalty: 0,
          stop: ['\n'],
          seed: 42,
          reasoning_effort: null,
          additional_params: { custom: 'value' },
        },
        api_key: 'sk-test-key',
        openai_project: 'proj_123',
        openai_organization: 'org_456',
        openai_beta: 'assistants=v2',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.id).toBe('openai-target-1');
      expect(parsed.weight).toBe(2);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.OPENAI);
      expect(parsed.configuration.model).toBe('gpt-4');
      expect(parsed.configuration.temperature).toBe(0.7);
      expect(parsed.openai_project).toBe('proj_123');
    });

    it('should validate Azure OpenAI target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.AZURE_OPENAI,
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'azure-key',
        azure_openai_config: {
          url: 'https://my-resource.openai.azure.com',
        },
        azure_auth_mode: 'api_key',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.AZURE_OPENAI);
      expect(parsed.configuration.model).toBe('gpt-4');
      expect(parsed.azure_openai_config?.url).toBe(
        'https://my-resource.openai.azure.com',
      );
    });

    it('should validate Azure AI Foundry target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.AZURE_AI_FOUNDRY,
          model: 'meta-llama-3-8b-instruct',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'foundry-key',
        azure_ai_foundry_config: {
          url: 'https://my-foundry.inference.ai.azure.com',
        },
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(
        AIProvider.AZURE_AI_FOUNDRY,
      );
      expect(parsed.configuration.model).toBe('meta-llama-3-8b-instruct');
      expect(parsed.azure_ai_foundry_config?.url).toBe(
        'https://my-foundry.inference.ai.azure.com',
      );
    });

    it('should validate Anthropic target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.ANTHROPIC,
          model: 'claude-3-opus-20240229',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'anthropic-key',
        anthropic_beta: 'max-tokens-3-5-sonnet-2024-07-15',
        anthropic_version: '2023-06-01',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.ANTHROPIC);
      expect(parsed.configuration.model).toBe('claude-3-opus-20240229');
      expect(parsed.anthropic_beta).toBe('max-tokens-3-5-sonnet-2024-07-15');
      expect(parsed.anthropic_version).toBe('2023-06-01');
    });

    it('should validate AWS Bedrock target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.BEDROCK,
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'bedrock-key',
        aws_access_key_id: 'AKIA123',
        aws_secret_access_key: 'secret123',
        aws_region: 'us-east-1',
        aws_bedrock_model: 'anthropic.claude-3-sonnet-20240229-v1:0',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.BEDROCK);
      expect(parsed.configuration.model).toBe(
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );
      expect(parsed.aws_region).toBe('us-east-1');
      expect(parsed.aws_bedrock_model).toBe(
        'anthropic.claude-3-sonnet-20240229-v1:0',
      );
    });

    it('should validate Google Vertex AI target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.GOOGLE_VERTEX_AI,
          model: 'gemini-pro',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'vertex-key',
        vertex_project_id: 'my-project',
        vertex_region: 'us-central1',
        vertex_service_account_json: '{"type": "service_account"}',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(
        AIProvider.GOOGLE_VERTEX_AI,
      );
      expect(parsed.configuration.model).toBe('gemini-pro');
      expect(parsed.vertex_project_id).toBe('my-project');
      expect(parsed.vertex_region).toBe('us-central1');
    });

    it('should validate Hugging Face target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.HUGGINGFACE,
          model: 'microsoft/DialoGPT-medium',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'hf_key',
        huggingface_base_url: 'https://api-inference.huggingface.co',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.HUGGINGFACE);
      expect(parsed.configuration.model).toBe('microsoft/DialoGPT-medium');
      expect(parsed.huggingface_base_url).toBe(
        'https://api-inference.huggingface.co',
      );
    });

    it('should validate Stability AI target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.STABILITY_AI,
          model: 'stable-diffusion-xl-1024-v1-0',
          system_prompt: null,
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'sk-stability',
        stability_client_id: 'client123',
        stability_client_user_id: 'user456',
        stability_client_version: '1.0.0',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.STABILITY_AI);
      expect(parsed.configuration.model).toBe('stable-diffusion-xl-1024-v1-0');
      expect(parsed.stability_client_id).toBe('client123');
    });

    it('should validate SageMaker target', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.SAGEMAKER,
          model: 'my-custom-model',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'sagemaker-key',
        aws_access_key_id: 'AKIA123',
        aws_secret_access_key: 'secret123',
        aws_region: 'us-west-2',
        amzn_sagemaker_model_name: 'my-model',
        amzn_sagemaker_target_variant: 'AllTraffic',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.SAGEMAKER);
      expect(parsed.configuration.model).toBe('my-custom-model');
      expect(parsed.amzn_sagemaker_model_name).toBe('my-model');
    });

    it('should apply default values', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'sk-test-key',
      };

      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.weight).toBe(1);
      expect(parsed.cache.mode).toBe(CacheMode.DISABLED);
      expect(parsed.retry.attempts).toBe(0);
    });

    it('should reject missing configuration', () => {
      const target = {
        api_key: 'test-key',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).toThrow();
    });

    it('should reject invalid configuration provider', () => {
      const target = {
        configuration: {
          ai_provider: 'invalid-provider',
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: 'test-key',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).toThrow();
    });

    it('should handle inner_provider for proxied requests', () => {
      const target = {
        configuration: {
          ai_provider: AIProvider.OPENROUTER,
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        inner_provider: AIProvider.OPENAI,
        api_key: 'test-key',
      };

      expect(() => ReactiveAgentsTarget.parse(target)).not.toThrow();
      const parsed = ReactiveAgentsTarget.parse(target);
      expect(parsed.configuration.ai_provider).toBe(AIProvider.OPENROUTER);
      expect(parsed.inner_provider).toBe(AIProvider.OPENAI);
    });
  });

  describe('BaseReactiveAgentsConfig', () => {
    it('should validate minimal base config', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
      };

      expect(() => NonPrivateReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = NonPrivateReactiveAgentsConfig.parse(config);
      expect(parsed.agent_name).toBe('test-agent');
      expect(parsed.skill_name).toBe('test-skill');
    });

    it('should validate complete base config', () => {
      const config = {
        agent_name: 'my-agent',
        skill_name: 'chat-completion',
        override_params: {
          temperature: 0.7,
          max_tokens: 1000,
        },
        request_timeout: 30000,
        forward_headers: ['Authorization', 'Content-Type'],
        force_refresh: true,
        force_hook_refresh: false,
        strict_open_ai_compliance: true,
        metadata: {
          user_id: 'user123',
          session_id: 'session456',
          experiment: 'A/B-test',
        },
      };

      expect(() => NonPrivateReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = NonPrivateReactiveAgentsConfig.parse(config);
      expect(parsed.agent_name).toBe('my-agent');
      expect(parsed.override_params).toBeDefined();
      expect(parsed.force_refresh).toBe(true);
      expect(parsed.metadata?.user_id).toBe('user123');
    });

    it('should require agent_name', () => {
      const config = {
        skill_name: 'test-skill',
      };

      expect(() => NonPrivateReactiveAgentsConfig.parse(config)).toThrow(
        'Agent name is required',
      );
    });

    it('should require skill_name', () => {
      const config = {
        agent_name: 'test-agent',
      };

      expect(() => NonPrivateReactiveAgentsConfig.parse(config)).toThrow(
        'Skill name is required',
      );
    });

    it('should handle optional fields', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        strict_open_ai_compliance: false,
      };

      expect(() => NonPrivateReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = NonPrivateReactiveAgentsConfig.parse(config);
      expect(parsed.strict_open_ai_compliance).toBe(false);
    });
  });

  describe('ReactiveAgentsConfigPreProcessed', () => {
    it('should validate minimal Reactive Agents config pre-processed', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        targets: [
          {
            provider: AIProvider.OPENAI,
            model: 'gpt-4',
            api_key: 'sk-test',
          },
        ],
      };

      expect(() =>
        ReactiveAgentsConfigPreProcessed.parse(config),
      ).not.toThrow();
      const parsed = ReactiveAgentsConfigPreProcessed.parse(config);
      expect(parsed.agent_name).toBe('test-agent');
      expect(parsed.targets).toHaveLength(1);
      expect(parsed.targets[0].provider).toBe(AIProvider.OPENAI);
      expect(parsed.targets[0].model).toBe('gpt-4');
      expect(parsed.strategy.mode).toBe(StrategyModes.SINGLE); // default
      expect(parsed.hooks).toEqual([]); // default
      expect(parsed.trace_id).toBeDefined(); // auto-generated
    });

    it('should validate config with optimization auto', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        targets: [
          {
            optimization: OptimizationType.AUTO,
            api_key: 'sk-test',
          },
        ],
      };

      expect(() =>
        ReactiveAgentsConfigPreProcessed.parse(config),
      ).not.toThrow();
      const parsed = ReactiveAgentsConfigPreProcessed.parse(config);
      expect(parsed.targets[0].optimization).toBe(OptimizationType.AUTO);
    });

    it('should validate config with system_prompt_variables', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        system_prompt_variables: {
          name: 'Assistant',
          role: 'helpful',
          datetime: '2024-01-01',
        },
        targets: [
          {
            provider: AIProvider.OPENAI,
            model: 'gpt-4',
            api_key: 'sk-test',
          },
        ],
      };

      expect(() =>
        ReactiveAgentsConfigPreProcessed.parse(config),
      ).not.toThrow();
      const parsed = ReactiveAgentsConfigPreProcessed.parse(config);
      expect(parsed.system_prompt_variables?.name).toBe('Assistant');
      expect(parsed.system_prompt_variables?.role).toBe('helpful');
      expect(parsed.system_prompt_variables?.datetime).toBe('2024-01-01');
    });
  });

  describe('ReactiveAgentsConfig', () => {
    it('should validate minimal Reactive Agents config', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-test',
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.agent_name).toBe('test-agent');
      expect(parsed.targets).toHaveLength(1);
      expect(parsed.targets[0].configuration.ai_provider).toBe(
        AIProvider.OPENAI,
      );
      expect(parsed.targets[0].configuration.model).toBe('gpt-4');
      expect(parsed.strategy.mode).toBe(StrategyModes.SINGLE); // default
      expect(parsed.hooks).toEqual([]); // default
      expect(parsed.trace_id).toBeDefined(); // auto-generated
    });

    it('should validate complete Reactive Agents config', () => {
      const config = {
        agent_name: 'production-agent',
        skill_name: 'multi-model-chat',
        override_params: {
          temperature: 0.8,
          max_tokens: 2000,
        },
        strategy: {
          mode: StrategyModes.LOADBALANCE,
          on_status_codes: [429, 500],
        },
        targets: [
          {
            id: 'openai-primary',
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: 0.7,
              max_tokens: 1000,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
              reasoning_effort: null,
            },
            api_key: 'sk-openai',
            weight: 3,
          },
          {
            id: 'anthropic-fallback',
            configuration: {
              ai_provider: AIProvider.ANTHROPIC,
              model: 'claude-3-opus-20240229',
              system_prompt: 'You are a helpful assistant.',
              temperature: 0.5,
              max_tokens: 2000,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
              reasoning_effort: null,
            },
            api_key: 'anthropic-key',
            weight: 1,
          },
        ],
        hooks: [
          {
            id: 'hook-1',
            type: 'input',
            hook_provider: 'http',
            config: {
              method: 'POST',
              url: 'https://example.com/hook',
            },
          },
        ],
        app_id: 'my-app',
        trace_id: 'custom-trace-123',
        span_name: 'chat-completion',
        user_human_name: 'John Doe',
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.strategy.mode).toBe('loadbalance');
      expect(parsed.targets).toHaveLength(2);
      expect(parsed.targets[0].id).toBe('openai-primary');
      expect(parsed.targets[0].configuration.ai_provider).toBe(
        AIProvider.OPENAI,
      );
      expect(parsed.targets[1].configuration.ai_provider).toBe(
        AIProvider.ANTHROPIC,
      );
      expect(parsed.trace_id).toBe('custom-trace-123');
      expect(parsed.user_human_name).toBe('John Doe');
    });

    it('should validate Google Vertex AI specific requirements', () => {
      const validConfig = {
        agent_name: 'vertex-agent',
        skill_name: 'vertex-skill',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.GOOGLE_VERTEX_AI,
              model: 'gemini-pro',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
              reasoning_effort: null,
            },
            vertex_project_id: 'my-project',
            vertex_region: 'us-central1',
            api_key: 'ya29...',
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(validConfig)).not.toThrow();
    });

    it('should reject Google Vertex AI config missing required fields', () => {
      const invalidConfig = {
        agent_name: 'vertex-agent',
        skill_name: 'vertex-skill',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.GOOGLE_VERTEX_AI,
              model: 'gemini-pro',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
              reasoning_effort: null,
            },
            api_key: 'ya29...',
            // Missing vertex_project_id and vertex_region
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(invalidConfig)).toThrow(
        /Invalid configuration.*vertex_project_id.*vertex_region/,
      );
    });

    it('should validate Google Vertex AI with service account', () => {
      const config = {
        agent_name: 'vertex-agent',
        skill_name: 'vertex-skill',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.GOOGLE_VERTEX_AI,
              model: 'gemini-pro',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'vertex-key',
            vertex_region: 'us-central1',
            vertex_service_account_json:
              '{"type": "service_account", "project_id": "my-project"}',
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
    });

    it('should validate fallback strategy config', () => {
      const config = {
        agent_name: 'fallback-agent',
        skill_name: 'reliable-chat',
        strategy: {
          mode: StrategyModes.FALLBACK,
          on_status_codes: [429, 500, 502, 503],
        },
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'primary-key',
          },
          {
            configuration: {
              ai_provider: AIProvider.ANTHROPIC,
              model: 'claude-3-opus-20240229',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'fallback-key',
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.strategy.mode).toBe('fallback');
      expect(parsed.strategy.on_status_codes).toEqual([429, 500, 502, 503]);
    });

    it('should validate conditional strategy config', () => {
      const config = {
        agent_name: 'conditional-agent',
        skill_name: 'smart-routing',
        strategy: {
          mode: StrategyModes.CONDITIONAL,
          conditions: [
            {
              query: { model: 'gpt-4' },
              target: 'openai-target',
            },
            {
              query: { model: 'claude-3-opus' },
              target: 'anthropic-target',
            },
          ],
          default: 'openai-target',
        },
        targets: [
          {
            id: 'openai-target',
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'openai-key',
          },
          {
            id: 'anthropic-target',
            configuration: {
              ai_provider: AIProvider.ANTHROPIC,
              model: 'claude-3-opus-20240229',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'anthropic-key',
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.strategy.conditions).toHaveLength(2);
      expect(parsed.strategy.default).toBe('openai-target');
    });

    it('should allow empty targets array', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        targets: [],
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
    });

    it('should generate trace_id if not provided', () => {
      const config = {
        agent_name: 'test-agent',
        skill_name: 'test-skill',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-test-key',
          },
        ],
      };

      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.trace_id).toBeDefined();
      expect(typeof parsed.trace_id).toBe('string');
      expect(parsed.trace_id.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should validate multi-provider configuration', () => {
      const config = {
        agent_name: 'multi-provider-agent',
        skill_name: 'comprehensive-ai',
        strategy: {
          mode: StrategyModes.LOADBALANCE,
        },
        targets: [
          // OpenAI
          {
            id: 'openai-gpt4',
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-openai',
            openai_project: 'proj_123',
            weight: 2,
          },
          // Anthropic
          {
            id: 'anthropic-claude',
            configuration: {
              ai_provider: AIProvider.ANTHROPIC,
              model: 'claude-3-opus-20240229',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'anthropic-key',
            anthropic_version: '2023-06-01',
            weight: 1,
          },
          // Azure OpenAI
          {
            id: 'azure-openai',
            configuration: {
              ai_provider: AIProvider.AZURE_OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'azure-key',
            azure_openai_config: {
              url: 'https://my-resource.openai.azure.com',
            },
            weight: 1,
          },
          // Google Vertex AI
          {
            id: 'vertex-ai',
            configuration: {
              ai_provider: AIProvider.GOOGLE_VERTEX_AI,
              model: 'gemini-pro',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            vertex_project_id: 'my-project',
            vertex_region: 'us-central1',
            api_key: 'ya29...',
            weight: 1,
          },
        ],
        app_id: 'multi-provider-app',
        metadata: {
          environment: 'production',
          version: '1.0.0',
        },
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.targets).toHaveLength(4);
      expect(parsed.targets.map((t) => t.configuration.ai_provider)).toEqual([
        AIProvider.OPENAI,
        AIProvider.ANTHROPIC,
        AIProvider.AZURE_OPENAI,
        AIProvider.GOOGLE_VERTEX_AI,
      ]);
    });

    it('should validate enterprise configuration with advanced features', () => {
      const config = {
        agent_name: 'enterprise-agent',
        skill_name: 'enterprise-chat',
        override_params: {
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.9,
        },
        request_timeout: 60000,
        forward_headers: ['Authorization', 'X-User-ID', 'X-Session-ID'],
        force_refresh: false,
        strict_open_ai_compliance: true,
        strategy: {
          mode: StrategyModes.CONDITIONAL,
          conditions: [
            {
              query: {
                model: 'gpt-4',
                user_tier: 'premium',
              },
              target: 'openai-premium',
            },
          ],
          default: 'openai-standard',
        },
        targets: [
          {
            id: 'openai-premium',
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-premium',
            custom_host: 'premium.openai.com',
            request_timeout: 45000,
            retry: {
              attempts: 3,
              on_status_codes: [429, 500, 502],
              use_retry_after_header: true,
            },
            cache: {
              mode: CacheMode.SEMANTIC,
              ttl: 3600,
            },
            weight: 1,
          },
          {
            id: 'openai-standard',
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-standard',
            retry: {
              attempts: 2,
            },
            weight: 1,
          },
        ],
        hooks: [
          {
            id: 'hook-auth',
            type: 'input',
            hook_provider: 'http',
            config: {
              method: 'POST',
              url: 'https://example.com/auth',
            },
          },
          {
            id: 'hook-audit',
            type: 'output',
            hook_provider: 'http',
            config: {
              method: 'POST',
              url: 'https://example.com/audit',
            },
          },
        ],
        app_id: 'enterprise-app',
        span_name: 'enterprise-chat-completion',
        metadata: {
          tenant_id: 'tenant_123',
          user_role: 'admin',
          compliance_level: 'high',
        },
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.targets[0].cache?.mode).toBe(CacheMode.SEMANTIC);
      expect(parsed.targets[0].retry.attempts).toBe(3);
      expect(parsed.hooks).toHaveLength(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty strings in required fields', () => {
      const config = {
        agent_name: '',
        skill_name: 'test-skill',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-test-key',
          },
        ],
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      // Note: Zod string validation allows empty strings unless explicitly constrained
    });

    it('should handle very large configuration', () => {
      const targets = Array.from({ length: 10 }, (_, i) => ({
        id: `target-${i}`,
        configuration: {
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          system_prompt: 'You are a helpful assistant.',
          temperature: null,
          max_tokens: null,
          top_p: null,
          frequency_penalty: null,
          presence_penalty: null,
          stop: null,
          seed: null,
          reasoning_effort: null,
          additional_params: null,
        },
        api_key: `key-${i}`,
        weight: i + 1,
      }));

      const config = {
        agent_name: 'load-test-agent',
        skill_name: 'load-test-skill',
        targets,
        metadata: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`]),
        ),
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.targets).toHaveLength(10);
    });

    it('should handle special characters in configuration', () => {
      const config = {
        agent_name: 'test-agent-ñ-🚀',
        skill_name: 'test-skill-ü-💯',
        targets: [
          {
            configuration: {
              ai_provider: AIProvider.OPENAI,
              model: 'gpt-4',
              system_prompt: 'You are a helpful assistant.',
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              reasoning_effort: null,
              additional_params: null,
            },
            api_key: 'sk-test_key.with-special@chars',
          },
        ],
        metadata: {
          'special-key': 'value with spaces',
          'unicode_🌟': 'star',
        },
      };

      expect(() => ReactiveAgentsConfig.parse(config)).not.toThrow();
      const parsed = ReactiveAgentsConfig.parse(config);
      expect(parsed.agent_name).toBe('test-agent-ñ-🚀');
      expect(parsed.metadata!['unicode_🌟']).toBe('star');
    });
  });
});
