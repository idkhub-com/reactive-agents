import { supabaseUserDataStorageConnector } from '@server/connectors/supabase';
import type {
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
vi.mock('@server/constants', () => ({
  POSTGREST_SERVICE_ROLE_KEY: 'test-service-role-key',
  POSTGREST_URL: 'https://test.supabase.co/rest/v1',
  SUPABASE_SECRET_KEY: 'test-secret-key',
  AI_PROVIDER_API_KEY_ENCRYPTION_KEY: 'test-encryption-key-32-bytes-long',
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('supabaseUserDataStorageConnector - Tool Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTools', () => {
    it('should fetch tools with basic query parameters', async () => {
      const mockResponse = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          agent_id: '123e4567-e89b-12d3-a456-426614174001',
          hash: 'abcd1234',
          type: 'function',
          name: 'test_function',
          raw_data: { test: 'data' },
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const queryParams: ToolQueryParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result =
        await supabaseUserDataStorageConnector.getTools(queryParams);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        new URL(
          'https://test.supabase.co/rest/v1/tools?agent_id=eq.123e4567-e89b-12d3-a456-426614174001',
        ),
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-service-role-key',
            apiKey: 'test-secret-key',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle all query parameters', async () => {
      const mockResponse: unknown[] = [];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const queryParams: ToolQueryParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        limit: 10,
        offset: 5,
      };

      await supabaseUserDataStorageConnector.getTools(queryParams);

      const expectedUrl = new URL('https://test.supabase.co/rest/v1/tools');
      expectedUrl.searchParams.set(
        'id',
        'eq.123e4567-e89b-12d3-a456-426614174000',
      );
      expectedUrl.searchParams.set(
        'agent_id',
        'eq.123e4567-e89b-12d3-a456-426614174001',
      );
      expectedUrl.searchParams.set('hash', 'eq.abcd1234');
      expectedUrl.searchParams.set('type', 'eq.function');
      expectedUrl.searchParams.set('name', 'eq.test_function');
      expectedUrl.searchParams.set('limit', '10');
      expectedUrl.searchParams.set('offset', '5');

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should handle empty query parameters', async () => {
      const mockResponse: unknown[] = [];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await supabaseUserDataStorageConnector.getTools({});

      expect(mockFetch).toHaveBeenCalledWith(
        new URL('https://test.supabase.co/rest/v1/tools'),
        expect.any(Object),
      );
    });

    it('should handle API errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Database connection failed',
      } as Response);

      await expect(
        supabaseUserDataStorageConnector.getTools({}),
      ).rejects.toThrow('Failed to fetch from PostgREST');
    });

    it('should handle schema validation errors', async () => {
      const invalidResponse = [
        {
          id: 'invalid-uuid',
          agent_id: '123e4567-e89b-12d3-a456-426614174001',
          // Missing required fields
        },
      ];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      } as Response);

      await expect(
        supabaseUserDataStorageConnector.getTools({}),
      ).rejects.toThrow('Failed to parse data from PostgREST');
    });
  });

  describe('createTool', () => {
    it('should create a tool successfully', async () => {
      const createParams: ToolCreateParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: { function: { name: 'test_function' } },
      };

      const mockResponse = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ...createParams,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result =
        await supabaseUserDataStorageConnector.createTool(createParams);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('https://test.supabase.co/rest/v1/tools'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-service-role-key',
            apiKey: 'test-secret-key',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(createParams),
        },
      );
      expect(result).toEqual(mockResponse[0]);
    });

    it('should handle creation errors', async () => {
      const createParams: ToolCreateParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: {},
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid data provided',
      } as Response);

      await expect(
        supabaseUserDataStorageConnector.createTool(createParams),
      ).rejects.toThrow('Failed to insert into PostgREST');
    });

    it('should handle duplicate tools gracefully', async () => {
      const createParams: ToolCreateParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'abcd1234',
        type: 'function',
        name: 'test_function',
        raw_data: {},
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'duplicate key value violates unique constraint',
      } as Response);

      await expect(
        supabaseUserDataStorageConnector.createTool(createParams),
      ).rejects.toThrow('Failed to insert into PostgREST');
    });
  });

  describe('deleteTool', () => {
    it('should delete a tool successfully', async () => {
      const toolId = '123e4567-e89b-12d3-a456-426614174000';

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await supabaseUserDataStorageConnector.deleteTool(toolId);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        new URL(
          'https://test.supabase.co/rest/v1/tools?id=eq.123e4567-e89b-12d3-a456-426614174000',
        ),
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-service-role-key',
            apiKey: 'test-secret-key',
          },
        },
      );
    });

    it('should handle deletion errors', async () => {
      const toolId = '123e4567-e89b-12d3-a456-426614174000';

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Database error',
      } as Response);

      await expect(
        supabaseUserDataStorageConnector.deleteTool(toolId),
      ).rejects.toThrow('Failed to delete from PostgREST');
    });
  });

  describe('environment variable validation', () => {
    it('should throw error when POSTGREST_SERVICE_ROLE_KEY is missing', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules();

      // Mock the constants to return undefined
      vi.doMock('@server/constants', () => ({
        POSTGREST_SERVICE_ROLE_KEY: undefined,
        POSTGREST_URL: 'https://test.supabase.co/rest/v1',
        SUPABASE_SECRET_KEY: 'test-secret-key',
        AI_PROVIDER_API_KEY_ENCRYPTION_KEY: 'test-encryption-key-32-bytes-long',
      }));

      // Re-import to get the mocked version
      const { supabaseUserDataStorageConnector: mockedConnector } =
        await import('@server/connectors/supabase');

      await expect(mockedConnector.getTools({})).rejects.toThrow(
        'POSTGREST_SERVICE_ROLE_KEY is not set',
      );

      // Reset after test
      vi.doUnmock('@server/constants');
    });

    it('should throw error when POSTGREST_URL is missing', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules();

      vi.doMock('@server/constants', () => ({
        POSTGREST_SERVICE_ROLE_KEY: 'test-key',
        POSTGREST_URL: undefined,
        SUPABASE_SECRET_KEY: 'test-secret-key',
        AI_PROVIDER_API_KEY_ENCRYPTION_KEY: 'test-encryption-key-32-bytes-long',
      }));

      const { supabaseUserDataStorageConnector: mockedConnector } =
        await import('@server/connectors/supabase');

      await expect(mockedConnector.getTools({})).rejects.toThrow(
        'POSTGREST_URL is not set',
      );

      // Reset after test
      vi.doUnmock('@server/constants');
    });
  });

  describe('complex tool data handling', () => {
    it('should handle tools with complex raw_data', async () => {
      const createParams: ToolCreateParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: 'complex_hash',
        type: 'function',
        name: 'complex_function',
        raw_data: {
          function: {
            name: 'complex_function',
            description: 'A complex function with nested data',
            parameters: {
              type: 'object',
              properties: {
                input: { type: 'string' },
                options: {
                  type: 'object',
                  properties: {
                    verbose: { type: 'boolean' },
                    format: { type: 'string', enum: ['json', 'xml'] },
                  },
                },
              },
            },
          },
          metadata: {
            version: '1.0',
            tags: ['complex', 'nested'],
            configuration: {
              timeout: 30000,
              retries: 3,
            },
          },
        },
      };

      const mockResponse = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ...createParams,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result =
        await supabaseUserDataStorageConnector.createTool(createParams);

      expect(result.raw_data).toEqual(createParams.raw_data);
      expect(result.name).toBe('complex_function');
    });

    it('should handle tool queries with pagination', async () => {
      const mockResponse = Array.from({ length: 5 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-42661417400${i}`,
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        hash: `hash_${i}`,
        type: 'function',
        name: `function_${i}`,
        raw_data: { index: i },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }));

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const queryParams: ToolQueryParams = {
        agent_id: '123e4567-e89b-12d3-a456-426614174001',
        limit: 5,
        offset: 10,
      };

      const result =
        await supabaseUserDataStorageConnector.getTools(queryParams);

      expect(result).toHaveLength(5);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('limit=5'),
        }),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('offset=10'),
        }),
        expect.any(Object),
      );
    });
  });
});
