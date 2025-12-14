'use client';

import { APIKeyForm } from '@client/components/ai-providers';
import { Skeleton } from '@client/components/ui/skeleton';
import {
  AIProvidersProvider,
  useAIProviders,
} from '@client/providers/ai-providers';

import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';

function EditAPIKeyContent(): ReactElement {
  const params = useParams();
  const { getAPIKeyById, isLoading } = useAIProviders();

  const apiKeyId = params.id as string;
  const apiKey = getAPIKeyById(apiKeyId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">API Key Not Found</h2>
          <p className="text-muted-foreground">
            The API key you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return <APIKeyForm apiKey={apiKey} mode="edit" />;
}

export default function EditAPIKeyPage(): ReactElement {
  return (
    <AIProvidersProvider>
      <EditAPIKeyContent />
    </AIProvidersProvider>
  );
}
