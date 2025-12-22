'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { SkillEventsView } from '@web/components/agents/skills/events/skill-events-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/events',
)({
  component: SkillEventsView,
});
