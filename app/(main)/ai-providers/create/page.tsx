'use client';

import { APIKeyForm } from '@client/components/ai-providers';
import { AIProvidersProvider } from '@client/providers/ai-providers';

import type { ReactElement } from 'react';

export default function CreateAPIKeyPage(): ReactElement {
  return (
    <AIProvidersProvider>
      <APIKeyForm mode="create" />
    </AIProvidersProvider>
  );
}
