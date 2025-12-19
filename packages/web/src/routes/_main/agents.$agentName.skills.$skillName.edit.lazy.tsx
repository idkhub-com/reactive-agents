'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { EditSkillView } from '@web/components/agents/skills/edit-skill-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/edit',
)({
  component: EditSkillView,
});
