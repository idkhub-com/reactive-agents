import { createFileRoute, redirect } from '@tanstack/react-router';

/** A log lives under its agent now; old skill-scoped links land there. */
export const Route = createFileRoute(
  '/_main/agents/$agentName/skills/$skillName/logs/$logId',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/agents/$agentName/logs/$logId',
      params: { agentName: params.agentName, logId: params.logId },
    });
  },
});
