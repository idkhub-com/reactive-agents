'use client';

import { ModelForm } from '@client/components/models';
import { ModelsProvider } from '@client/providers/models';
import type { ReactElement } from 'react';

export default function CreateModelPage(): ReactElement {
  return (
    <ModelsProvider>
      <ModelForm />
    </ModelsProvider>
  );
}
