'use client';

import { AgentsView } from '@client/components/agents';
import { BreadcrumbComponent } from '@client/components/breadcrumb';
import { ErrorBoundary } from '@client/components/error-boundary';
import { AppSidebar } from '@client/components/side-bar/app-sidebar';
import { Separator } from '@client/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@client/components/ui/sidebar';
import { ThemeSelect } from '@client/components/ui/theme-select';
import { AppProviders } from '@client/providers/app-providers';
import { useNavigation } from '@client/providers/navigation';
import { usePathname } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

function MainContent({ children }: { children: ReactNode }): ReactElement {
  const { navigationState } = useNavigation();
  const pathname = usePathname();

  // If we're on a agents route with an agent, use the AgentsView
  // But exclude specific sub-routes like skills/create that should render their own pages
  if (
    pathname.startsWith('/agents/') &&
    pathname !== '/agents' &&
    !pathname.includes('/skills/create')
  ) {
    return (
      <ErrorBoundary
        fallback={(error) => (
          <div className="flex flex-col items-center justify-center p-8">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Failed to load agents view
            </h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        )}
      >
        <AgentsView />
      </ErrorBoundary>
    );
  }

  // For other specific routes (agents, skills, etc.), render the children
  if (pathname !== '/') {
    return <>{children}</>;
  }

  // For the root route, show placeholder content based on navigation state
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2 capitalize">
          {navigationState.section}
        </h2>
        <p className="text-muted-foreground">This section is coming soon!</p>
      </div>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <AppProviders>
      <AppSidebar />
      <SidebarInset className="h-full overflow-hidden">
        <header className="flex pt-2 h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full justify-between items-center p-2 m-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-9"
              />
              <ErrorBoundary
                fallback={() => (
                  <span className="text-sm text-muted-foreground">
                    Navigation
                  </span>
                )}
              >
                <BreadcrumbComponent />
              </ErrorBoundary>
            </div>
            <ThemeSelect />
          </div>
        </header>
        <div className="relative flex w-full flex-1 flex-col h-full overflow-auto pt-4">
          <MainContent>{children}</MainContent>
        </div>
      </SidebarInset>
    </AppProviders>
  );
}
