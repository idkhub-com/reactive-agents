'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { CreateSkillCompleteView } from '@web/components/agents/skills/create-skill-complete-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/setup',
)({
  component: CreateSkillCompleteView,
});
