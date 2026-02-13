/// <reference types="vite/client" />

import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Toaster } from '@web/components/ui/toaster';
import { API_URL } from '@web/constants';
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

  try {
    const response = await fetch(`${API_URL}/v1/reactive-agents/auth/status`, {
      credentials: 'include',
    });

    if (!response.ok) return false;

    const data = (await response.json()) as {
      authRequired: boolean;
      authenticated: boolean;
    };

    return !(data.authRequired && !data.authenticated);
  } catch {
    return false;
  }
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
