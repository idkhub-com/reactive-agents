import type { OptimizerLockStatus } from '@shared/types/data/optimizer-lock';
import { z } from 'zod';
import { rpcFunctionWithResponse } from './base';

// Schema for database function response
const AcquireLockResponseSchema = z.boolean();
const ReleaseLockResponseSchema = z.boolean();
const CleanupLocksResponseSchema = z.number();

const LockStatusResponseSchema = z.object({
  is_locked: z.boolean(),
  locked_by: z.string().nullable(),
  locked_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  time_remaining_seconds: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

/**
 * Generate a unique identifier for this process instance
 * Combines hostname (if available), process ID, and timestamp
 */
const generateInstanceId = (): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  // In Node.js environments, we can use process.pid
  const processId = typeof process !== 'undefined' ? process.pid : 'unknown';

  return `node_${processId}_${timestamp}_${randomSuffix}`;
};

/**
 * Acquire a distributed lock for optimizer operations
 * @param lockName Unique identifier for the lock (e.g., skill_id)
 * @param lockedBy Identifier of the process/instance requesting the lock
 * @param timeoutSeconds Lock timeout in seconds (default: 300 = 5 minutes)
 * @param metadata Additional metadata about the lock
 * @returns Promise<boolean> - true if lock was acquired, false if already locked
 */
export const acquireLock = async (
  lockName: string,
  lockedBy?: string,
  timeoutSeconds = 300,
  metadata: Record<string, unknown> = {},
): Promise<boolean> => {
  const actualLockedBy = lockedBy || generateInstanceId();

  const result = await rpcFunctionWithResponse(
    'acquire_optimizer_lock',
    {
      p_lock_name: lockName,
      p_locked_by: actualLockedBy,
      p_timeout_seconds: timeoutSeconds,
      p_metadata: metadata,
    },
    AcquireLockResponseSchema,
  );

  return result;
};

/**
 * Release a distributed lock
 * @param lockName The lock to release
 * @param lockedBy The process identifier that owns the lock
 * @returns Promise<boolean> - true if lock was released, false if not owned by caller
 */
export const releaseLock = async (
  lockName: string,
  lockedBy?: string,
): Promise<boolean> => {
  const actualLockedBy = lockedBy || generateInstanceId();

  const result = await rpcFunctionWithResponse(
    'release_optimizer_lock',
    {
      p_lock_name: lockName,
      p_locked_by: actualLockedBy,
    },
    ReleaseLockResponseSchema,
  );

  return result;
};

/**
 * Check the status of a distributed lock
 * @param lockName The lock to check
 * @returns Promise<OptimizerLockStatus> - lock status information
 */
export const checkLock = async (
  lockName: string,
): Promise<OptimizerLockStatus> => {
  const result = await rpcFunctionWithResponse(
    'check_optimizer_lock',
    {
      p_lock_name: lockName,
    },
    z.array(LockStatusResponseSchema),
  );

  // The function returns an array with 0 or 1 elements
  if (result.length === 0) {
    return {
      is_locked: false,
      locked_by: null,
      locked_at: null,
      expires_at: null,
      time_remaining_seconds: null,
      metadata: null,
    };
  }

  return result[0];
};

/**
 * Clean up expired locks
 * @returns Promise<number> - number of expired locks removed
 */
export const cleanupExpiredLocks = async (): Promise<number> => {
  const result = await rpcFunctionWithResponse(
    'cleanup_expired_optimizer_locks',
    {},
    CleanupLocksResponseSchema,
  );

  return result;
};

/**
 * Convenience function to acquire a lock with automatic retry
 * @param lockName The lock to acquire
 * @param lockedBy The process identifier (optional, auto-generated if not provided)
 * @param timeoutSeconds Lock timeout in seconds
 * @param retryAttempts Number of times to retry if lock is busy
 * @param retryDelayMs Delay between retry attempts in milliseconds
 * @param metadata Additional metadata about the lock
 * @returns Promise<boolean> - true if lock was acquired, false if all retries failed
 */
export const acquireLockWithRetry = async (
  lockName: string,
  lockedBy?: string,
  timeoutSeconds = 300,
  retryAttempts = 3,
  retryDelayMs = 1000,
  metadata: Record<string, unknown> = {},
): Promise<boolean> => {
  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    const acquired = await acquireLock(
      lockName,
      lockedBy,
      timeoutSeconds,
      metadata,
    );

    if (acquired) {
      return true;
    }

    // If this was the last attempt, don't wait
    if (attempt < retryAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return false;
};

/**
 * Execute a function while holding a distributed lock
 * @param lockName The lock to acquire
 * @param fn The function to execute while holding the lock
 * @param lockedBy The process identifier (optional, auto-generated if not provided)
 * @param timeoutSeconds Lock timeout in seconds
 * @param metadata Additional metadata about the lock
 * @returns Promise<T> - result of the function execution
 * @throws Error if lock cannot be acquired or if function throws
 */
export const withLock = async <T>(
  lockName: string,
  fn: () => Promise<T>,
  lockedBy?: string,
  timeoutSeconds = 300,
  metadata: Record<string, unknown> = {},
): Promise<T> => {
  const actualLockedBy = lockedBy || generateInstanceId();

  const acquired = await acquireLock(
    lockName,
    actualLockedBy,
    timeoutSeconds,
    metadata,
  );

  if (!acquired) {
    throw new Error(`Failed to acquire lock: ${lockName}`);
  }

  try {
    return await fn();
  } finally {
    // Always attempt to release the lock, but don't throw if it fails
    // (the lock will expire automatically)
    try {
      await releaseLock(lockName, actualLockedBy);
    } catch (error) {
      console.warn(`Failed to release lock ${lockName}:`, error);
    }
  }
};
