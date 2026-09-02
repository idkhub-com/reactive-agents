import { createFileRoute } from '@tanstack/react-router';

/** `?skill=<name>` narrows the page to one skill's logs */
export const Route = createFileRoute('/_main/agents/$agentName/logs/')({
  validateSearch: (search: Record<string, unknown>): { skill?: string } =>
    typeof search.skill === 'string' && search.skill
      ? { skill: search.skill }
      : {},
});
