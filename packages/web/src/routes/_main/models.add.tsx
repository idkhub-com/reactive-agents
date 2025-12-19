import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_main/models/add')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      providerId: search.providerId as string,
    };
  },
});
