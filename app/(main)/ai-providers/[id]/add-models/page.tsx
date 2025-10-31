import { AddModelsView } from '@client/components/models';
import { AIProviderAPIKeysProvider } from '@client/providers/ai-provider-api-keys';
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
    <AIProviderAPIKeysProvider>
      <ModelsProvider>
        <AddModelsView providerId={id} />
      </ModelsProvider>
    </AIProviderAPIKeysProvider>
  );
}
