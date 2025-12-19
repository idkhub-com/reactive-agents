'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { LogDetailsView } from '@web/components/agents/skills/logs/log-details-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/logs/$logId',
)({
  component: LogDetailsView,
});
