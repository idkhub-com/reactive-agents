'use client';

import { ProvidersAndModelsView } from '@client/components/ai-providers';
import { AIProviderAPIKeysProvider } from '@client/providers/ai-provider-api-keys';
import { ModelsProvider } from '@client/providers/models';
import { useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

export default function AIProviderAPIKeysPage(): ReactElement {
  const searchParams = useSearchParams();
  const selectedProvider = searchParams.get('provider');

  return (
    <AIProviderAPIKeysProvider>
      <ModelsProvider>
        <ProvidersAndModelsView
          selectedProviderId={selectedProvider || undefined}
        />
      </ModelsProvider>
    </AIProviderAPIKeysProvider>
  );
}
