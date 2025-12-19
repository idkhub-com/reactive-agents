'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { EvaluationEditView } from '@web/components/agents/skills/evaluations/evaluation-edit-view';

export const Route = createLazyFileRoute(
  '/_main/agents/$agentName/skills/$skillName/evaluations/$evaluationId/edit',
)({
  component: EvaluationEditView,
});
