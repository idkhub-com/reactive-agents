'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { ClusterArmsView } from '@web/components/agents/skills/clusters/cluster-arms-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/clusters/$clusterId/configurations/',
)({
  component: ClusterArmsView,
});
