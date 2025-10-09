import { supabaseUserDataStorageConnector } from '@server/connectors/supabase';
import {
  type EvaluationRun,
  type EvaluationRunQueryParams,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import type {
  LogOutput,
  LogOutputCreateParams,
  LogOutputQueryParams,
} from '@shared/types/data/log-output';
import type {
  ToolCreateParams,
  ToolQueryParams,
} from '@shared/types/data/tool';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock environment variables
vi.mock('@server/constants', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
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
            apiKey: 'test-anon-key',
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
      ).rejects.toThrow('Failed to fetch from Supabase');
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
      ).rejects.toThrow('Failed to parse data from Supabase');
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
            apiKey: 'test-anon-key',
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
      ).rejects.toThrow('Failed to insert into Supabase');
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
      ).rejects.toThrow('Failed to insert into Supabase');
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
            apiKey: 'test-anon-key',
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
      ).rejects.toThrow('Failed to delete from Supabase');
    });
  });

  describe('environment variable validation', () => {
    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules();

      // Mock the constants to return undefined
      vi.doMock('@server/constants', () => ({
        SUPABASE_SERVICE_ROLE_KEY: undefined,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
      }));

      // Re-import to get the mocked version
      const { supabaseUserDataStorageConnector: mockedConnector } =
        await import('@server/connectors/supabase');

      await expect(mockedConnector.getTools({})).rejects.toThrow(
        'SUPABASE_SERVICE_ROLE_KEY is not set',
      );

      // Reset after test
      vi.doUnmock('@server/constants');
    });

    it('should throw error when SUPABASE_URL is missing', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules();

      vi.doMock('@server/constants', () => ({
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
        SUPABASE_URL: undefined,
        SUPABASE_ANON_KEY: 'test-anon-key',
      }));

      const { supabaseUserDataStorageConnector: mockedConnector } =
        await import('@server/connectors/supabase');

      await expect(mockedConnector.getTools({})).rejects.toThrow(
        'SUPABASE_URL is not set',
      );

      // Reset after test
      vi.doUnmock('@server/constants');
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules();

      vi.doMock('@server/constants', () => ({
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: undefined,
      }));

      const { supabaseUserDataStorageConnector: mockedConnector } =
        await import('@server/connectors/supabase');

      await expect(mockedConnector.getTools({})).rejects.toThrow(
        'SUPABASE_ANON_KEY is not set',
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

  describe('getEvaluationRuns with evaluation_method filter', () => {
    it('should include evaluation_method parameter in query', async () => {
      const mockResponse = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          dataset_id: '123e4567-e89b-12d3-a456-426614174001',
          agent_id: '123e4567-e89b-12d3-a456-426614174002',
          skill_id: 'e8a69698-5913-42d2-adcb-83d614d67d59',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          name: 'test_evaluation',
          description: 'Test evaluation run',
          status: 'completed',
          results: { score: 0.85 },
          metadata: { model: 'gpt-4' },
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          started_at: '2024-01-01T00:00:00.000Z',
          completed_at: '2024-01-01T00:10:00.000Z',
        },
      ];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const queryParams = {
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        agent_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      await supabaseUserDataStorageConnector.getEvaluationRuns(queryParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('evaluation_method=eq.task_completion'),
        }),
        expect.any(Object),
      );
    });

    it('should handle multiple filter parameters including evaluation_method', async () => {
      const mockResponse: EvaluationRun[] = [];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const queryParams: EvaluationRunQueryParams = {
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        status: EvaluationRunStatus.RUNNING,
        dataset_id: '123e4567-e89b-12d3-a456-426614174001',
        limit: 10,
        offset: 0,
      };

      await supabaseUserDataStorageConnector.getEvaluationRuns(queryParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('evaluation_method=eq.task_completion'),
        }),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('status=eq.running'),
        }),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining(
            'dataset_id=eq.123e4567-e89b-12d3-a456-426614174001',
          ),
        }),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('limit=10'),
        }),
        expect.any(Object),
      );
    });
  });

  describe('LogOutput Operations', () => {
    describe('getLogOutputs', () => {
      it('should fetch log outputs with evaluation run id', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            log_id: '123e4567-e89b-12d3-a456-426614174002',
            output: { result: 'test result' },
            score: 0.85,
            metadata: { duration: 1500 },
            created_at: '2024-01-01T00:00:00.000Z',
            evaluation_run_id: evaluationRunId,
          },
        ];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {};
        const result = await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          new URL(
            `https://test.supabase.co/rest/v1/log_outputs?evaluation_run_id=eq.${evaluationRunId}`,
          ),
          expect.any(Object),
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle query parameters with ids filter', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          ids: [
            '123e4567-e89b-12d3-a456-426614174001',
            '123e4567-e89b-12d3-a456-426614174002',
          ],
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const callUrl = mockFetch.mock.calls[0][0] as URL;
        expect(callUrl.href).toContain('id=in.');
        expect(callUrl.href).toContain('123e4567-e89b-12d3-a456-426614174001');
        expect(callUrl.href).toContain('123e4567-e89b-12d3-a456-426614174002');
      });

      it('should handle query parameters with log_ids filter', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          log_ids: [
            '123e4567-e89b-12d3-a456-426614174003',
            '123e4567-e89b-12d3-a456-426614174004',
          ],
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const callUrl = mockFetch.mock.calls[0][0] as URL;
        expect(callUrl.href).toContain('log_id=in.');
        expect(callUrl.href).toContain('123e4567-e89b-12d3-a456-426614174003');
        expect(callUrl.href).toContain('123e4567-e89b-12d3-a456-426614174004');
      });

      it('should handle score range filters', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          score_min: 0.5,
          score_max: 0.9,
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const callUrl = mockFetch.mock.calls[0][0] as URL;
        expect(callUrl.href).toContain('score=and');
        expect(callUrl.href).toContain('gte.0.5');
        expect(callUrl.href).toContain('lte.0.9');
      });

      it('should handle score_min only', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          score_min: 0.7,
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const callUrl = mockFetch.mock.calls[0][0] as URL;
        expect(callUrl.href).toContain('score=gte.0.7');
      });

      it('should handle score_max only', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          score_max: 0.8,
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const callUrl = mockFetch.mock.calls[0][0] as URL;
        expect(callUrl.href).toContain('score=lte.0.8');
      });

      it('should handle pagination parameters', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          limit: 20,
          offset: 10,
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const callUrl = mockFetch.mock.calls[0][0] as URL;
        expect(callUrl.href).toContain('limit=20');
        expect(callUrl.href).toContain('offset=10');
      });

      it('should handle all parameters combined', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockResponse: LogOutput[] = [];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const queryParams: LogOutputQueryParams = {
          ids: ['123e4567-e89b-12d3-a456-426614174001'],
          log_ids: ['123e4567-e89b-12d3-a456-426614174002'],
          score_min: 0.6,
          score_max: 0.95,
          limit: 50,
          offset: 25,
        };

        await supabaseUserDataStorageConnector.getLogOutputs(
          evaluationRunId,
          queryParams,
        );

        const expectedUrl = new URL(
          'https://test.supabase.co/rest/v1/log_outputs',
        );
        expectedUrl.searchParams.set(
          'evaluation_run_id',
          `eq.${evaluationRunId}`,
        );
        expectedUrl.searchParams.set(
          'id',
          'in.(123e4567-e89b-12d3-a456-426614174001)',
        );
        expectedUrl.searchParams.set(
          'log_id',
          'in.(123e4567-e89b-12d3-a456-426614174002)',
        );
        expectedUrl.searchParams.set('score', 'and(gte.0.6,lte.0.95)');
        expectedUrl.searchParams.set('limit', '50');
        expectedUrl.searchParams.set('offset', '25');

        expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
      });

      it('should handle API errors', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Database connection failed',
        } as Response);

        await expect(
          supabaseUserDataStorageConnector.getLogOutputs(evaluationRunId, {}),
        ).rejects.toThrow('Failed to fetch from Supabase');
      });

      it('should handle schema validation errors', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const invalidResponse = [
          {
            id: 'invalid-uuid',
            // Missing required fields
          },
        ];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => invalidResponse,
        } as Response);

        await expect(
          supabaseUserDataStorageConnector.getLogOutputs(evaluationRunId, {}),
        ).rejects.toThrow('Failed to parse data from Supabase');
      });
    });

    describe('createLogOutput', () => {
      it('should create a log output successfully', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const createParams: LogOutputCreateParams = {
          log_id: '123e4567-e89b-12d3-a456-426614174002',
          output: { result: 'test result' },
          score: 0.85,
          metadata: { duration: 1500 },
        };

        const mockResponse = [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            ...createParams,
            evaluation_run_id: evaluationRunId,
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await supabaseUserDataStorageConnector.createLogOutput(
          evaluationRunId,
          createParams,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          new URL('https://test.supabase.co/rest/v1/log_outputs'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-service-role-key',
              apiKey: 'test-anon-key',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              ...createParams,
              evaluation_run_id: evaluationRunId,
            }),
          },
        );
        expect(result).toEqual(mockResponse[0]);
      });

      it('should handle creation without optional fields', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const createParams: LogOutputCreateParams = {
          log_id: '123e4567-e89b-12d3-a456-426614174002',
          output: { result: 'minimal result' },
          metadata: {},
          score: 0,
        };

        const mockResponse = [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            log_id: createParams.log_id,
            output: createParams.output,
            score: 0,
            metadata: {},
            evaluation_run_id: evaluationRunId,
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ];

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await supabaseUserDataStorageConnector.createLogOutput(
          evaluationRunId,
          createParams,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(URL),
          expect.objectContaining({
            body: JSON.stringify({
              ...createParams,
              evaluation_run_id: evaluationRunId,
            }),
          }),
        );
        expect(result).toEqual(mockResponse[0]);
      });

      it('should handle creation errors', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const createParams: LogOutputCreateParams = {
          log_id: '123e4567-e89b-12d3-a456-426614174002',
          output: { result: 'test' },
          metadata: {},
          score: 0,
        };

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: async () => 'Invalid data provided',
        } as Response);

        await expect(
          supabaseUserDataStorageConnector.createLogOutput(
            evaluationRunId,
            createParams,
          ),
        ).rejects.toThrow('Failed to insert into Supabase');
      });

      it('should handle foreign key constraint errors', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const createParams: LogOutputCreateParams = {
          log_id: 'non-existent-id',
          output: { result: 'test' },
          metadata: {},
          score: 0,
        };

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 409,
          statusText: 'Conflict',
          text: async () => 'foreign key constraint violation',
        } as Response);

        await expect(
          supabaseUserDataStorageConnector.createLogOutput(
            evaluationRunId,
            createParams,
          ),
        ).rejects.toThrow('Failed to insert into Supabase');
      });
    });

    describe('deleteLogOutput', () => {
      it('should delete a log output successfully', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const outputId = '123e4567-e89b-12d3-a456-426614174001';

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
        } as Response);

        await supabaseUserDataStorageConnector.deleteLogOutput(
          evaluationRunId,
          outputId,
        );

        expect(mockFetch).toHaveBeenCalledWith(
          new URL(
            `https://test.supabase.co/rest/v1/log_outputs?id=eq.${outputId}&evaluation_run_id=eq.${evaluationRunId}`,
          ),
          {
            method: 'DELETE',
            headers: {
              Authorization: 'Bearer test-service-role-key',
              apiKey: 'test-anon-key',
            },
          },
        );
      });

      it('should handle deletion errors', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const outputId = '123e4567-e89b-12d3-a456-426614174001';

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Database error',
        } as Response);

        await expect(
          supabaseUserDataStorageConnector.deleteLogOutput(
            evaluationRunId,
            outputId,
          ),
        ).rejects.toThrow('Failed to delete from Supabase');
      });

      it('should handle deletion of non-existent output', async () => {
        const evaluationRunId = '123e4567-e89b-12d3-a456-426614174000';
        const outputId = 'non-existent-id';

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
        } as Response);

        // Should not throw even if output doesn't exist
        await expect(
          supabaseUserDataStorageConnector.deleteLogOutput(
            evaluationRunId,
            outputId,
          ),
        ).resolves.not.toThrow();
      });
    });
  });
});
