'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { ProvidersAndModelsView } from '@web/components/ai-providers/providers-and-models-view';

export const Route = createLazyFileRoute('/_main/ai-providers/')({
  component: ProvidersAndModelsView,
});
