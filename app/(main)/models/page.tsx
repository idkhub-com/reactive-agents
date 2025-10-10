'use client';

import { ModelsListView } from '@client/components/models';
import { ModelsProvider } from '@client/providers/models';
import type { ReactElement } from 'react';

export default function ModelsPage(): ReactElement {
  return (
    <ModelsProvider>
      <ModelsListView />
    </ModelsProvider>
  );
}
