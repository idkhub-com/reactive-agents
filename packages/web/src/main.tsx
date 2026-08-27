/// <reference types="vite/client" />

import { createRouter, RouterProvider } from '@tanstack/react-router';
import { getAuthStatus } from '@web/api/v1/super-agents/auth';
import { Toaster } from '@web/components/ui/toaster';
import { SidebarProvider } from '@web/providers/side-bar';
import { ThemeProvider } from '@web/providers/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen';

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

async function mount() {
  const allowed = await checkAuthBeforeMount();
  if (!allowed) {
    window.location.replace('/login');
    return;
  }

  const rootElement = document.getElementById('root');
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
