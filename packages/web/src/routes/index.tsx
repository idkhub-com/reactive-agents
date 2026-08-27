import { createFileRoute, redirect } from '@tanstack/react-router';

// Always redirect to /login — login page handles the /agents redirect after verifying auth
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/login' });
  },
  component: () => null,
});
