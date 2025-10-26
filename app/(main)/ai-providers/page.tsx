'use client';

import { APIKeysListView } from '@client/components/ai-providers';
import { AIProviderAPIKeysProvider } from '@client/providers/ai-provider-api-keys';
import type { ReactElement } from 'react';

export default function AIProviderAPIKeysPage(): ReactElement {
  return (
    <AIProviderAPIKeysProvider>
      <APIKeysListView />
    </AIProviderAPIKeysProvider>
  );
}
