'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { AgentLogsView } from '@web/components/agents/agent-logs-view';

export const Route = createLazyFileRoute('/_main/agents/$agentName/logs/')({
  component: AgentLogsView,
});
