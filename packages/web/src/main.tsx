/// <reference types="vite/client" />

import { createRouter, RouterProvider } from '@tanstack/react-router';
import {
  getAuthStatus,
  ServerUnavailableError,
} from '@web/api/v1/super-agents/auth';
import { Toaster } from '@web/components/ui/toaster';
import { SidebarProvider } from '@web/providers/side-bar';
import { ThemeProvider } from '@web/providers/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen';

// Self-hosted so the dashboard renders correctly with no network access and
// makes no third-party request. Only the weights the app asks for are here:
// Lato 300/400/700/900 for body text (`font-medium` and `font-semibold` have
// no Lato cut, and match to 400 and 700 respectively), and Ubuntu 400/700 for
// the logo, whose text is `font-bold`.
import '@fontsource/lato/300.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/lato/900.css';
// Latin only: the logo is the only thing set in Ubuntu, and it reads
// "Super Agents".
import '@fontsource/ubuntu/latin-400.css';
import '@fontsource/ubuntu/latin-700.css';
import '@web/styles/globals.css';
import '@web/styles/editor.css';

/**
 * App-level auth gate that runs before the router initializes.
 * Returns false if the user must log in — caller should NOT mount the app.
 */
async function checkAuthBeforeMount(): Promise<boolean> {
  if (window.location.pathname === '/login') return true;

  const data = await getAuthStatus();
  if (!data) return false;

  return !(data.authRequired && !data.authenticated);
}

const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * The server is up but refusing to serve, and said why. Shown in place of
 * the app: sending the visitor to `/login` would hide the reason behind a
 * password prompt, or a redirect loop where there is no password.
 */
function renderUnavailable(rootElement: HTMLElement, reason: string) {
  createRoot(rootElement).render(
    <StrictMode>
      <main className="flex h-screen items-center justify-center p-8">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-xl font-semibold">
            The server is not ready to serve the dashboard
          </h1>
          <p className="text-muted-foreground">{reason}</p>
          <p className="text-sm text-muted-foreground">
            Reload once that is done.
          </p>
        </div>
      </main>
    </StrictMode>,
  );
}

async function mount() {
  const rootElement = document.getElementById('root');

  let allowed: boolean;
  try {
    allowed = await checkAuthBeforeMount();
  } catch (e) {
    if (e instanceof ServerUnavailableError && rootElement) {
      renderUnavailable(rootElement, e.message);
      return;
    }
    throw e;
  }
  if (!allowed) {
    window.location.replace('/login');
    return;
  }

  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider className="h-full">
            <RouterProvider router={router} />
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </StrictMode>,
    );
  }
}

mount();
