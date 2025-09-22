import { RouterError } from '@server/errors/router';
import type { AppEnv } from '@server/types/hono';
import { AIProvider } from '@shared/types/constants';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock tryTargets function
const mockTryTargets = vi.fn();
vi.mock('@server/handlers/handler-utils', () => ({
  tryTargets: mockTryTargets,
}));

// Mock console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {
    // Intentionally empty for testing
  }),
};

// Import after mocking
const { embeddingsRouter } = await import('@server/api/v1/embeddings');

// Create a test app with the middleware that injects mock data
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    // Mock the context variables for testing
    const mockContext = c as unknown as {
      set: (key: string, value: unknown) => void;
      get: (key: string) => unknown;
    };

    mockContext.set('idk_config', {
      targets: [
        {
          provider: AIProvider.OPENAI,
          api_key: 'test-key',
        },
      ],
      agent_name: 'test-agent',
      skill_name: 'test-skill',
    });

    mockContext.set('idk_request_data', {
      function_name: 'embed',
      requestBody: {
        model: 'text-embedding-3-small',
        input: 'test input',
      },
    });

    await next();
  })
  .route('/', embeddingsRouter);

describe('Embeddings API', () => {
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.error.mockClear();
  });

  describe('POST /', () => {
    it('should return successful response when tryTargets succeeds', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: [0.1, 0.2, 0.3],
              index: 0,
            },
          ],
          model: 'text-embedding-3-small',
          usage: {
            prompt_tokens: 2,
            total_tokens: 2,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );

      mockTryTargets.mockResolvedValue(mockResponse);

      const res = await client.index.$post();

      expect(res.status).toBe(200);
      expect(mockTryTargets).toHaveBeenCalledTimes(1);

      const responseData = await res.json();
      expect(responseData).toEqual({
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: [0.1, 0.2, 0.3],
            index: 0,
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 2,
          total_tokens: 2,
        },
      });
    });

    it('should return 400 error when RouterError is thrown', async () => {
      const routerError = new RouterError('Invalid input parameters');
      mockTryTargets.mockRejectedValue(routerError);

      const res = await client.index.$post();

      expect(res.status).toBe(400);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'embeddings error:',
        expect.any(RouterError),
      );

      const responseData = await res.json();
      expect(responseData).toEqual({
        error: {
          message: 'Invalid input parameters',
          type: 'invalid_request_error',
          code: null,
          param: null,
        },
      });
    });

    it('should return 500 error when generic Error is thrown', async () => {
      const genericError = new Error('Network connection failed');
      mockTryTargets.mockRejectedValue(genericError);

      const res = await client.index.$post();

      expect(res.status).toBe(500);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'embeddings error:',
        expect.any(Error),
      );

      const responseData = await res.json();
      expect(responseData).toEqual({
        error: {
          message: 'Network connection failed',
          type: 'api_error',
          code: null,
          param: null,
        },
      });
    });

    it('should return 500 error when non-Error object is thrown', async () => {
      const nonErrorObject = 'string error';
      mockTryTargets.mockRejectedValue(nonErrorObject);

      const res = await client.index.$post();

      expect(res.status).toBe(500);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'embeddings error:',
        'string error',
      );

      const responseData = await res.json();
      expect(responseData).toEqual({
        error: {
          message: 'Something went wrong',
          type: 'api_error',
          code: null,
          param: null,
        },
      });
    });

    it('should pass correct parameters to tryTargets', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      mockTryTargets.mockResolvedValue(mockResponse);

      await client.index.$post();

      expect(mockTryTargets).toHaveBeenCalledTimes(1);

      const [context, idkConfig, idkRequestData] = mockTryTargets.mock.calls[0];
      expect(context).toBeDefined();
      expect(idkConfig).toMatchObject({
        targets: expect.arrayContaining([
          expect.objectContaining({
            provider: AIProvider.OPENAI,
            api_key: 'test-key',
          }),
        ]),
        agent_name: 'test-agent',
        skill_name: 'test-skill',
      });
      expect(idkRequestData).toMatchObject({
        function_name: 'embed',
        requestBody: {
          model: 'text-embedding-3-small',
          input: 'test input',
        },
      });
    });

    it('should return proper content-type header for error responses', async () => {
      const routerError = new RouterError('Test error');
      mockTryTargets.mockRejectedValue(routerError);

      const res = await client.index.$post();

      expect(res.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle null error', async () => {
      mockTryTargets.mockRejectedValue(null);

      const res = await client.index.$post();

      expect(res.status).toBe(500);
      expect(consoleSpy.error).toHaveBeenCalledWith('embeddings error:', null);

      const responseData = await res.json();
      expect(responseData).toEqual({
        error: {
          message: 'Something went wrong',
          type: 'api_error',
          code: null,
          param: null,
        },
      });
    });

    it('should handle undefined error', async () => {
      mockTryTargets.mockRejectedValue(undefined);

      const res = await client.index.$post();

      expect(res.status).toBe(500);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'embeddings error:',
        undefined,
      );

      const responseData = await res.json();
      expect(responseData).toEqual({
        error: {
          message: 'Something went wrong',
          type: 'api_error',
          code: null,
          param: null,
        },
      });
    });

    it('should handle object error without message', async () => {
      const objectError = {
        code: 'UNKNOWN_ERROR',
        details: 'Something failed',
      };
      mockTryTargets.mockRejectedValue(objectError);

      const res = await client.index.$post();

      expect(res.status).toBe(500);
      expect(consoleSpy.error).toHaveBeenCalledWith('embeddings error:', {
        code: 'UNKNOWN_ERROR',
        details: 'Something failed',
      });

      const responseData = await res.json();
      expect(responseData).toEqual({
        error: {
          message: 'Something went wrong',
          type: 'api_error',
          code: null,
          param: null,
        },
      });
    });
  });
});
