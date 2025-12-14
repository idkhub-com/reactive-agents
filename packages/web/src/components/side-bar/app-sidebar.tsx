'use client';

import { AnimatedLogo } from '@client/components/side-bar/animated-logo';
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
          className="flex h-14 items-center justify-center relative rounded-sm w-full group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:m-2"
        >
          <AnimatedLogo isCollapsed={isCollapsed} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={SideBarData.sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
