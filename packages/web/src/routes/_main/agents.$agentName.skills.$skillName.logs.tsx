'use client';

import { createFileRoute, Outlet } from '@tanstack/react-router';

/**
 * There is no logs page per skill any more; what lives here are redirects
 * from the old addresses, one per child route.
 */
export const Route = createFileRoute(
  '/_main/agents/$agentName/skills/$skillName/logs',
)({
  component: () => <Outlet />,
});
