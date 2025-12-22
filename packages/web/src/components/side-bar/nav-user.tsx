'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@web/components/ui/sidebar';
import { API_URL } from '@web/constants';
import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { LogOut } from 'lucide-react';

export function NavUser(): React.ReactElement {
  const navigate = usePermissiveNavigate();
  async function signOut(): Promise<void> {
    const response = await fetch(`${API_URL}/v1/reactive-agents/auth/logout`, {
      credentials: 'include',
      method: 'POST',
    });
    if (response.ok) {
      navigate({ to: '/login' });
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
