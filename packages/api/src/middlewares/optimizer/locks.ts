import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import type { SystemSettings } from '@shared/types/data';

/**
 * A lock is held for as long as the work it guards can take, and no longer.
 *
 * Both optimizer locks used to be fixed windows -- five minutes and ten --
 * chosen when the model calls underneath them had no timeout at all, so they
 * were always a guess. They still have to be a guess about how many calls the
 * guarded body makes, but they no longer have to guess how long a call takes:
 * each internal skill is bounded by its own setting now, so the window can be
 * derived from it and follows the setting when a user raises it for a slow
 * model.
 *
 * Too short is the expensive direction. A lock that expires while its holder
 * is still working lets a second request start the same regeneration, and the
 * two race to write the result. Too long only delays the retry after a holder
 * dies, so the multiplier is deliberately generous.
 */
const ATTEMPTS_PER_CALL = 2; // one attempt and the client's single retry

/**
 * The window a lock covers, given the longest call it guards.
 *
 * The floor is what the lock has always been, and at ordinary timeouts it
 * still wins -- a cycle makes several calls, and five or ten minutes covers
 * them. The derived term only takes over once a single call could outlast the
 * floor on its own, which is exactly the case the floor was never chosen for.
 */
export function lockWindowMs(floorMs: number, timeoutMs: number): number {
  return Math.max(floorMs, ATTEMPTS_PER_CALL * timeoutMs);
}

/**
 * Early regeneration generates a skill's evaluations and then a system prompt
 * for every arm, so its window covers whichever of the two is slower.
 */
export async function evaluationLockWindowMs(
  c: AppContext,
  connector: UserDataStorageConnector,
  floorMs: number,
  settings?: SystemSettings,
): Promise<number> {
  const s = settings ?? (await connector.getSystemSettings(c));
  return lockWindowMs(
    floorMs,
    Math.max(
      s.options.evaluation_generation.timeout_ms,
      s.options.system_prompt_reflection.timeout_ms,
    ),
  );
}

/** Reflection asks the reflection model, once per arm it rewrites. */
export async function reflectionLockWindowMs(
  c: AppContext,
  connector: UserDataStorageConnector,
  floorMs: number,
  settings?: SystemSettings,
): Promise<number> {
  const s = settings ?? (await connector.getSystemSettings(c));
  return lockWindowMs(floorMs, s.options.system_prompt_reflection.timeout_ms);
}
