/// <reference types="vite/client" />

import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Toaster } from '@web/components/ui/toaster';
import { SidebarProvider } from '@web/providers/side-bar';
import { ThemeProvider } from '@web/providers/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { routeTree } from './routeTree.gen';

import '@web/styles/globals.css';
import '@web/styles/editor.css';

const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
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
