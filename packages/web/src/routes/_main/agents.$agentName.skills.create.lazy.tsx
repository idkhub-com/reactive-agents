'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { CreateSkillView } from '@web/components/agents/skills/create-skill-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/create',
)({
  component: CreateSkillView,
});
