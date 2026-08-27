import type { AppContext, AppEnv } from '@api/types/hono';

/**
 * Create a mock AppContext for use in tests.
 *
 * Provides a minimal context with `env` bindings so that getter functions
 * in `@api/constants` (e.g. `getAccessPassword(c)`) don't crash when
 * accessing `c.env`.
 *
 * Usage:
 *   import { createMockContext } from '@api/test-utils/mock-context';
 *   const c = createMockContext();
 */
export function createMockContext(
  bindings?: Partial<AppEnv['Bindings']>,
): AppContext {
  return { env: { ...bindings } } as AppContext;
}
