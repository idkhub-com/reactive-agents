'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { EvaluationsListView } from '@web/components/agents/skills/evaluations/evaluations-list-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/evaluations/',
)({
  component: EvaluationsListView,
});
