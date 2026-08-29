'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { ModelsListView } from '@web/components/models/models-list';

export const Route = createLazyFileRoute('/_main/models/')({
  component: ModelsListView,
});
