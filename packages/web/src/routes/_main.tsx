'use client';

import { createFileRoute, Outlet } from '@tanstack/react-router';
import { BreadcrumbComponent } from '@web/components/breadcrumb';
import { AppSidebar } from '@web/components/side-bar/app-sidebar';
import { SidebarInset, SidebarTrigger } from '@web/components/ui/sidebar';
import { ThemeSelect } from '@web/components/ui/theme-select';
import { AppProviders } from '@web/providers/app-providers';

export const Route = createFileRoute('/_main')({
  component: MainLayout,
});

function MainLayout() {
  return (
    <AppProviders>
      <AppSidebar />
      <SidebarInset className="overflow-y-auto">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <BreadcrumbComponent />
          <div className="ml-auto">
            <ThemeSelect />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </AppProviders>
  );
}
