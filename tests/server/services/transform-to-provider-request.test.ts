import { transformUsingProviderConfig } from '@server/services/transform-to-provider-request';
import type { IdkRequestBody, IdkTarget } from '@shared/types/api/request';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import { describe, expect, it } from 'vitest';

describe('transformUsingProviderConfig', () => {
  it('should process MCP servers and add them as header', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: 'https://example-server.modelcontextprotocol.io/sse',
          name: 'example-mcp',
          authorization_token: 'YOUR_TOKEN',
        },
      ],
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    expect(result).toHaveProperty('x-mcp-servers');
    expect(result['x-mcp-servers']).toBe(
      JSON.stringify([
        {
          type: 'url',
          url: 'https://example-server.modelcontextprotocol.io/sse',
          name: 'example-mcp',
          authorization_token: 'YOUR_TOKEN',
        },
      ]),
    );
  });

  it('should not add MCP header when no MCP servers present', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    expect(result).not.toHaveProperty('x-mcp-servers');
  });

  it('should handle multiple MCP servers', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: 'https://server1.modelcontextprotocol.io/sse',
          name: 'server-1',
        },
        {
          type: 'url',
          url: 'https://server2.modelcontextprotocol.io/sse',
          name: 'server-2',
          authorization_token: 'TOKEN_2',
        },
      ],
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    expect(result).toHaveProperty('x-mcp-servers');
    expect(result['x-mcp-servers']).toBe(
      JSON.stringify([
        {
          type: 'url',
          url: 'https://server1.modelcontextprotocol.io/sse',
          name: 'server-1',
        },
        {
          type: 'url',
          url: 'https://server2.modelcontextprotocol.io/sse',
          name: 'server-2',
          authorization_token: 'TOKEN_2',
        },
      ]),
    );
  });

  it('should handle empty MCP servers array', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
      mcp_servers: [],
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    expect(result).toHaveProperty('x-mcp-servers');
    expect(result['x-mcp-servers']).toBe('[]');
  });

  it('should work with different AI providers', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'claude-3-sonnet-20240229',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: 'https://anthropic-mcp.modelcontextprotocol.io/sse',
          name: 'anthropic-mcp',
        },
      ],
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.ANTHROPIC,
        model: 'claude-3-sonnet-20240229',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    expect(result).toHaveProperty('x-mcp-servers');
    expect(result['x-mcp-servers']).toBe(
      JSON.stringify([
        {
          type: 'url',
          url: 'https://anthropic-mcp.modelcontextprotocol.io/sse',
          name: 'anthropic-mcp',
        },
      ]),
    );
  });

  it('should handle invalid MCP servers gracefully', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
      mcp_servers: [
        {
          type: 'invalid-type',
          url: 'not-a-url',
          name: 'invalid-mcp',
        },
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid MCP server configuration
      ] as any,
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    // Should not have x-mcp-servers header due to validation failure
    expect(result).not.toHaveProperty('x-mcp-servers');
  });

  it('should handle malformed MCP servers gracefully', () => {
    const idkRequestBody: IdkRequestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: ChatCompletionMessageRole.USER,
          content: 'Hello, world!',
        },
      ],
      // biome-ignore lint/suspicious/noExplicitAny: Testing malformed MCP servers configuration
      mcp_servers: 'not-an-array' as any,
    };

    const idkTarget: IdkTarget = {
      configuration: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
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
      api_key: 'test-key',
      weight: 1,
      cache: { mode: CacheMode.DISABLED },
      retry: { attempts: 0 },
    };

    const providerConfig = {
      model: {
        param: 'model',
        required: true,
      },
      messages: {
        param: 'messages',
        required: true,
      },
    };

    const result = transformUsingProviderConfig(
      providerConfig,
      idkRequestBody,
      idkTarget,
    );

    // Should not have x-mcp-servers header due to validation failure
    expect(result).not.toHaveProperty('x-mcp-servers');
  });
});
