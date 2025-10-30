import { azureOpenAIConfig } from '@server/ai-providers/azure-openai';
import { azureOpenAIAPIConfig } from '@server/ai-providers/azure-openai/api';
import {
  azureOpenAIChatCompleteConfig,
  azureOpenAIChatCompleteResponseTransform,
} from '@server/ai-providers/azure-openai/chat-complete';
import { azureOpenAICompleteConfig } from '@server/ai-providers/azure-openai/complete';
import {
  azureOpenAICreateSpeechConfig,
  azureOpenAICreateSpeechResponseTransform,
} from '@server/ai-providers/azure-openai/create-speech';
import {
  azureOpenAIEmbedConfig,
  azureOpenAIEmbedResponseTransform,
} from '@server/ai-providers/azure-openai/embed';
import {
  azureOpenAIImageGenerateConfig,
  azureOpenAIImageGenerateResponseTransform,
} from '@server/ai-providers/azure-openai/image-generate';
import {
  azureOpenAIFinetuneResponseTransform,
  getAccessTokenFromEntraId,
  getAzureManagedIdentityToken,
} from '@server/ai-providers/azure-openai/utils';
import {
  FunctionName,
  type ReactiveAgentsRequestData,
} from '@shared/types/api/request';
import type { ParameterConfig } from '@shared/types/api/response/body';
import type { CreateSpeechResponseBody } from '@shared/types/api/routes/audio-api';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';
import type { CreateFineTuningJobResponseBody } from '@shared/types/api/routes/fine-tuning-api';
import type { GenerateImageResponseBody } from '@shared/types/api/routes/images-api';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test helper - use unknown casting for test contexts
type TestContext = Parameters<typeof azureOpenAIAPIConfig.getBaseURL>[0];

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock fetch for authentication tests
global.fetch = vi.fn();

describe('Azure OpenAI AI Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockClear();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties', () => {
      expect(azureOpenAIConfig).toBeDefined();
      expect(azureOpenAIConfig.api).toBeDefined();
      expect(azureOpenAIConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(azureOpenAIConfig[FunctionName.COMPLETE]).toBeDefined();
      expect(azureOpenAIConfig[FunctionName.EMBED]).toBeDefined();
      expect(azureOpenAIConfig[FunctionName.GENERATE_IMAGE]).toBeDefined();
      expect(azureOpenAIConfig[FunctionName.CREATE_SPEECH]).toBeDefined();
      expect(azureOpenAIConfig.responseTransforms).toBeDefined();
    });

    it('should support extensive list of functions', () => {
      const supportedFunctions = [
        FunctionName.COMPLETE,
        FunctionName.CHAT_COMPLETE,
        FunctionName.EMBED,
        FunctionName.GENERATE_IMAGE,
        FunctionName.CREATE_SPEECH,
        FunctionName.CREATE_TRANSCRIPTION,
        FunctionName.CREATE_TRANSLATION,
        FunctionName.CREATE_FINE_TUNING_JOB,
        FunctionName.CREATE_BATCH,
        FunctionName.UPLOAD_FILE,
      ];

      supportedFunctions.forEach((fn) => {
        expect(azureOpenAIConfig.responseTransforms![fn]).toBeDefined();
      });
    });

    it('should have request handlers for special functions', () => {
      expect(azureOpenAIConfig.requestHandlers).toBeDefined();
      expect(
        azureOpenAIConfig.requestHandlers![FunctionName.GET_BATCH_OUTPUT],
      ).toBeDefined();
    });
  });

  describe('API Configuration', () => {
    it('should return base URL from azure_openai_config', () => {
      const baseURL = azureOpenAIAPIConfig.getBaseURL({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          azure_openai_config: {
            url: 'https://my-resource.openai.azure.com',
          },
        },
      } as unknown as TestContext);

      expect(baseURL).toBe('https://my-resource.openai.azure.com');
    });

    it('should throw error when azure_openai_config is missing', () => {
      expect(() => {
        azureOpenAIAPIConfig.getBaseURL({
          raTarget: {
            provider: AIProvider.AZURE_OPENAI,
          },
        } as unknown as TestContext);
      }).toThrow('`azure_openai_config` is required in target');
    });

    it('should return correct headers with API key authentication', async () => {
      const headers = await azureOpenAIAPIConfig.headers({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          api_key: 'test-api-key',
        },
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: {},
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'api-key': 'test-api-key',
      });
    });

    it('should handle Entra ID authentication', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'entra-token-123' }),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const headers = await azureOpenAIAPIConfig.headers({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          azure_auth_mode: 'entra',
          azure_entra_tenant_id: 'tenant-123',
          azure_entra_client_id: 'client-123',
          azure_entra_client_secret: 'secret-123',
        },
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: {},
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        Authorization: 'Bearer entra-token-123',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/tenant-123/oauth2/v2.0/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    });

    it('should handle managed identity authentication', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'managed-token-123' }),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const headers = await azureOpenAIAPIConfig.headers({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          azure_auth_mode: 'managed',
          azure_managed_client_id: 'managed-client-123',
        },
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: {},
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        Authorization: 'Bearer managed-token-123',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'http://169.254.169.254/metadata/identity/oauth2/token',
        ),
        expect.objectContaining({
          method: 'GET',
          headers: { Metadata: 'true' },
        }),
      );
    });

    it('should handle multipart form data for file operations', async () => {
      const headers = await azureOpenAIAPIConfig.headers({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          api_key: 'test-key',
        },
        raRequestData: {
          functionName: FunctionName.UPLOAD_FILE,
          requestBody: {},
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'api-key': 'test-key',
        'Content-Type': 'multipart/form-data',
      });
    });

    it('should handle OpenAI beta features', async () => {
      const headers = await azureOpenAIAPIConfig.headers({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          api_key: 'test-key',
          openai_beta: 'assistants=v2',
        },
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: {},
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'api-key': 'test-key',
        'OpenAI-Beta': 'assistants=v2',
      });
    });

    it('should return correct endpoints for various functions', () => {
      const testCases = [
        {
          function: FunctionName.CHAT_COMPLETE,
          expected: '/openai/v1/chat/completions',
        },
        {
          function: FunctionName.COMPLETE,
          expected: '/openai/v1/completions',
        },
        {
          function: FunctionName.EMBED,
          expected: '/openai/v1/models/embeddings',
        },
        {
          function: FunctionName.CREATE_MODEL_RESPONSE,
          expected: '/openai/v1/responses',
        },
      ];

      testCases.forEach(({ function: fn, expected }) => {
        const endpoint = azureOpenAIAPIConfig.getEndpoint({
          raRequestData: {
            functionName: fn,
            requestBody: {},
          },
        } as unknown as TestContext);

        expect(endpoint).toBe(expected);
      });
    });

    it('should throw error for unsupported endpoints', () => {
      expect(() => {
        azureOpenAIAPIConfig.getEndpoint({
          raRequestData: {
            functionName: 'UNSUPPORTED' as FunctionName,
            requestBody: {},
          },
        } as unknown as TestContext);
      }).toThrow('Endpoint not found for function UNSUPPORTED');
    });
  });

  describe('Authentication Utils', () => {
    describe('getAccessTokenFromEntraId', () => {
      it('should successfully get access token', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'token-123' }),
        };
        vi.mocked(global.fetch).mockResolvedValue(
          mockResponse as unknown as Response,
        );

        const token = await getAccessTokenFromEntraId(
          'tenant-id',
          'client-id',
          'client-secret',
        );

        expect(token).toBe('token-123');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }),
        );
      });

      it('should handle authentication failure', async () => {
        const mockResponse = {
          ok: false,
          text: vi.fn().mockResolvedValue('Authentication failed'),
        };
        vi.mocked(global.fetch).mockResolvedValue(
          mockResponse as unknown as Response,
        );

        await expect(() =>
          getAccessTokenFromEntraId('tenant-id', 'client-id', 'client-secret'),
        ).rejects.toThrow(
          'Error getting access token from Entra ID: Error: Error from Entra Authentication failed',
        );
      });

      it('should handle network errors', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

        await expect(() =>
          getAccessTokenFromEntraId('tenant-id', 'client-id', 'client-secret'),
        ).rejects.toThrow(
          'Error getting access token from Entra ID: Error: Network error',
        );
      });
    });

    describe('getAzureManagedIdentityToken', () => {
      it('should successfully get managed identity token', async () => {
        const mockResponse = {
          ok: true,
          json: vi
            .fn()
            .mockResolvedValue({ access_token: 'managed-token-123' }),
        };
        vi.mocked(global.fetch).mockResolvedValue(
          mockResponse as unknown as Response,
        );

        const token = await getAzureManagedIdentityToken(
          'https://cognitiveservices.azure.com/',
          'client-id',
        );

        expect(token).toBe('managed-token-123');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(
            'http://169.254.169.254/metadata/identity/oauth2/token',
          ),
          expect.objectContaining({
            method: 'GET',
            headers: { Metadata: 'true' },
          }),
        );
      });

      it('should work without client ID', async () => {
        const mockResponse = {
          ok: true,
          json: vi
            .fn()
            .mockResolvedValue({ access_token: 'managed-token-123' }),
        };
        vi.mocked(global.fetch).mockResolvedValue(
          mockResponse as unknown as Response,
        );

        const token = await getAzureManagedIdentityToken(
          'https://cognitiveservices.azure.com/',
        );

        expect(token).toBe('managed-token-123');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.not.stringContaining('client_id'),
          expect.any(Object),
        );
      });

      it('should handle managed identity failure', async () => {
        const mockResponse = {
          ok: false,
          text: vi.fn().mockResolvedValue('Managed identity failed'),
        };
        vi.mocked(global.fetch).mockResolvedValue(
          mockResponse as unknown as Response,
        );

        await expect(() =>
          getAzureManagedIdentityToken('https://cognitiveservices.azure.com/'),
        ).rejects.toThrow(
          'Error getting access token from Managed Identity: Error: Error from Managed Managed identity failed',
        );
      });
    });
  });

  describe('Chat Completion Configuration', () => {
    it('should have comprehensive parameter configuration', () => {
      const config = azureOpenAIChatCompleteConfig;

      // Core parameters
      expect(config.model).toBeDefined();
      expect(config.messages).toBeDefined();
      expect(config.max_tokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.top_p).toBeDefined();

      // Advanced parameters
      expect(config.functions).toBeDefined();
      expect(config.function_call).toBeDefined();
      expect(config.tools).toBeDefined();
      expect(config.tool_choice).toBeDefined();
      expect(config.response_format).toBeDefined();

      // Penalties and controls
      expect(config.presence_penalty).toBeDefined();
      expect(config.frequency_penalty).toBeDefined();
      expect(config.logit_bias).toBeDefined();
      expect(config.stop).toBeDefined();

      // Streaming and logging
      expect(config.stream).toBeDefined();
      expect(config.logprobs).toBeDefined();
      expect(config.top_logprobs).toBeDefined();

      // New features
      expect(config.store).toBeDefined();
      expect(config.metadata).toBeDefined();
      expect(config.modalities).toBeDefined();
      expect(config.audio).toBeDefined();
      expect(config.seed).toBeDefined();
      expect(config.prediction).toBeDefined();
      expect(config.reasoning_effort).toBeDefined();
    });

    it('should have correct default values', () => {
      const config = azureOpenAIChatCompleteConfig;

      expect((config.max_tokens as ParameterConfig)?.default).toBe(100);
      expect((config.max_completion_tokens as ParameterConfig)?.default).toBe(
        100,
      );
      expect((config.temperature as ParameterConfig)?.default).toBe(1);
      expect((config.top_p as ParameterConfig)?.default).toBe(1);
      expect((config.n as ParameterConfig)?.default).toBe(1);
      expect((config.stream as ParameterConfig)?.default).toBe(false);
      expect((config.logprobs as ParameterConfig)?.default).toBe(false);
    });

    it('should have correct parameter ranges', () => {
      const config = azureOpenAIChatCompleteConfig;

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

  describe('Response Transformations', () => {
    describe('Chat Completion Response Transform', () => {
      it('should transform successful chat completion response', () => {
        const azureResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
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

        const result = azureOpenAIChatCompleteResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as ChatCompletionResponseBody;

        expect(result.id).toBe('chatcmpl-123');
        expect(result.object).toBe('chat.completion');
        expect(result.model).toBe('gpt-4');
        expect(result.choices).toHaveLength(1);
        expect(result.choices[0].message.content).toBe(
          'Hello! How can I help you today?',
        );
        expect(result.choices[0].finish_reason).toBe('stop');
        expect(result.usage?.prompt_tokens).toBe(10);
        expect(result.usage?.completion_tokens).toBe(15);
      });

      it('should handle function calls in response', () => {
        const azureResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
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

        const result = azureOpenAIChatCompleteResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as ChatCompletionResponseBody;

        expect(result.choices[0].message.tool_calls).toHaveLength(1);
        expect(result.choices[0].message.tool_calls![0].function.name).toBe(
          'get_weather',
        );
        expect(result.choices[0].finish_reason).toBe('tool_calls');
      });

      it('should transform error responses', () => {
        const errorResponse = {
          error: {
            message: 'Invalid request',
            type: 'invalid_request_error',
            code: 'invalid_request',
          },
        };

        const result = azureOpenAIChatCompleteResponseTransform(
          errorResponse,
          400,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        );

        expect((result as { error: unknown }).error).toBeDefined();
        expect((result as { error: { message: string } }).error.message).toBe(
          'azure-openai error: Invalid request',
        );
        expect((result as { provider: string }).provider).toBe(
          AIProvider.AZURE_OPENAI,
        );
      });
    });

    describe('Embedding Response Transform', () => {
      it('should transform successful embedding response', () => {
        const azureResponse = {
          object: 'list',
          data: [
            {
              object: 'embedding',
              index: 0,
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            },
          ],
          model: 'text-embedding-ada-002',
          usage: {
            prompt_tokens: 8,
            total_tokens: 8,
          },
        };

        const result = azureOpenAIEmbedResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as CreateEmbeddingsResponseBody;

        expect(result.object).toBe('list');
        expect(result.data).toHaveLength(1);
        expect(result.data[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
        expect(result.model).toBe('text-embedding-ada-002');
        expect(result.usage?.prompt_tokens).toBe(8);
      });

      it('should transform embedding error responses', () => {
        const errorResponse = {
          error: {
            message: 'Model not found',
            type: 'model_not_found',
            code: 'model_not_found',
          },
        };

        const result = azureOpenAIEmbedResponseTransform(
          errorResponse,
          404,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        );

        expect((result as { error: unknown }).error).toBeDefined();
        expect((result as { error: { message: string } }).error.message).toBe(
          'azure-openai error: Model not found',
        );
      });
    });

    describe('Fine-tuning Response Transform', () => {
      it('should transform fine-tuning response with status mapping', () => {
        const azureResponse = {
          id: 'ft-123',
          object: 'fine_tuning.job',
          model: 'davinci-002',
          status: 'created',
          created_at: 1677652288,
          finished_at: null,
        };

        const result = azureOpenAIFinetuneResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as CreateFineTuningJobResponseBody;

        expect(result.id).toBe('ft-123');
        expect(result.status).toBe('queued'); // 'created' maps to 'queued'
      });

      it('should map pending status to queued', () => {
        const azureResponse = {
          id: 'ft-123',
          object: 'fine_tuning.job',
          model: 'davinci-002',
          status: 'pending',
          created_at: 1677652288,
        };

        const result = azureOpenAIFinetuneResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as CreateFineTuningJobResponseBody;

        expect(result.status).toBe('queued');
      });

      it('should preserve other statuses', () => {
        const azureResponse = {
          id: 'ft-123',
          object: 'fine_tuning.job',
          model: 'davinci-002',
          status: 'running',
          created_at: 1677652288,
        };

        const result = azureOpenAIFinetuneResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as CreateFineTuningJobResponseBody;

        expect(result.status).toBe('running');
      });
    });

    describe('Image Generation Response Transform', () => {
      it('should transform image generation response', () => {
        const azureResponse = {
          created: 1677652288,
          data: [
            {
              url: 'https://example.com/image1.png',
            },
            {
              b64_json: 'base64-encoded-image-data',
            },
          ],
        };

        const result = azureOpenAIImageGenerateResponseTransform(
          azureResponse,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as GenerateImageResponseBody;

        expect(result.created).toBe(1677652288);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].url).toBe('https://example.com/image1.png');
        expect(result.data[1].b64_json).toBe('base64-encoded-image-data');
      });
    });

    describe('Speech Generation Response Transform', () => {
      it('should transform speech response', () => {
        const azureResponse = new ArrayBuffer(1024); // Mock audio data

        const result = azureOpenAICreateSpeechResponseTransform(
          azureResponse as unknown as Record<string, unknown>,
          200,
          new Headers(),
          true,
          {} as ReactiveAgentsRequestData,
        ) as CreateSpeechResponseBody;

        expect(result).toBeInstanceOf(ArrayBuffer);
        expect((result as unknown as ArrayBuffer).byteLength).toBe(1024);
      });
    });
  });

  describe('Function Configurations', () => {
    it('should have complete configuration', () => {
      expect(azureOpenAICompleteConfig.model).toBeDefined();
      expect(azureOpenAICompleteConfig.prompt).toBeDefined();
      expect(azureOpenAICompleteConfig.max_tokens).toBeDefined();
      expect(azureOpenAICompleteConfig.temperature).toBeDefined();
    });

    it('should have embedding configuration', () => {
      expect(azureOpenAIEmbedConfig.model).toBeDefined();
      expect(azureOpenAIEmbedConfig.input).toBeDefined();
      expect((azureOpenAIEmbedConfig.input as ParameterConfig)?.required).toBe(
        true,
      );
      expect(azureOpenAIEmbedConfig.user).toBeDefined();
      expect(azureOpenAIEmbedConfig.encoding_format).toBeDefined();
      expect(azureOpenAIEmbedConfig.dimensions).toBeDefined();
    });

    it('should have image generation configuration', () => {
      expect(azureOpenAIImageGenerateConfig.model).toBeDefined();
      expect(azureOpenAIImageGenerateConfig.prompt).toBeDefined();
      expect(azureOpenAIImageGenerateConfig.n).toBeDefined();
      expect(azureOpenAIImageGenerateConfig.size).toBeDefined();
      expect(azureOpenAIImageGenerateConfig.response_format).toBeDefined();
    });

    it('should have speech generation configuration', () => {
      expect(azureOpenAICreateSpeechConfig.model).toBeDefined();
      expect(azureOpenAICreateSpeechConfig.input).toBeDefined();
      expect(azureOpenAICreateSpeechConfig.voice).toBeDefined();
      expect(azureOpenAICreateSpeechConfig.response_format).toBeDefined();
      expect(azureOpenAICreateSpeechConfig.speed).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle various HTTP status codes', () => {
      const errorResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      };

      const result = azureOpenAIChatCompleteResponseTransform(
        errorResponse,
        429,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      );

      expect((result as { error: unknown }).error).toBeDefined();
      expect((result as { error: { message: string } }).error.message).toBe(
        'azure-openai error: Rate limit exceeded',
      );
      expect((result as { provider: string }).provider).toBe(
        AIProvider.AZURE_OPENAI,
      );
    });

    it('should handle authentication errors', () => {
      const errorResponse = {
        error: {
          message: 'Incorrect API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      };

      const result = azureOpenAIEmbedResponseTransform(
        errorResponse,
        401,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      );

      expect((result as { error: unknown }).error).toBeDefined();
      expect((result as { error: { message: string } }).error.message).toBe(
        'azure-openai error: Incorrect API key provided',
      );
    });
  });

  describe('Integration with Provider System', () => {
    it('should provide response transforms for all supported functions', () => {
      const transforms = azureOpenAIConfig.responseTransforms!;

      expect(transforms[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(transforms[FunctionName.COMPLETE]).toBeDefined();
      expect(transforms[FunctionName.EMBED]).toBeDefined();
      expect(transforms[FunctionName.GENERATE_IMAGE]).toBeDefined();
      expect(transforms[FunctionName.CREATE_SPEECH]).toBeDefined();
      expect(transforms[FunctionName.CREATE_TRANSCRIPTION]).toBeDefined();
      expect(transforms[FunctionName.CREATE_TRANSLATION]).toBeDefined();
      expect(transforms[FunctionName.CREATE_FINE_TUNING_JOB]).toBeDefined();
    });

    it('should construct complete request URLs', () => {
      const baseURL = azureOpenAIAPIConfig.getBaseURL({
        raTarget: {
          provider: AIProvider.AZURE_OPENAI,
          azure_openai_config: {
            url: 'https://my-resource.openai.azure.com',
          },
        },
      } as unknown as TestContext);

      const endpoint = azureOpenAIAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: {},
        },
      } as unknown as TestContext);

      const fullURL = `${baseURL}${endpoint}`;
      expect(fullURL).toBe(
        'https://my-resource.openai.azure.com/openai/v1/chat/completions',
      );
    });
  });

  describe('Advanced Features', () => {
    it('should handle streaming responses', () => {
      const config = azureOpenAIChatCompleteConfig;
      expect(config.stream).toBeDefined();
      expect((config.stream as ParameterConfig)?.default).toBe(false);
      expect(config.stream_options).toBeDefined();
    });

    it('should support reasoning effort parameter', () => {
      const config = azureOpenAIChatCompleteConfig;
      expect(config.reasoning_effort).toBeDefined();
      expect((config.reasoning_effort as ParameterConfig)?.param).toBe(
        'reasoning_effort',
      );
    });

    it('should support modalities and audio', () => {
      const config = azureOpenAIChatCompleteConfig;
      expect(config.modalities).toBeDefined();
      expect(config.audio).toBeDefined();
    });

    it('should support structured outputs', () => {
      const config = azureOpenAIChatCompleteConfig;
      expect(config.response_format).toBeDefined();
      expect((config.response_format as ParameterConfig)?.param).toBe(
        'response_format',
      );
    });

    it('should support prediction and seed for reproducibility', () => {
      const config = azureOpenAIChatCompleteConfig;
      expect(config.prediction).toBeDefined();
      expect(config.seed).toBeDefined();
    });
  });
});
