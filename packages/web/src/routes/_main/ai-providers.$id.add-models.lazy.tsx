'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { AddModelsView } from '@web/components/models/add-models-view';

export const Route = createLazyFileRoute('/_main/ai-providers/$id/add-models')({
  component: AddModelsPage,
});

function AddModelsPage() {
  const { id } = Route.useParams();
  return <AddModelsView providerId={id} />;
}
