'use client';

import { ModelForm } from '@client/components/models';
import { Skeleton } from '@client/components/ui/skeleton';
import { ModelsProvider } from '@client/providers/models';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';

export default function EditModelPage(): ReactElement {
  const params = useParams();
  const modelId = params.id as string;

  if (!modelId) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <ModelsProvider>
      <ModelForm modelId={modelId} />
    </ModelsProvider>
  );
}
