import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { routeTree } from '../../routeTree.gen';

/**
 * Recursively walk the route tree and collect all route IDs.
 * Each route stores its relative ID segment in `options.id`.
 * Full IDs are built by concatenating parent segments.
 * The root route has no `options.id` — we emit `__root__` for it.
 *
 * Accepts `typeof routeTree` which is a complex generic — we use
 * structural access via `as` casts on the untyped shape.
 */
export function collectRouteIds(
  route: typeof routeTree,
  ids: Set<string> = new Set(),
): Set<string> {
  function walk(
    node: { isRoot?: boolean; options?: { id?: string }; children?: object },
    parentId: string,
  ) {
    let fullId: string;
    if (node.isRoot) {
      fullId = '__root__';
    } else {
      const segment = node.options?.id as string;
      fullId = parentId + segment;
    }
    ids.add(fullId);

    if (node.children) {
      for (const child of Object.values(
        node.children as Record<string, typeof node>,
      )) {
        walk(child, node.isRoot ? '' : fullId);
      }
    }
  }

  walk(
    route as unknown as {
      isRoot?: boolean;
      options?: { id?: string };
      children?: object;
    },
    '',
  );
  return ids;
}

/**
 * Render a route by navigating to the given path using the real route tree.
 */
export function renderRoute(path: string) {
  const memoryHistory = createMemoryHistory({
    initialEntries: [path],
  });

  const router = createRouter({
    routeTree,
    history: memoryHistory,
    defaultPendingMinMs: 0,
    defaultPreload: false,
  });

  return render(<RouterProvider router={router} />);
}

/**
 * Configure a global `fetch` mock that responds to `/auth/status` requests.
 *
 * Both `__root.tsx` (beforeLoad) and `login.tsx` (beforeLoad) call
 * `fetch('/v1/super-agents/auth/status')` to decide whether to render
 * the page or redirect.
 *
 * Returns the mock so callers can add further assertions.
 */
export function setupAuthMocks(
  options: { authRequired?: boolean; authenticated?: boolean } = {
    authRequired: false,
    authenticated: true,
  },
) {
  const { authRequired = false, authenticated = true } = options;

  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ authRequired, authenticated }),
  });

  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}
