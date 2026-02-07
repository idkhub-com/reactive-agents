'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { APIKeyForm } from '@web/components/ai-providers';

export const Route = createLazyFileRoute('/_main/ai-providers/create')({
  component: () => <APIKeyForm mode="create" />,
});
