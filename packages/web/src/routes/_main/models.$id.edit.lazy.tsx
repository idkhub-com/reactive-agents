'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { ModelForm } from '@web/components/models/model-form';

export const Route = createLazyFileRoute('/_main/models/$id/edit')({
  component: EditModelPage,
});

function EditModelPage() {
  const { id } = Route.useParams();
  return <ModelForm modelId={id} />;
}
