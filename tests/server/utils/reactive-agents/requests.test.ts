import { HttpMethod } from '@server/types/http';
import { constructRequest } from '@server/utils/reactive-agents/requests';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';
import { describe, expect, it } from 'vitest';

interface TestRequestInit extends RequestInit {
  duplex?: string;
}

describe('constructRequest', () => {
  describe('UPLOAD_FILE with multipart/form-data', () => {
    it('should preserve Content-Type header correctly', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/files',
        { 'content-type': 'multipart/form-data; boundary=test-boundary' },
        { file: new Blob(), purpose: 'batch' },
      );

      const result = constructRequest(
        raRequestData,
        { authorization: 'Bearer test' },
        {},
        {},
      ) as TestRequestInit;

      expect(result.duplex).toBe('half');
      expect((result.headers as Record<string, string>)['Content-Type']).toBe(
        'multipart/form-data; boundary=test-boundary',
      );
      expect(
        (result.headers as Record<string, string>)['content-type'],
      ).toBeUndefined();
    });

    it('should handle non-multipart UPLOAD_FILE', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/files',
        { 'content-type': 'application/json' },
        { file: new Blob(), purpose: 'batch' },
      );

      const result = constructRequest(
        raRequestData,
        {},
        {},
        {},
      ) as TestRequestInit;

      expect(result.duplex).toBe('half');
      expect((result.headers as Record<string, string>)['content-type']).toBe(
        'application/json',
      );
    });
  });

  describe('Header handling', () => {
    it('should delete content-type for GET requests', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.GET,
        'https://api.openai.com/v1/files',
        { 'content-type': 'application/json' },
        {},
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect(
        (result.headers as Record<string, string>)['content-type'],
      ).toBeUndefined();
    });

    it('should delete content-type for multipart/form-data requests', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'multipart/form-data; boundary=test' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect(
        (result.headers as Record<string, string>)['content-type'],
      ).toBeUndefined();
    });

    it('should preserve content-type for non-GET, non-multipart requests', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect((result.headers as Record<string, string>)['content-type']).toBe(
        'application/json',
      );
    });
  });

  describe('Header merging', () => {
    it('should merge provider config headers correctly', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const providerConfigHeaders = {
        Authorization: 'Bearer test-token',
        'X-Custom-Header': 'custom-value',
      };

      const result = constructRequest(
        raRequestData,
        providerConfigHeaders,
        {},
        {},
      );

      expect((result.headers as Record<string, string>).authorization).toBe(
        'Bearer test-token',
      );
      expect(
        (result.headers as Record<string, string>)['x-custom-header'],
      ).toBe('custom-value');
    });

    it('should merge forwarded headers correctly', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const forwardedHeaders = {
        'X-Forwarded-For': '192.168.1.1',
        'X-Real-IP': '192.168.1.1',
      };

      const result = constructRequest(raRequestData, {}, forwardedHeaders, {});

      expect(
        (result.headers as Record<string, string>)['X-Forwarded-For'],
      ).toBe('192.168.1.1');
      expect((result.headers as Record<string, string>)['X-Real-IP']).toBe(
        '192.168.1.1',
      );
    });

    it('should not merge proxy headers when function name is not proxy', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const proxyHeaders = {
        'X-Proxy-Header': 'proxy-value',
      };

      const result = constructRequest(raRequestData, {}, {}, proxyHeaders);

      expect(
        (result.headers as Record<string, string>)['x-proxy-header'],
      ).toBeUndefined();
    });
  });

  describe('Header precedence', () => {
    it('should apply header precedence correctly', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const providerConfigHeaders = {
        'content-type': 'application/xml',
        authorization: 'Bearer provider-token',
      };

      const forwardedHeaders = {
        authorization: 'Bearer forwarded-token',
        'x-forwarded-for': '192.168.1.1',
      };

      const result = constructRequest(
        raRequestData,
        providerConfigHeaders,
        forwardedHeaders,
        {},
      );

      // Forwarded headers should override provider config headers
      expect((result.headers as Record<string, string>).authorization).toBe(
        'Bearer forwarded-token',
      );
      expect(
        (result.headers as Record<string, string>)['x-forwarded-for'],
      ).toBe('192.168.1.1');
      // Base content-type should be preserved
      expect((result.headers as Record<string, string>)['content-type']).toBe(
        'application/json',
      );
    });
  });

  describe('Content-Length header removal', () => {
    it('should remove content-length header', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const providerConfigHeaders = {
        'content-length': '123',
        authorization: 'Bearer test',
      };

      const result = constructRequest(
        raRequestData,
        providerConfigHeaders,
        {},
        {},
      );

      expect(
        (result.headers as Record<string, string>)['content-length'],
      ).toBeUndefined();
      expect((result.headers as Record<string, string>).authorization).toBe(
        'Bearer test',
      );
    });
  });

  describe('Method handling', () => {
    it('should set method correctly', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect(result.method).toBe('POST');
    });

    it('should handle different HTTP methods for valid endpoints', () => {
      // Test POST method
      const postReactiveAgentsRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const postResult = constructRequest(
        postReactiveAgentsRequestData,
        {},
        {},
        {},
      );
      expect(postResult.method).toBe('POST');

      // Test GET method for files endpoint
      const getReactiveAgentsRequestData = produceReactiveAgentsRequestData(
        HttpMethod.GET,
        'https://api.openai.com/v1/files',
        { 'content-type': 'application/json' },
        {},
      );

      const getResult = constructRequest(
        getReactiveAgentsRequestData,
        {},
        {},
        {},
      );
      expect(getResult.method).toBe('GET');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty headers', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        {},
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect((result.headers as Record<string, string>)['content-type']).toBe(
        'application/json',
      );
    });

    it('should handle case-insensitive header keys', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'Content-Type': 'application/json' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect((result.headers as Record<string, string>)['content-type']).toBe(
        'application/json',
      );
    });

    it('should handle content-type with parameters', () => {
      const raRequestData = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        'https://api.openai.com/v1/chat/completions',
        { 'content-type': 'application/json; charset=utf-8' },
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      );

      const result = constructRequest(raRequestData, {}, {}, {});

      expect((result.headers as Record<string, string>)['content-type']).toBe(
        'application/json',
      );
    });
  });
});
