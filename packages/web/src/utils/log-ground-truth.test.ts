import type { ImprovedResponse } from '@shared/types/data/improved-response';
import type { Log } from '@shared/types/data/log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module
vi.mock('@web/api/v1/reactive-agents/improved-responses', () => ({
  getImprovedResponseByLogId: vi.fn(),
}));

// Import after mocking
import { getImprovedResponseByLogId } from '@web/api/v1/reactive-agents/improved-responses';
import {
  getGroundTruth,
  getGroundTruthResponseBody,
  hasGroundTruth,
} from '@web/utils/log-ground-truth';

const mockGetImprovedResponseByLogId = vi.mocked(getImprovedResponseByLogId);

describe('log-ground-truth', () => {
  const createMockLog = (id?: string): Log =>
    ({
      id: id ?? 'log-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      status: 200,
    }) as Log;

  const createMockLogWithNoId = (): Log =>
    ({
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      status: 200,
    }) as Log;

  const createMockImprovedResponse = (
    overrides: Partial<ImprovedResponse> = {},
  ): ImprovedResponse => ({
    id: 'improved-123',
    agent_id: 'agent-123',
    skill_id: 'skill-123',
    log_id: 'log-123',
    original_response_body: { message: 'Original response' },
    improved_response_body: { message: 'Improved response' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasGroundTruth', () => {
    it('returns true when improved response exists', async () => {
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(
        createMockImprovedResponse(),
      );

      const log = createMockLog();
      const result = await hasGroundTruth(log);

      expect(result).toBe(true);
      expect(mockGetImprovedResponseByLogId).toHaveBeenCalledWith('log-123');
    });

    it('returns false when no improved response exists', async () => {
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(null);

      const log = createMockLog();
      const result = await hasGroundTruth(log);

      expect(result).toBe(false);
    });

    it('returns false when log has no id', async () => {
      const log = createMockLogWithNoId();
      const result = await hasGroundTruth(log);

      expect(result).toBe(false);
      expect(mockGetImprovedResponseByLogId).not.toHaveBeenCalled();
    });

    it('returns false when log id is empty string', async () => {
      const log = createMockLog('');
      const result = await hasGroundTruth(log);

      expect(result).toBe(false);
      expect(mockGetImprovedResponseByLogId).not.toHaveBeenCalled();
    });
  });

  describe('getGroundTruth', () => {
    it('returns improved response when it exists', async () => {
      const mockImprovedResponse = createMockImprovedResponse();
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(
        mockImprovedResponse,
      );

      const log = createMockLog();
      const result = await getGroundTruth(log);

      expect(result).toEqual(mockImprovedResponse);
      expect(mockGetImprovedResponseByLogId).toHaveBeenCalledWith('log-123');
    });

    it('returns null when no improved response exists', async () => {
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(null);

      const log = createMockLog();
      const result = await getGroundTruth(log);

      expect(result).toBeNull();
    });

    it('returns null when log has no id', async () => {
      const log = createMockLogWithNoId();
      const result = await getGroundTruth(log);

      expect(result).toBeNull();
      expect(mockGetImprovedResponseByLogId).not.toHaveBeenCalled();
    });
  });

  describe('getGroundTruthResponseBody', () => {
    it('returns improved_response_body when it exists', async () => {
      const mockImprovedResponse = createMockImprovedResponse({
        improved_response_body: { content: 'Better response', score: 0.95 },
      });
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(
        mockImprovedResponse,
      );

      const log = createMockLog();
      const result = await getGroundTruthResponseBody(log);

      expect(result).toEqual({ content: 'Better response', score: 0.95 });
    });

    it('returns null when no improved response exists', async () => {
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(null);

      const log = createMockLog();
      const result = await getGroundTruthResponseBody(log);

      expect(result).toBeNull();
    });

    it('returns null when improved response has no body', async () => {
      const mockImprovedResponse = createMockImprovedResponse({
        improved_response_body: undefined,
      });
      mockGetImprovedResponseByLogId.mockResolvedValueOnce(
        mockImprovedResponse as ImprovedResponse,
      );

      const log = createMockLog();
      const result = await getGroundTruthResponseBody(log);

      expect(result).toBeNull();
    });

    it('returns null when log has no id', async () => {
      const log = createMockLogWithNoId();
      const result = await getGroundTruthResponseBody(log);

      expect(result).toBeNull();
      expect(mockGetImprovedResponseByLogId).not.toHaveBeenCalled();
    });
  });
});
