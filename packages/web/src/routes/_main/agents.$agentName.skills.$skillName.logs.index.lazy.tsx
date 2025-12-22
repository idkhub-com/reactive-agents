'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { LogsView } from '@web/components/agents/skills/logs/logs-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/logs/',
)({
  component: LogsView,
});
