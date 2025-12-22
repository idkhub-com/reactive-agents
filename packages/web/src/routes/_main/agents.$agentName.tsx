'use client';

import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_main/agents/$agentName')({
  component: () => <Outlet />,
});
