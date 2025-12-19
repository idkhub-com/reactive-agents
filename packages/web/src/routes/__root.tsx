import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
