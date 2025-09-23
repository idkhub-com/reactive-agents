import {
  acquireLock,
  acquireLockWithRetry,
  checkLock,
  cleanupExpiredLocks,
  releaseLock,
  withLock,
} from '@server/connectors/supabase/optimizer-lock';
import type { OptimizerLockStatus } from '@shared/types/data/optimizer-lock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the rpcFunctionWithResponse function
vi.mock('@server/connectors/supabase/base', () => ({
  rpcFunctionWithResponse: vi.fn(),
}));

import { rpcFunctionWithResponse } from '@server/connectors/supabase/base';

describe('Optimizer Lock Functions', () => {
  const mockRpcFunction = vi.mocked(rpcFunctionWithResponse);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should successfully acquire a lock', async () => {
      mockRpcFunction.mockResolvedValue(true);

      const result = await acquireLock(
        'test-skill-123',
        'test-process-456',
        300,
        { test: 'metadata' },
      );

      expect(result).toBe(true);
      expect(mockRpcFunction).toHaveBeenCalledWith(
        'acquire_optimizer_lock',
        {
          p_lock_name: 'test-skill-123',
          p_locked_by: 'test-process-456',
          p_timeout_seconds: 300,
          p_metadata: { test: 'metadata' },
        },
        expect.any(Object), // schema
      );
    });

    it('should fail to acquire a lock when already held', async () => {
      mockRpcFunction.mockResolvedValue(false);

      const result = await acquireLock('test-skill-123');

      expect(result).toBe(false);
    });

    it('should generate process ID when not provided', async () => {
      mockRpcFunction.mockResolvedValue(true);

      await acquireLock('test-skill-123');

      expect(mockRpcFunction).toHaveBeenCalledWith(
        'acquire_optimizer_lock',
        expect.objectContaining({
          p_lock_name: 'test-skill-123',
          p_locked_by: expect.stringMatching(/^node_/),
          p_timeout_seconds: 300,
          p_metadata: {},
        }),
        expect.any(Object),
      );
    });
  });

  describe('releaseLock', () => {
    it('should successfully release a lock', async () => {
      mockRpcFunction.mockResolvedValue(true);

      const result = await releaseLock('test-skill-123', 'test-process-456');

      expect(result).toBe(true);
      expect(mockRpcFunction).toHaveBeenCalledWith(
        'release_optimizer_lock',
        {
          p_lock_name: 'test-skill-123',
          p_locked_by: 'test-process-456',
        },
        expect.any(Object),
      );
    });

    it('should fail to release a lock not owned by the process', async () => {
      mockRpcFunction.mockResolvedValue(false);

      const result = await releaseLock('test-skill-123', 'wrong-process');

      expect(result).toBe(false);
    });
  });

  describe('checkLock', () => {
    it('should return lock status when lock exists', async () => {
      const mockLockStatus = [
        {
          is_locked: true,
          locked_by: 'test-process-456',
          locked_at: '2023-01-01T00:00:00Z',
          expires_at: '2023-01-01T00:05:00Z',
          time_remaining_seconds: 300,
          metadata: { test: 'data' },
        },
      ];

      mockRpcFunction.mockResolvedValue(mockLockStatus);

      const result = await checkLock('test-skill-123');

      expect(result).toEqual(mockLockStatus[0]);
      expect(mockRpcFunction).toHaveBeenCalledWith(
        'check_optimizer_lock',
        {
          p_lock_name: 'test-skill-123',
        },
        expect.any(Object),
      );
    });

    it('should return unlocked status when lock does not exist', async () => {
      mockRpcFunction.mockResolvedValue([]);

      const result = await checkLock('test-skill-123');

      const expectedStatus: OptimizerLockStatus = {
        is_locked: false,
        locked_by: null,
        locked_at: null,
        expires_at: null,
        time_remaining_seconds: null,
        metadata: null,
      };

      expect(result).toEqual(expectedStatus);
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should return the number of cleaned up locks', async () => {
      mockRpcFunction.mockResolvedValue(5);

      const result = await cleanupExpiredLocks();

      expect(result).toBe(5);
      expect(mockRpcFunction).toHaveBeenCalledWith(
        'cleanup_expired_optimizer_locks',
        {},
        expect.any(Object),
      );
    });
  });

  describe('withLock', () => {
    it('should execute function with lock acquired and released', async () => {
      // Mock successful lock acquisition
      mockRpcFunction.mockResolvedValueOnce(true);
      // Mock successful lock release
      mockRpcFunction.mockResolvedValueOnce(true);

      const testFunction = vi.fn().mockResolvedValue('test-result');

      const result = await withLock(
        'test-skill-123',
        testFunction,
        'test-process',
        300,
        { test: 'metadata' },
      );

      expect(result).toBe('test-result');
      expect(testFunction).toHaveBeenCalledOnce();

      // Check acquire lock call
      expect(mockRpcFunction).toHaveBeenNthCalledWith(
        1,
        'acquire_optimizer_lock',
        expect.objectContaining({
          p_lock_name: 'test-skill-123',
          p_locked_by: 'test-process',
        }),
        expect.any(Object),
      );

      // Check release lock call
      expect(mockRpcFunction).toHaveBeenNthCalledWith(
        2,
        'release_optimizer_lock',
        expect.objectContaining({
          p_lock_name: 'test-skill-123',
          p_locked_by: 'test-process',
        }),
        expect.any(Object),
      );
    });

    it('should throw error when lock cannot be acquired', async () => {
      mockRpcFunction.mockResolvedValue(false);

      const testFunction = vi.fn();

      await expect(withLock('test-skill-123', testFunction)).rejects.toThrow(
        'Failed to acquire lock: test-skill-123',
      );

      expect(testFunction).not.toHaveBeenCalled();
    });

    it('should release lock even if function throws', async () => {
      // Mock successful lock acquisition
      mockRpcFunction.mockResolvedValueOnce(true);
      // Mock successful lock release
      mockRpcFunction.mockResolvedValueOnce(true);

      const testFunction = vi.fn().mockRejectedValue(new Error('test error'));

      await expect(
        withLock('test-skill-123', testFunction, 'test-process'),
      ).rejects.toThrow('test error');

      // Verify lock release was attempted
      expect(mockRpcFunction).toHaveBeenNthCalledWith(
        2,
        'release_optimizer_lock',
        expect.objectContaining({
          p_lock_name: 'test-skill-123',
          p_locked_by: 'test-process',
        }),
        expect.any(Object),
      );
    });
  });

  describe('acquireLockWithRetry', () => {
    it('should succeed on first attempt', async () => {
      mockRpcFunction.mockResolvedValue(true);

      const result = await acquireLockWithRetry(
        'test-skill-123',
        'test-process',
        300,
        3,
        100,
      );

      expect(result).toBe(true);
      expect(mockRpcFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      mockRpcFunction
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await acquireLockWithRetry(
        'test-skill-123',
        'test-process',
        300,
        3,
        10, // Short delay for testing
      );

      expect(result).toBe(true);
      expect(mockRpcFunction).toHaveBeenCalledTimes(3);
    });

    it('should fail after all retries exhausted', async () => {
      mockRpcFunction.mockResolvedValue(false);

      const result = await acquireLockWithRetry(
        'test-skill-123',
        'test-process',
        300,
        2,
        10,
      );

      expect(result).toBe(false);
      expect(mockRpcFunction).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});
