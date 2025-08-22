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
import Image from 'next/image';
import Link from 'next/link';
import type * as React from 'react';

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>): React.ReactElement {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-14 items-center px-4">
          <Link href="/" className="flex items-center">
            <Image
              className="dark:brightness-0 dark:invert"
              src="/assets/brand/idk-logo.png"
              alt="IDK Logo"
              width={72}
              height={24}
            />
          </Link>
        </div>
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
