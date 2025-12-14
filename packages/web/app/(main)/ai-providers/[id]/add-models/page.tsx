import { AddModelsView } from '@client/components/models';
import { AIProvidersProvider } from '@client/providers/ai-providers';
import { ModelsProvider } from '@client/providers/models';
import type { ReactElement } from 'react';

interface AddModelsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AddModelsPage({
  params,
}: AddModelsPageProps): Promise<ReactElement> {
  const { id } = await params;

  return (
    <AIProvidersProvider>
      <ModelsProvider>
        <AddModelsView providerId={id} />
      </ModelsProvider>
    </AIProvidersProvider>
  );
}
