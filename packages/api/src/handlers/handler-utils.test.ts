import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies
vi.mock('@api/ai-providers', () => ({
  providerConfigs: {},
}));

vi.mock('@api/utils/cache', () => ({
  getCachedResponse: vi.fn(),
}));

vi.mock('@api/utils/hooks', () => ({
  inputHookHandler: vi.fn(),
}));

vi.mock('@api/handlers/response-handler', () => ({
  recursiveOutputHookHandler: vi.fn(),
  responseHandler: vi.fn(),
}));

vi.mock('@api/utils/super-agents/response', () => ({
  createResponse: vi.fn(),
}));

vi.mock('@api/services/transform-to-provider-request', () => ({
  default: vi.fn(),
}));

vi.mock('@api/utils/super-agents/requests', () => ({
  constructRequest: vi.fn(),
}));

vi.mock('@shared/console-logging', () => ({
  debug: vi.fn(),
}));

import { providerConfigs } from '@api/ai-providers';
// Import after mocks are set up
import { tryPost } from '@api/handlers/handler-utils';
import transformToProviderRequest from '@api/services/transform-to-provider-request';
import type { AppContext } from '@api/types/hono';
import { HttpMethod } from '@api/types/http';
import { getCachedResponse } from '@api/utils/cache';
import { inputHookHandler } from '@api/utils/hooks';
import { constructRequest } from '@api/utils/super-agents/requests';
import type { AIProviderConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import type {
  SuperAgentsConfig,
  SuperAgentsTarget,
} from '@shared/types/api/request/headers';
import { HeaderKey, StrategyModes } from '@shared/types/api/request/headers';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import type { ChatCompletionMessage } from '@shared/types/api/routes/shared/messages';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider, ContentTypeName } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import { z } from 'zod';

describe('Azure OpenAI URL validation', () => {
  // Test the regex pattern used in getProxyPath for Azure OpenAI URL validation
  // This prevents the "Incomplete URL substring sanitization" vulnerability
  // where `.openai.azure.com` could appear anywhere in the URL

  const azureUrlPattern = /^\/\/([\w-]+\.openai\.azure\.com)(\/.*)?$/;

  it('accepts valid Azure OpenAI hostnames', () => {
    expect(
      '//myresource.openai.azure.com/openai/deployments'.match(azureUrlPattern),
    ).toBeTruthy();
    expect(
      '//my-resource.openai.azure.com/path'.match(azureUrlPattern),
    ).toBeTruthy();
    expect(
      '//resource123.openai.azure.com'.match(azureUrlPattern),
    ).toBeTruthy();
  });

  it('rejects URLs where .openai.azure.com is not the hostname', () => {
    // Malicious URL where .openai.azure.com is in the path, not the host
    expect(
      '//evil.com/.openai.azure.com/path'.match(azureUrlPattern),
    ).toBeNull();
    // Malicious URL where attacker controls subdomain before legitimate domain
    expect(
      '//evil.com.openai.azure.com.attacker.com/path'.match(azureUrlPattern),
    ).toBeNull();
  });

  it('rejects URLs without the leading //', () => {
    expect(
      '/myresource.openai.azure.com/path'.match(azureUrlPattern),
    ).toBeNull();
    expect(
      'myresource.openai.azure.com/path'.match(azureUrlPattern),
    ).toBeNull();
  });

  it('rejects URLs with invalid characters in hostname', () => {
    // Special characters that could be used for attacks
    expect(
      '//evil<script>.openai.azure.com/path'.match(azureUrlPattern),
    ).toBeNull();
    expect(
      '//evil@attacker.openai.azure.com/path'.match(azureUrlPattern),
    ).toBeNull();
  });

  it('extracts hostname and path correctly', () => {
    const match =
      '//myresource.openai.azure.com/openai/deployments/gpt-4'.match(
        azureUrlPattern,
      );
    expect(match).toBeTruthy();
    expect(match![1]).toBe('myresource.openai.azure.com');
    expect(match![2]).toBe('/openai/deployments/gpt-4');
  });
});

describe('tryPost Error Handling', () => {
  let mockContext: AppContext;
  let mockSuperAgentsConfig: SuperAgentsConfig;
  let mockSuperAgentsTarget: SuperAgentsTarget;
  let mockSuperAgentsRequestData: SuperAgentsRequestData;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock context
    mockContext = {
      set: vi.fn(),
      get: vi.fn(),
      env: {},
    } as unknown as AppContext;

    // Setup mock configuration
    mockSuperAgentsConfig = {
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
    mockSuperAgentsTarget = {
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
    mockSuperAgentsRequestData = {
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
    } as unknown as SuperAgentsRequestData;
  });

  describe("the caller's request body", () => {
    /**
     * `tryPost` builds the provider-bound body from a shallow spread of the
     * caller's request, so anything spliced into `messages` used to land in
     * `sa_request_data` as well -- and the logs middleware reads the caller's
     * system prompt from there after the handler returns.
     */
    afterEach(() => {
      vi.mocked(transformToProviderRequest).mockReset();
    });

    const reachTheTransform = () => {
      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        AIProvider.OPENAI
      ] = {
        api: {
          getBaseURL: vi.fn().mockResolvedValue('https://api.openai.com'),
          getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
          headers: vi.fn().mockResolvedValue({}),
        },
      } as unknown as AIProviderConfig;
      vi.mocked(inputHookHandler).mockResolvedValue({
        errorResponse: undefined,
        transformedSuperAgentsBody: undefined,
      });
      // Past the system prompt handling; nothing later matters here.
      vi.mocked(transformToProviderRequest).mockImplementation(() => {
        throw new Error('stop here');
      });
    };

    it('is left alone when the arm prompt replaces the system message', async () => {
      reachTheTransform();
      mockSuperAgentsRequestData.requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: ChatCompletionMessageRole.SYSTEM,
            content: 'From the caller',
          },
          { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        ],
      } as never;
      mockSuperAgentsTarget.configuration.system_prompt = 'From the arm';
      const before = structuredClone(mockSuperAgentsRequestData.requestBody);

      await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
        0,
      );

      expect(mockSuperAgentsRequestData.requestBody).toEqual(before);
    });

    it('is left alone when JSON instructions are appended to the system message', async () => {
      reachTheTransform();
      mockSuperAgentsRequestData.requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: ChatCompletionMessageRole.SYSTEM,
            content: 'From the caller',
          },
          { role: ChatCompletionMessageRole.USER, content: 'Hello' },
        ],
        response_format: { type: 'json_object' },
      } as never;
      mockSuperAgentsTarget.configuration.system_prompt = null;
      const before = structuredClone(mockSuperAgentsRequestData.requestBody);

      await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
        0,
      );

      expect(mockSuperAgentsRequestData.requestBody).toEqual(before);
    });
  });

  describe('the JSON instructions added for `response_format`', () => {
    /**
     * Restating the schema in the system prompt is a fallback for providers
     * that cannot express the constraint at all. Handing it to a provider that
     * carries `response_format` itself only buries the skill's own prompt --
     * for `json_schema` the block was prepended, so the skill's instructions
     * ended up behind gateway boilerplate.
     */
    afterEach(() => {
      vi.mocked(transformToProviderRequest).mockReset();
    });

    /** Records the body handed to the provider transform, then stops there. */
    const captureProviderBody = (functionConfig?: AIProviderConfig) => {
      (providerConfigs as Record<string, AIProviderConfig | undefined>)[
        mockSuperAgentsTarget.configuration.ai_provider
      ] = {
        api: {
          getBaseURL: vi.fn().mockResolvedValue('https://api.example.com'),
          getEndpoint: vi.fn().mockReturnValue('/v1/chat/completions'),
          headers: vi.fn().mockResolvedValue({}),
        },
        ...functionConfig,
      } as unknown as AIProviderConfig;
      vi.mocked(inputHookHandler).mockResolvedValue({
        errorResponse: undefined,
        transformedSuperAgentsBody: undefined,
      });

      const seen: { messages?: ChatCompletionMessage[] } = {};
      vi.mocked(transformToProviderRequest).mockImplementation(
        (_provider, _saTarget, saRequestData) => {
          seen.messages = (
            saRequestData.requestBody as ChatCompletionRequestBody
          ).messages;
          throw new Error('stop here');
        },
      );
      return seen;
    };

    const nativeResponseFormat = {
      [FunctionName.CHAT_COMPLETE]: {
        response_format: { param: 'response_format' },
      },
    } as unknown as AIProviderConfig;

    const askForJson = () => {
      mockSuperAgentsRequestData.requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: ChatCompletionMessageRole.USER, content: 'Hello' }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'answer',
            schema: { type: 'object', properties: { a: { type: 'string' } } },
          },
        },
      } as never;
      mockSuperAgentsTarget.configuration.system_prompt = 'You are helpful.';
    };

    it('are left out when the provider forwards `response_format`', async () => {
      const seen = captureProviderBody(nativeResponseFormat);
      askForJson();

      await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
        0,
      );

      expect(seen.messages?.[0]).toEqual({
        role: ChatCompletionMessageRole.SYSTEM,
        content: 'You are helpful.',
      });
    });

    it('are left out for Anthropic, which builds the tool itself', async () => {
      mockSuperAgentsTarget.configuration.ai_provider = AIProvider.ANTHROPIC;
      const seen = captureProviderBody();
      askForJson();

      await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
        0,
      );

      expect(seen.messages?.[0]).toEqual({
        role: ChatCompletionMessageRole.SYSTEM,
        content: 'You are helpful.',
      });
    });

    it('are added when the provider has no way to ask for JSON', async () => {
      const seen = captureProviderBody();
      askForJson();

      await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
        0,
      );

      const systemPrompt = seen.messages?.[0].content as string;
      expect(systemPrompt).toContain('strictly conforms to the following');
      expect(systemPrompt).toContain('You are helpful.');
      expect(systemPrompt).not.toContain('__json_output');
    });

    it('are left out of a caller system message the provider can constrain', async () => {
      const seen = captureProviderBody(nativeResponseFormat);
      askForJson();
      (
        mockSuperAgentsRequestData.requestBody as ChatCompletionRequestBody
      ).messages.unshift({
        role: ChatCompletionMessageRole.SYSTEM,
        content: 'From the caller',
      });
      mockSuperAgentsTarget.configuration.system_prompt = null;

      await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
        0,
      );

      expect(seen.messages?.[0]).toEqual({
        role: ChatCompletionMessageRole.SYSTEM,
        content: 'From the caller',
      });
    });
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
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
        transformedSuperAgentsBody: undefined,
      });

      const result = await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
        transformedSuperAgentsBody: undefined,
      });

      vi.mocked(constructRequest).mockImplementation(() => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockSuperAgentsRequestData.requestBody),
      }));

      vi.mocked(getCachedResponse).mockRejectedValue(
        new Error('Cache lookup failed'),
      );

      const result = await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
        transformedSuperAgentsBody: undefined,
      });

      vi.mocked(transformToProviderRequest).mockImplementation(() => {
        throw new Error('Transform to provider request failed');
      });

      const result = await tryPost(
        mockContext,
        mockSuperAgentsConfig,
        mockSuperAgentsTarget,
        mockSuperAgentsRequestData,
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
