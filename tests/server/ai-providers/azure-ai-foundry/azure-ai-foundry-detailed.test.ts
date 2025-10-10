import {
  azureAIInferenceConfig,
  githubModelAPiConfig,
} from '@server/ai-providers/azure-ai-foundry';
import { azureAIInferenceAPI } from '@server/ai-providers/azure-ai-foundry/api';
import {
  azureAIInferenceChatCompleteConfig,
  azureAIInferenceChatCompleteResponseTransform,
} from '@server/ai-providers/azure-ai-foundry/chat-complete';
import {
  azureAIInferenceCompleteConfig,
  azureAIInferenceCompleteResponseTransform,
} from '@server/ai-providers/azure-ai-foundry/complete';
import {
  azureAIInferenceEmbedConfig,
  azureAIInferenceEmbedResponseTransform,
} from '@server/ai-providers/azure-ai-foundry/embed';
import type {
  AzureAIInferenceChatCompleteResponse,
  AzureAIInferenceCompleteResponse,
  AzureAIInferenceEmbedResponse,
} from '@server/ai-providers/azure-ai-foundry/types';
import { FunctionName, type IdkRequestData } from '@shared/types/api/request';
import type { ParameterConfig } from '@shared/types/api/response/body';
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test helper - use unknown casting for test contexts
type TestContext = Parameters<typeof azureAIInferenceAPI.getBaseURL>[0];

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock fetch for authentication tests
global.fetch = vi.fn();

describe('Azure AI Foundry AI Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockClear();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties for Azure AI', () => {
      expect(azureAIInferenceConfig).toBeDefined();
      expect(azureAIInferenceConfig.api).toBeDefined();
      expect(azureAIInferenceConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(azureAIInferenceConfig[FunctionName.COMPLETE]).toBeDefined();
      expect(azureAIInferenceConfig[FunctionName.EMBED]).toBeDefined();
      expect(azureAIInferenceConfig.responseTransforms).toBeDefined();
    });

    it('should have all required configuration properties for GitHub Models', () => {
      expect(githubModelAPiConfig).toBeDefined();
      expect(githubModelAPiConfig.api).toBeDefined();
      expect(githubModelAPiConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(githubModelAPiConfig[FunctionName.COMPLETE]).toBeDefined();
      expect(githubModelAPiConfig[FunctionName.EMBED]).toBeDefined();
      expect(githubModelAPiConfig.responseTransforms).toBeDefined();
    });

    it('should use same API config for both Azure AI and GitHub providers', () => {
      expect(azureAIInferenceConfig.api).toBe(githubModelAPiConfig.api);
      expect(azureAIInferenceConfig[FunctionName.CHAT_COMPLETE]).toBe(
        githubModelAPiConfig[FunctionName.CHAT_COMPLETE],
      );
      expect(azureAIInferenceConfig[FunctionName.COMPLETE]).toBe(
        githubModelAPiConfig[FunctionName.COMPLETE],
      );
      expect(azureAIInferenceConfig[FunctionName.EMBED]).toBe(
        githubModelAPiConfig[FunctionName.EMBED],
      );
    });

    it('should have correct provider-specific response transforms', () => {
      const azureTransforms = azureAIInferenceConfig.responseTransforms!;
      const githubTransforms = githubModelAPiConfig.responseTransforms!;

      // Both should exist but be different instances due to different providers
      expect(azureTransforms[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(githubTransforms[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(azureTransforms[FunctionName.COMPLETE]).toBeDefined();
      expect(githubTransforms[FunctionName.COMPLETE]).toBeDefined();
      expect(azureTransforms[FunctionName.EMBED]).toBeDefined();
      expect(githubTransforms[FunctionName.EMBED]).toBeDefined();
    });
  });

  describe('API Configuration', () => {
    it('should return GitHub Models URL when provider is GITHUB', () => {
      const baseURL = azureAIInferenceAPI.getBaseURL({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.GITHUB,
            model: 'gpt-4',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
        },
      } as unknown as TestContext);

      expect(baseURL).toBe('https://models.inference.ai.azure.com');
    });

    it('should return Azure AI Foundry URL from config', () => {
      const baseURL = azureAIInferenceAPI.getBaseURL({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_ai_foundry_config: {
            url: 'https://my-foundry-endpoint.inference.ai.azure.com',
          },
        },
      } as unknown as TestContext);

      expect(baseURL).toBe(
        'https://my-foundry-endpoint.inference.ai.azure.com',
      );
    });

    it('should throw error when azure_ai_foundry_config is missing for Azure AI', () => {
      expect(() => {
        azureAIInferenceAPI.getBaseURL({
          idkTarget: {
            configuration: {
              ai_provider: AIProvider.AZURE_AI_FOUNDRY,
              model: 'meta-llama-3-8b-instruct',
              system_prompt: null,
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
            },
            api_key: 'test-key',
          },
        } as unknown as TestContext);
      }).toThrow('`azure_ai_foundry_config` is required in target');
    });

    it('should return correct headers with API key authentication', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-api-key',
          azure_extra_params: 'pass-through',
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'pass-through',
        Authorization: 'Bearer test-api-key',
      });
    });

    it('should default extra-parameters to drop when not specified', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-api-key',
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
        Authorization: 'Bearer test-api-key',
      });
    });

    it('should handle Azure AD token authentication', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_ad_token: 'Bearer ad-token-123',
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
        Authorization: 'Bearer ad-token-123',
      });
    });

    it('should strip Bearer prefix from Azure AD token', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_ad_token: 'Bearer ad-token-123',
        },
      } as unknown as TestContext);

      expect(headers.Authorization).toBe('Bearer ad-token-123');
    });

    it('should handle Entra ID authentication', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'entra-token-123' }),
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_auth_mode: 'entra',
          azure_entra_tenant_id: 'tenant-123',
          azure_entra_client_id: 'client-123',
          azure_entra_client_secret: 'secret-123',
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
        Authorization: 'Bearer entra-token-123',
      });
    });

    it('should handle managed identity authentication', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'managed-token-123' }),
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_auth_mode: 'managed',
          azure_managed_client_id: 'managed-client-123',
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
        Authorization: 'Bearer managed-token-123',
      });
    });

    it('should return headers without authorization when no auth method specified', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
      });
    });

    it('should return correct endpoints for various functions', () => {
      const testCases = [
        {
          function: FunctionName.CHAT_COMPLETE,
          expected: '/models/chat/completions',
        },
        {
          function: FunctionName.COMPLETE,
          expected: '/models/completions',
        },
        {
          function: FunctionName.EMBED,
          expected: '/models/embeddings',
        },
      ];

      testCases.forEach(({ function: fn, expected }) => {
        const endpoint = azureAIInferenceAPI.getEndpoint({
          idkRequestData: {
            functionName: fn,
            requestBody: {},
          },
        } as unknown as TestContext);

        expect(endpoint).toBe(expected);
      });
    });

    it('should throw error for unsupported endpoints', () => {
      expect(() => {
        azureAIInferenceAPI.getEndpoint({
          idkRequestData: {
            functionName: 'UNSUPPORTED' as FunctionName,
            requestBody: {},
          },
        } as unknown as TestContext);
      }).toThrow('Endpoint not found for function UNSUPPORTED');
    });
  });

  describe('Chat Completion Configuration', () => {
    it('should have comprehensive parameter configuration', () => {
      const config = azureAIInferenceChatCompleteConfig;

      // Core parameters
      expect(config.model).toBeDefined();
      expect(config.messages).toBeDefined();
      expect(config.max_tokens).toBeDefined();
      expect(config.max_completion_tokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.top_p).toBeDefined();

      // Tools and functions
      expect(config.tools).toBeDefined();
      expect(config.tool_choice).toBeDefined();
      expect(config.response_format).toBeDefined();

      // Control parameters
      expect(config.stream).toBeDefined();
      expect(config.stop).toBeDefined();
      expect(config.presence_penalty).toBeDefined();
      expect(config.frequency_penalty).toBeDefined();
      expect(config.user).toBeDefined();
    });

    it('should have correct default values', () => {
      const config = azureAIInferenceChatCompleteConfig;

      expect((config.max_tokens as ParameterConfig)?.default).toBe(100);
      expect((config.max_completion_tokens as ParameterConfig)?.default).toBe(
        100,
      );
      expect((config.temperature as ParameterConfig)?.default).toBe(1);
      expect((config.top_p as ParameterConfig)?.default).toBe(1);
      expect((config.stream as ParameterConfig)?.default).toBe(false);
    });

    it('should have correct parameter ranges', () => {
      const config = azureAIInferenceChatCompleteConfig;

      expect((config.temperature as ParameterConfig)?.min).toBe(0);
      expect((config.temperature as ParameterConfig)?.max).toBe(2);
      expect((config.top_p as ParameterConfig)?.min).toBe(0);
      expect((config.top_p as ParameterConfig)?.max).toBe(1);
      expect((config.presence_penalty as ParameterConfig)?.min).toBe(-2);
      expect((config.presence_penalty as ParameterConfig)?.max).toBe(2);
      expect((config.frequency_penalty as ParameterConfig)?.min).toBe(-2);
      expect((config.frequency_penalty as ParameterConfig)?.max).toBe(2);
    });

    it('should transform DEVELOPER role to SYSTEM role', () => {
      const config = azureAIInferenceChatCompleteConfig;
      const transformFunction = (config.messages as ParameterConfig)?.transform;

      expect(transformFunction).toBeDefined();

      const requestBody: ChatCompletionRequestBody = {
        model: 'test-model',
        messages: [
          {
            role: ChatCompletionMessageRole.DEVELOPER,
            content: 'You are a helpful assistant',
          },
          {
            role: ChatCompletionMessageRole.USER,
            content: 'Hello',
          },
        ],
      };

      // biome-ignore lint/suspicious/noExplicitAny: Transform function has complex generic types
      const result = transformFunction!(requestBody as any);
      expect(result).toHaveLength(2);
      // biome-ignore lint/suspicious/noExplicitAny: Result type is complex generic
      expect((result as any)![0].role).toBe(ChatCompletionMessageRole.SYSTEM);
      // biome-ignore lint/suspicious/noExplicitAny: Result type is complex generic
      expect((result as any)![1].role).toBe(ChatCompletionMessageRole.USER);
    });

    it('should handle undefined messages in transform', () => {
      const config = azureAIInferenceChatCompleteConfig;
      const transformFunction = (config.messages as ParameterConfig)?.transform;

      const requestBody: ChatCompletionRequestBody = {
        model: 'test-model',
        // biome-ignore lint/suspicious/noExplicitAny: Testing undefined messages case
        messages: undefined as any,
      };

      // biome-ignore lint/suspicious/noExplicitAny: Transform function has complex generic types
      const result = transformFunction!(requestBody as any);
      expect(result).toBeUndefined();
    });
  });

  describe('Text Completion Configuration', () => {
    it('should have complete configuration', () => {
      const config = azureAIInferenceCompleteConfig;

      expect(config.model).toBeDefined();
      expect((config.model as ParameterConfig)?.required).toBe(false);
      expect(config.prompt).toBeDefined();
      expect(config.max_tokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.top_p).toBeDefined();
      expect(config.stream).toBeDefined();
      expect(config.stop).toBeDefined();
      expect(config.presence_penalty).toBeDefined();
      expect(config.frequency_penalty).toBeDefined();
      expect(config.user).toBeDefined();
    });

    it('should have correct default values', () => {
      const config = azureAIInferenceCompleteConfig;

      expect((config.prompt as ParameterConfig)?.default).toBe('');
      expect((config.max_tokens as ParameterConfig)?.default).toBe(100);
      expect((config.temperature as ParameterConfig)?.default).toBe(1);
      expect((config.top_p as ParameterConfig)?.default).toBe(1);
      expect((config.stream as ParameterConfig)?.default).toBe(false);
    });

    it('should have correct parameter ranges', () => {
      const config = azureAIInferenceCompleteConfig;

      expect((config.max_tokens as ParameterConfig)?.min).toBe(0);
      expect((config.temperature as ParameterConfig)?.min).toBe(0);
      expect((config.temperature as ParameterConfig)?.max).toBe(2);
      expect((config.top_p as ParameterConfig)?.min).toBe(0);
      expect((config.top_p as ParameterConfig)?.max).toBe(1);
      expect((config.presence_penalty as ParameterConfig)?.min).toBe(-2);
      expect((config.presence_penalty as ParameterConfig)?.max).toBe(2);
      expect((config.frequency_penalty as ParameterConfig)?.min).toBe(-2);
      expect((config.frequency_penalty as ParameterConfig)?.max).toBe(2);
    });
  });

  describe('Embedding Configuration', () => {
    it('should have embedding configuration', () => {
      const config = azureAIInferenceEmbedConfig;

      expect(config.model).toBeDefined();
      expect((config.model as ParameterConfig)?.required).toBe(false);
      expect(config.input).toBeDefined();
      expect((config.input as ParameterConfig)?.required).toBe(true);
      expect(config.user).toBeDefined();
    });
  });

  describe('Response Transformations', () => {
    describe('Chat Completion Response Transform', () => {
      it('should transform successful chat completion response for Azure AI', () => {
        const azureResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4o',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! How can I help you today?',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25,
          },
        };

        const transformer = azureAIInferenceChatCompleteResponseTransform(
          AIProvider.AZURE_AI_FOUNDRY,
        );
        const result = transformer(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as IdkRequestData,
        ) as ChatCompletionResponseBody;

        expect(result.id).toBe('chatcmpl-123');
        expect(result.object).toBe('chat.completion');
        expect(result.model).toBe('gpt-4o');
        expect(result.choices).toHaveLength(1);
        expect(result.choices[0].message.content).toBe(
          'Hello! How can I help you today?',
        );
        expect(result.choices[0].finish_reason).toBe('stop');
        expect(result.usage?.prompt_tokens).toBe(10);
      });

      it('should transform successful chat completion response for GitHub Models', () => {
        const githubResponse = {
          id: 'chatcmpl-456',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello from GitHub Models!',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 8,
            completion_tokens: 12,
            total_tokens: 20,
          },
        };

        const transformer = azureAIInferenceChatCompleteResponseTransform(
          AIProvider.GITHUB,
        );
        const result = transformer(
          githubResponse,
          200,
          new Headers(),
          true,
          {} as IdkRequestData,
        ) as ChatCompletionResponseBody;

        expect(result.id).toBe('chatcmpl-456');
        expect(result.model).toBe('gpt-4o-mini');
        expect(result.choices[0].message.content).toBe(
          'Hello from GitHub Models!',
        );
      });

      it('should handle function calls in response', () => {
        const response = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4o',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call-123',
                    type: 'function',
                    function: {
                      name: 'get_weather',
                      arguments: '{"location": "San Francisco"}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 5,
            total_tokens: 25,
          },
        };

        const transformer = azureAIInferenceChatCompleteResponseTransform(
          AIProvider.AZURE_AI_FOUNDRY,
        );
        const result = transformer(
          response,
          200,
          new Headers(),
          true,
          {} as IdkRequestData,
        ) as ChatCompletionResponseBody;

        expect(result.choices[0].message.tool_calls).toHaveLength(1);
        expect(result.choices[0].message.tool_calls![0].function.name).toBe(
          'get_weather',
        );
        expect(result.choices[0].finish_reason).toBe('tool_calls');
      });

      it('should transform error responses with correct provider', () => {
        const errorResponse = {
          error: {
            message: 'Model not found',
            type: 'model_not_found',
            code: 'model_not_found',
          },
        };

        const azureTransformer = azureAIInferenceChatCompleteResponseTransform(
          AIProvider.AZURE_AI_FOUNDRY,
        );
        const azureResult = azureTransformer(
          errorResponse,
          404,
          new Headers(),
          true,
          {} as IdkRequestData,
        );

        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((azureResult as any).error).toBeDefined();
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((azureResult as any).error.message).toBe(
          'azure-ai-foundry error: Model not found',
        );
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((azureResult as any).provider).toBe(AIProvider.AZURE_AI_FOUNDRY);

        const githubTransformer = azureAIInferenceChatCompleteResponseTransform(
          AIProvider.GITHUB,
        );
        const githubResult = githubTransformer(
          errorResponse,
          404,
          new Headers(),
          true,
          {} as IdkRequestData,
        );

        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((githubResult as any).error).toBeDefined();
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((githubResult as any).error.message).toBe(
          'github error: Model not found',
        );
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((githubResult as any).provider).toBe(AIProvider.GITHUB);
      });
    });

    describe('Text Completion Response Transform', () => {
      it('should transform successful text completion response', () => {
        const response = {
          id: 'cmpl-123',
          object: 'text_completion',
          created: 1677652288,
          model: 'gpt-3.5-turbo-instruct',
          choices: [
            {
              text: 'This is a completed text response.',
              index: 0,
              logprobs: null,
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 8,
            total_tokens: 13,
          },
        };

        const transformer = azureAIInferenceCompleteResponseTransform(
          AIProvider.AZURE_AI_FOUNDRY,
        );
        const result = transformer(
          response,
          200,
          new Headers(),
          true,
          {} as IdkRequestData,
        ) as CompletionResponseBody;

        expect(result.id).toBe('cmpl-123');
        expect(result.object).toBe('text_completion');
        expect(result.model).toBe('gpt-3.5-turbo-instruct');
        expect(result.choices[0].text).toBe(
          'This is a completed text response.',
        );
        expect(result.choices[0].finish_reason).toBe('stop');
      });

      it('should handle text completion errors', () => {
        const errorResponse = {
          error: {
            message: 'Invalid prompt',
            type: 'invalid_request_error',
            code: 'invalid_prompt',
          },
        };

        const transformer = azureAIInferenceCompleteResponseTransform(
          AIProvider.GITHUB,
        );
        const result = transformer(
          errorResponse,
          400,
          new Headers(),
          true,
          {} as IdkRequestData,
        );

        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((result as any).error).toBeDefined();
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((result as any).error.message).toBe(
          'github error: Invalid prompt',
        );
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((result as any).provider).toBe(AIProvider.GITHUB);
      });
    });

    describe('Embedding Response Transform', () => {
      it('should transform successful embedding response', () => {
        const response = {
          object: 'list',
          data: [
            {
              object: 'embedding',
              index: 0,
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            },
            {
              object: 'embedding',
              index: 1,
              embedding: [0.6, 0.7, 0.8, 0.9, 1.0],
            },
          ],
          model: 'text-embedding-ada-002',
          usage: {
            prompt_tokens: 16,
            total_tokens: 16,
          },
        };

        const transformer = azureAIInferenceEmbedResponseTransform(
          AIProvider.AZURE_AI_FOUNDRY,
        );
        const result = transformer(
          response,
          200,
          new Headers(),
          true,
          {} as IdkRequestData,
        ) as CreateEmbeddingsResponseBody;

        expect(result.object).toBe('list');
        expect(result.data).toHaveLength(2);
        expect(result.data[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
        expect(result.data[1].embedding).toEqual([0.6, 0.7, 0.8, 0.9, 1.0]);
        expect(result.model).toBe('text-embedding-ada-002');
        expect(result.usage?.prompt_tokens).toBe(16);
      });

      it('should handle embedding errors', () => {
        const errorResponse = {
          error: {
            message: 'Input too long',
            type: 'invalid_request_error',
            code: 'context_length_exceeded',
          },
        };

        const transformer = azureAIInferenceEmbedResponseTransform(
          AIProvider.AZURE_AI_FOUNDRY,
        );
        const result = transformer(
          errorResponse,
          400,
          new Headers(),
          true,
          {} as IdkRequestData,
        );

        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((result as any).error).toBeDefined();
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((result as any).error.message).toBe(
          'azure-ai-foundry error: Input too long',
        );
        // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
        expect((result as any).provider).toBe(AIProvider.AZURE_AI_FOUNDRY);
      });
    });
  });

  describe('Type Definitions', () => {
    it('should have correct type interfaces', () => {
      // These interfaces extend the base response types
      // We're testing that they compile correctly
      const chatResponse: AzureAIInferenceChatCompleteResponse = {
        id: 'test',
        object: 'chat.completion',
        created: 123456789,
        model: 'test-model',
        choices: [],
      };

      const completeResponse: AzureAIInferenceCompleteResponse = {
        id: 'test',
        object: 'text_completion',
        created: 123456789,
        model: 'test-model',
        choices: [],
      };

      const embedResponse: AzureAIInferenceEmbedResponse = {
        object: 'list',
        data: [],
        model: 'test-model',
        usage: {
          prompt_tokens: 0,
          total_tokens: 0,
        },
      };

      expect(chatResponse.object).toBe('chat.completion');
      expect(completeResponse.object).toBe('text_completion');
      expect(embedResponse.object).toBe('list');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication failures', () => {
      const errorResponse = {
        error: {
          message: 'Authentication failed',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      };

      const transformer = azureAIInferenceChatCompleteResponseTransform(
        AIProvider.AZURE_AI_FOUNDRY,
      );
      const result = transformer(
        errorResponse,
        401,
        new Headers(),
        true,
        {} as IdkRequestData,
      );

      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).error).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).error.message).toBe(
        'azure-ai-foundry error: Authentication failed',
      );
      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).provider).toBe(AIProvider.AZURE_AI_FOUNDRY);
    });

    it('should handle rate limiting', () => {
      const errorResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      };

      const transformer = azureAIInferenceChatCompleteResponseTransform(
        AIProvider.GITHUB,
      );
      const result = transformer(
        errorResponse,
        429,
        new Headers(),
        true,
        {} as IdkRequestData,
      );

      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).error).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).error.message).toBe(
        'github error: Rate limit exceeded',
      );
      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).provider).toBe(AIProvider.GITHUB);
    });

    it('should handle service unavailable', () => {
      const errorResponse = {
        error: {
          message: 'Service temporarily unavailable',
          type: 'service_error',
          code: 'service_unavailable',
        },
      };

      const transformer = azureAIInferenceCompleteResponseTransform(
        AIProvider.AZURE_AI_FOUNDRY,
      );
      const result = transformer(
        errorResponse,
        503,
        new Headers(),
        true,
        {} as IdkRequestData,
      );

      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).error).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).error.message).toBe(
        'azure-ai-foundry error: Service temporarily unavailable',
      );
      // biome-ignore lint/suspicious/noExplicitAny: Error response has complex union types
      expect((result as any).provider).toBe(AIProvider.AZURE_AI_FOUNDRY);
    });
  });

  describe('Integration with Provider System', () => {
    it('should provide response transforms for all supported functions', () => {
      const azureTransforms = azureAIInferenceConfig.responseTransforms!;
      const githubTransforms = githubModelAPiConfig.responseTransforms!;

      expect(azureTransforms[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(azureTransforms[FunctionName.COMPLETE]).toBeDefined();
      expect(azureTransforms[FunctionName.EMBED]).toBeDefined();

      expect(githubTransforms[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(githubTransforms[FunctionName.COMPLETE]).toBeDefined();
      expect(githubTransforms[FunctionName.EMBED]).toBeDefined();
    });

    it('should construct complete request URLs for Azure AI Foundry', () => {
      const baseURL = azureAIInferenceAPI.getBaseURL({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_ai_foundry_config: {
            url: 'https://my-foundry-endpoint.inference.ai.azure.com',
          },
        },
      } as unknown as TestContext);

      const endpoint = azureAIInferenceAPI.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: {},
        },
      } as unknown as TestContext);

      const fullURL = `${baseURL}${endpoint}`;
      expect(fullURL).toBe(
        'https://my-foundry-endpoint.inference.ai.azure.com/models/chat/completions',
      );
    });

    it('should construct complete request URLs for GitHub Models', () => {
      const baseURL = azureAIInferenceAPI.getBaseURL({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.GITHUB,
            model: 'gpt-4',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
        },
      } as unknown as TestContext);

      const endpoint = azureAIInferenceAPI.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.EMBED,
          requestBody: {},
        },
      } as unknown as TestContext);

      const fullURL = `${baseURL}${endpoint}`;
      expect(fullURL).toBe(
        'https://models.inference.ai.azure.com/models/embeddings',
      );
    });
  });

  describe('Advanced Features', () => {
    it('should support streaming responses', () => {
      const chatConfig = azureAIInferenceChatCompleteConfig;
      const completeConfig = azureAIInferenceCompleteConfig;

      expect(chatConfig.stream).toBeDefined();
      expect((chatConfig.stream as ParameterConfig)?.default).toBe(false);
      expect(completeConfig.stream).toBeDefined();
      expect((completeConfig.stream as ParameterConfig)?.default).toBe(false);
    });

    it('should support tool calling', () => {
      const config = azureAIInferenceChatCompleteConfig;

      expect(config.tools).toBeDefined();
      expect(config.tool_choice).toBeDefined();
    });

    it('should support response format specification', () => {
      const config = azureAIInferenceChatCompleteConfig;

      expect(config.response_format).toBeDefined();
      expect((config.response_format as ParameterConfig)?.param).toBe(
        'response_format',
      );
    });

    it('should handle extra parameter policies correctly', () => {
      expect(async () => {
        await azureAIInferenceAPI.headers({
          idkTarget: {
            configuration: {
              ai_provider: AIProvider.AZURE_AI_FOUNDRY,
              model: 'meta-llama-3-8b-instruct',
              system_prompt: null,
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
            },
            api_key: 'test-key',
            azure_extra_params: 'pass-through',
          },
        } as unknown as TestContext);
      }).not.toThrow();

      expect(async () => {
        await azureAIInferenceAPI.headers({
          idkTarget: {
            configuration: {
              ai_provider: AIProvider.AZURE_AI_FOUNDRY,
              model: 'meta-llama-3-8b-instruct',
              system_prompt: null,
              temperature: null,
              max_tokens: null,
              top_p: null,
              frequency_penalty: null,
              presence_penalty: null,
              stop: null,
              seed: null,
              additional_params: null,
            },
            api_key: 'test-key',
            azure_extra_params: 'error',
          },
        } as unknown as TestContext);
      }).not.toThrow();
    });

    it('should map max_completion_tokens to max_tokens param', () => {
      const config = azureAIInferenceChatCompleteConfig;

      expect((config.max_completion_tokens as ParameterConfig)?.param).toBe(
        'max_tokens',
      );
      expect((config.max_tokens as ParameterConfig)?.param).toBe('max_tokens');
      // Both parameters map to the same API parameter but have the same default
      expect((config.max_completion_tokens as ParameterConfig)?.default).toBe(
        (config.max_tokens as ParameterConfig)?.default,
      );
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle missing Entra ID credentials gracefully', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          azure_auth_mode: 'entra',
          // Missing tenant_id, client_id, client_secret
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
      });
    });

    it('should handle partial Entra ID credentials', async () => {
      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          azure_auth_mode: 'entra',
          azure_entra_tenant_id: 'tenant-123',
          // Missing client_id and client_secret
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
      });
    });

    it('should handle managed identity without client ID', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'managed-token-123' }),
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const headers = await azureAIInferenceAPI.headers({
        idkTarget: {
          configuration: {
            ai_provider: AIProvider.AZURE_AI_FOUNDRY,
            model: 'meta-llama-3-8b-instruct',
            system_prompt: null,
            temperature: null,
            max_tokens: null,
            top_p: null,
            frequency_penalty: null,
            presence_penalty: null,
            stop: null,
            seed: null,
            additional_params: null,
          },
          api_key: 'test-key',
          azure_auth_mode: 'managed',
          // No managed client ID specified
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'extra-parameters': 'drop',
        Authorization: 'Bearer managed-token-123',
      });
    });
  });
});
