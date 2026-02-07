'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { APIKeyForm } from '@web/components/ai-providers';
import { Skeleton } from '@web/components/ui/skeleton';
import { useAIProviders } from '@web/providers/ai-providers';

export const Route = createLazyFileRoute('/_main/ai-providers/$id/edit')({
  component: EditAPIKeyPage,
});

function EditAPIKeyPage() {
  const { id } = Route.useParams();
  const { getAPIKeyById, isLoading } = useAIProviders();

  const apiKey = getAPIKeyById(id);

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
            The API key you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
        </div>
      </div>
    );
  }

  return <APIKeyForm apiKey={apiKey} mode="edit" />;
}
