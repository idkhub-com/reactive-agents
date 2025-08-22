'use client';

import { DatasetView } from '@client/components/datasets-view';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';

export default function DatasetPage(): ReactElement {
  const params = useParams();
  const datasetId = params.id as string;

  return <DatasetView datasetId={datasetId} />;
}
