'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { EditAgentView } from '@web/components/agents/edit-agent-view';

export const Route = createLazyFileRoute('/_main/agents/$agentName/edit')({
  component: EditAgentView,
});
