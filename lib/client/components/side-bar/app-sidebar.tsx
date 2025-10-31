'use client';

import { NavMain } from '@client/components/side-bar/nav-main';
import { NavUser } from '@client/components/side-bar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@client/components/ui/sidebar';
import { SideBarData } from '@client/constants';
import { useSidebar } from '@client/providers/side-bar';
import { cn } from '@client/utils/ui/utils';
import Link from 'next/link';
import type * as React from 'react';

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>): React.ReactElement {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-2 flex items-center justify-center group-data-[collapsible=icon]:p-0 transition-all">
        <Link
          href="/"
          className={cn(
            'flex h-14 items-center justify-center px-2 relative bg-gradient-to-r from-indigo-500 to-cyan-400 dark:from-indigo-800 dark:to-blue-500 rounded-sm w-full group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:m-2 group-data-[collapsible=icon]:my-4',
            isCollapsed ? 'py-2' : '',
          )}
        >
          {/* Collapsed state: "RA" */}
          <span
            className={`text-xl font-bold text-white absolute transition-all duration-300 ease-in-out ${
              isCollapsed
                ? 'opacity-100 scale-100 visible'
                : 'opacity-0 scale-90 invisible'
            }`}
          >
            RA
          </span>
          {/* Expanded state: "Reactive Agents" */}
          <span
            className={`text-xl font-bold text-white transition-all duration-300 ease-in-out whitespace-nowrap ${
              isCollapsed
                ? 'opacity-0 scale-90 invisible'
                : 'opacity-100 scale-100 visible'
            }`}
          >
            Reactive Agents
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={SideBarData.sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={SideBarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
