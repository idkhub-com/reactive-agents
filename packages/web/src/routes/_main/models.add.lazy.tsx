'use client';

import { createLazyFileRoute, useSearch } from '@tanstack/react-router';
import { AddModelsView } from '@web/components/models/add-models-view';

export const Route = createLazyFileRoute('/_main/models/add')({
  component: AddModelsPage,
});

function AddModelsPage() {
  const { providerId } = useSearch({ from: '/_main/models/add' });
  return <AddModelsView providerId={providerId} />;
}
