'use client';

import { DatasetsView } from '@client/components/datasets-view';
import type { ReactElement } from 'react';

export default function DatasetsPage(): ReactElement {
  console.log('📊 Rendering DatasetsPage');
  return <DatasetsView />;
}
