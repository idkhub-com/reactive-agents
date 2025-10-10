'use client';

import { APIKeyForm } from '@client/components/ai-providers';
import { AIProviderAPIKeysProvider } from '@client/providers/ai-provider-api-keys';
import type { ReactElement } from 'react';

export default function CreateAPIKeyPage(): ReactElement {
  return (
    <AIProviderAPIKeysProvider>
      <APIKeyForm mode="create" />
    </AIProviderAPIKeysProvider>
  );
}
