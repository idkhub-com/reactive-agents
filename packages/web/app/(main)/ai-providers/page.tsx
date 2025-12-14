'use client';

import { ProvidersAndModelsView } from '@client/components/ai-providers';
import { AIProvidersProvider } from '@client/providers/ai-providers';
import { ModelsProvider } from '@client/providers/models';
import { useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

export default function AIProviderAPIKeysPage(): ReactElement {
  const searchParams = useSearchParams();
  const selectedProvider = searchParams.get('provider');

  return (
    <AIProvidersProvider>
      <ModelsProvider>
        <ProvidersAndModelsView
          selectedProviderId={selectedProvider || undefined}
        />
      </ModelsProvider>
    </AIProvidersProvider>
  );
}
