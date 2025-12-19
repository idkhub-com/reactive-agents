'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { SkillDashboardView } from '@web/components/agents/skills/skill-dashboard-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/',
)({
  component: SkillDashboardView,
});
