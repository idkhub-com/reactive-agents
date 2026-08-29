import { createFileRoute, redirect } from '@tanstack/react-router';

// There is no standalone partitions list: the skill dashboard is where the
// partitions are listed, and each card links into `/clusters/$clusterId/
// configurations`. The breadcrumb still names `/clusters` as the parent of
// those pages, so send the bare path to the dashboard instead of a 404.
export const Route = createFileRoute(
  '/_main/agents/$agentName/skills/$skillName/clusters/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/agents/$agentName/skills/$skillName', params });
  },
  component: () => null,
});
