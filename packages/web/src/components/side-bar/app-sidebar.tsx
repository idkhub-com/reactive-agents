'use client';

import { Link } from '@tanstack/react-router';
import { AnimatedLogo } from '@web/components/side-bar/animated-logo';
import { NavMain } from '@web/components/side-bar/nav-main';
import { NavUser } from '@web/components/side-bar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@web/components/ui/sidebar';
import { SideBarData } from '@web/constants';
import { useSidebar } from '@web/providers/side-bar';
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
          to="/"
          className="flex h-14 items-center justify-center relative rounded-sm w-full group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:m-2"
        >
          <AnimatedLogo isCollapsed={isCollapsed} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={SideBarData.sections} />
      </SidebarContent>
      <NavUser />
      <SidebarRail />
    </Sidebar>
  );
}
