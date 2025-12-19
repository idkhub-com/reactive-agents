'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { AgentsListView } from '@web/components/agents/agents-list-view';

export const Route = createLazyFileRoute('/_main/agents/')({
  component: AgentsListView,
});
