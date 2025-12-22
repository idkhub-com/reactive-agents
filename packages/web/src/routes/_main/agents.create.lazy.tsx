'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { CreateAgentView } from '@web/components/agents/create-agent-view';

export const Route = createLazyFileRoute('/_main/agents/create')({
  component: CreateAgentView,
});
