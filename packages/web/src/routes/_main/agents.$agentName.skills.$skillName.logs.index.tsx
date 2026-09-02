import { createFileRoute, redirect } from '@tanstack/react-router';

/** A skill's logs are the agent's logs narrowed to it. Old links land there. */
export const Route = createFileRoute(
  '/_main/agents/$agentName/skills/$skillName/logs/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/agents/$agentName/logs',
      params: { agentName: params.agentName },
      search: { skill: params.skillName },
    });
  },
});
