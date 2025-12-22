'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { AgentView } from '@web/components/agents/agent-view';

export const Route = createLazyFileRoute('/_main/agents/$agentName/')({
  component: AgentView,
});
