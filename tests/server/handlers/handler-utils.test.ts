import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies
vi.mock('@server/ai-providers', () => ({
  providerConfigs: {},
}));

vi.mock('@server/utils/cache', () => ({
  getCachedResponse: vi.fn(),
}));

vi.mock('@server/utils/hooks', () => ({
  inputHookHandler: vi.fn(),
}));

vi.mock('@server/handlers/response-handler', () => ({
  recursiveOutputHookHandler: vi.fn(),
  responseHandler: vi.fn(),
}));

vi.mock('@server/utils/reactive-agents/response', () => ({
  createResponse: vi.fn(),
}));

vi.mock('@server/services/transform-to-provider-request', () => ({
  default: vi.fn(),
}));

vi.mock('@server/utils/reactive-agents/requests', () => ({
  constructRequest: vi.fn(),
}));

vi.mock('@shared/console-logging', () => ({
  debug: vi.fn(),
}));

import { providerConfigs } from '@server/ai-providers';
// Import after mocks are set up
import { tryPost } from '@server/handlers/handler-utils';
import transformToProviderRequest from '@server/services/transform-to-provider-request';
import type { AppContext } from '@server/types/hono';
import { HttpMethod } from '@server/types/http';
import { getCachedResponse } from '@server/utils/cache';
import { inputHookHandler } from '@server/utils/hooks';
import { constructRequest } from '@server/utils/reactive-agents/requests';
import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import type {
  ReactiveAgentsConfig,
  ReactiveAgentsTarget,
} from '@shared/types/api/request/headers';
import { HeaderKey, StrategyModes } from '@shared/types/api/request/headers';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider, ContentTypeName } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import { z } from 'zod';

describe('tryPost Error Handling', () => {
  let mockContext: AppContext;
  let mockReactiveAgentsConfig: ReactiveAgentsConfig;
  let mockReactiveAgentsTarget: ReactiveAgentsTarget;
  let mockReactiveAgentsRequestData: ReactiveAgentsRequestData;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock context
    mockContext = {
      set: vi.fn(),
      get: vi.fn(),
      env: {},
    } as unknown as AppContext;

    // Setup mock configuration
    mockReactiveAgentsConfig = {
      agent_name: 'test-agent',
      skill_name: 'test-skill',
      strategy: {
        mode: StrategyModes.SINGLE,
        conditions: [],
        default: 'openai',
      },
      targets: [
        {
          weight: 1,
          custom_host: '',
          cache: {
            mode: CacheMode.DISABLED,
          },
          retry: {
            attempts: 0,
          },
          configuration: {
            ai_provider: AIProvider.OPENAI,
            model: 'gpt-3.5-turbo',
            temperature: 1,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: null,
            seed: null,
            reasoning_effort: null,
            system_prompt: null,
            additional_params: null,
          },
        },
      ],
      trace_id: 'test-trace-id',
      override_params: {},
      strict_open_ai_compliance: true,
      hooks: [],
    };

    // Setup mock target
    mockReactiveAgentsTarget = {
      weight: 1,
      custom_host: '',
      cache: {
        mode: CacheMode.SIMPLE,
        max_age: 3600,
      },
      retry: {
        attempts: 0,
      },
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        temperature: 1,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
        seed: null,
        reasoning_effort: null,
        system_prompt: null,
        additional_params: null,
      },
    };

    // Setup mock request data
    mockReactiveAgentsRequestData = {
      route_pattern: /^\/v1\/chat\/completions$/,
      functionName: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      url: 'https://api.openai.com/v1/chat/completions',
      requestBody: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: ChatCompletionMessageRole.USER, content: 'Hello' }],
        stream: false,
      },
      requestHeaders: {
        [HeaderKey.CONTENT_TYPE]: ContentTypeName.APPLICATION_JSON,
        authorization: 'Bearer test-key',
      },
      requestSchema: z.object({}), // Mock schema for tests
      responseSchema: z.object({}), // Mock response schema for tests
      stream: false,
    } as unknown as ReactiveAgentsRequestData;
  });

  describe('Error scenarios', () => {
    it('should return 500 response when provider config not found', async () => {
      // Ensure provider configs is empty to trigger error
      Object.keys(providerConfigs).forEach((key) => {
        delete (
          providerConfigs as Record<string, AIProviderConfig | undefined>
        )[key];
      });

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Provider config not found for provider: openai',
      });
    });

    it('should return 500 response when getBaseURL throws an error', async () => {
      const mockApiConfig = {
        getBaseURL: vi
          .fn()
          .mockRejectedValue(new Error('Base URL fetch failed')),
        getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
        headers: vi.fn().mockResolvedValue({}),
      };

      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: mockApiConfig,
      } as AIProviderConfig;

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Base URL fetch failed',
      });
    });

    it('should return 500 response when getEndpoint throws an error', async () => {
      const mockApiConfig = {
        getBaseURL: vi.fn().mockResolvedValue('https://api.openai.com'),
        getEndpoint: vi.fn().mockImplementation(() => {
          throw new Error('Endpoint determination failed');
        }),
        headers: vi.fn().mockResolvedValue({}),
      };

      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: mockApiConfig,
      } as AIProviderConfig;

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Endpoint determination failed',
      });
    });

    it('should return 500 response when headers function throws an error', async () => {
      const mockApiConfig = {
        getBaseURL: vi.fn().mockResolvedValue('https://api.openai.com'),
        getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
        headers: vi
          .fn()
          .mockRejectedValue(new Error('Headers generation failed')),
      };

      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: mockApiConfig,
      } as AIProviderConfig;

      // Mock successful responses for earlier stages
      vi.mocked(inputHookHandler).mockResolvedValue({
        errorResponse: undefined,
        transformedReactiveAgentsBody: undefined,
      });

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Headers generation failed',
      });
    });

    it('should return 500 response when inputHookHandler throws an error', async () => {
      const mockApiConfig = {
        getBaseURL: vi.fn().mockResolvedValue('https://api.openai.com'),
        getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
        headers: vi.fn().mockResolvedValue({}),
      };

      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: mockApiConfig,
      } as AIProviderConfig;

      vi.mocked(inputHookHandler).mockRejectedValue(
        new Error('Input hook processing failed'),
      );

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Input hook processing failed',
      });
    });

    it('should return 500 response when getCachedResponse throws an error', async () => {
      const mockApiConfig = {
        getBaseURL: vi.fn().mockResolvedValue('https://api.openai.com'),
        getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
        headers: vi.fn().mockResolvedValue({}),
      };

      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: mockApiConfig,
      } as AIProviderConfig;

      vi.mocked(inputHookHandler).mockResolvedValue({
        errorResponse: undefined,
        transformedReactiveAgentsBody: undefined,
      });

      vi.mocked(constructRequest).mockImplementation(() => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockReactiveAgentsRequestData.requestBody),
      }));

      vi.mocked(getCachedResponse).mockRejectedValue(
        new Error('Cache lookup failed'),
      );

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Cache lookup failed',
      });
    });

    it('should return 500 response when transformToProviderRequest throws an error', async () => {
      const mockApiConfig = {
        getBaseURL: vi.fn().mockResolvedValue('https://api.openai.com'),
        getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
        headers: vi.fn().mockResolvedValue({}),
      };

      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: mockApiConfig,
      } as AIProviderConfig;

      vi.mocked(inputHookHandler).mockResolvedValue({
        errorResponse: undefined,
        transformedReactiveAgentsBody: undefined,
      });

      vi.mocked(transformToProviderRequest).mockImplementation(() => {
        throw new Error('Transform to provider request failed');
      });

      const result = await tryPost(
        mockContext,
        mockReactiveAgentsConfig,
        mockReactiveAgentsTarget,
        mockReactiveAgentsRequestData,
        0,
      );

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const responseBody = await result.json();
      expect(responseBody).toEqual({
        error: 'Error: Transform to provider request failed',
      });
    });
  });
});
