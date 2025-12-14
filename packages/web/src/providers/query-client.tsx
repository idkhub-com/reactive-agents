'use client';

import { ErrorBoundary } from '@client/components/error-boundary';
import { useToast } from '@client/hooks/use-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  return (
    <ErrorBoundary
      fallback={(_error) => (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Data loading error
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            There was a problem loading the application data.
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('React Query error boundary:', error, errorInfo);
        toast({
          title: 'Application error',
          description: 'A critical error occurred. Please reload the page.',
          variant: 'destructive',
        });
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
