'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { ArmDetailView } from '@web/components/agents/skills/arms/arm-detail-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/clusters/$clusterId/configurations/$armId',
)({
  component: ArmDetailView,
});
