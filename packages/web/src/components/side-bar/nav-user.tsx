'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@client/components/ui/sidebar';
import { API_URL } from '@client/constants';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NavUser(): React.ReactElement {
  const router = useRouter();
  async function signOut(): Promise<void> {
    const response = await fetch(`${API_URL}/v1/reactive-agents/auth/logout`, {
      credentials: 'include',
      method: 'POST',
    });
    if (response.ok) {
      router.push('/login');
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={(): Promise<void> => signOut()}>
          <LogOut />
          Log Out
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
