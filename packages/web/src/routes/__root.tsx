import {
  createRootRoute,
  isRedirect,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { getAuthStatus } from '@web/api/v1/reactive-agents/auth';
import { Suspense } from 'react';

async function checkAuth({
  location,
}: {
  location: { pathname: string };
}): Promise<void> {
  if (location.pathname === '/login') {
    return;
  }

  try {
    const data = await getAuthStatus();

    if (!data) {
      throw redirect({ to: '/login' });
    }

    if (data.authRequired && !data.authenticated) {
      throw redirect({ to: '/login' });
    }
  } catch (e) {
    if (isRedirect(e)) throw e;
    // Network error — default to login for security
    throw redirect({ to: '/login' });
  }
}

export const Route = createRootRoute({
  beforeLoad: checkAuth,
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
