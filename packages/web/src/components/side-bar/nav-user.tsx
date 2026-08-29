'use client';

import { logout } from '@web/api/v1/super-agents/auth';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@web/components/ui/sidebar';
import { useAuthStatus } from '@web/hooks/use-auth-status';
import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { LogOut } from 'lucide-react';

/**
 * The sidebar footer, which offers to log out.
 *
 * It renders nothing when the server has no ACCESS_PASSWORD set. There is no
 * session to end then, and `/login` redirects an arriving visitor back to the
 * dashboard, so the button would swallow the click and appear broken.
 */
export function NavUser(): React.ReactElement | null {
  const navigate = usePermissiveNavigate();
  const authStatus = useAuthStatus();

  async function signOut(): Promise<void> {
    const success = await logout();
    if (success) {
      navigate({ to: '/login' });
    }
  }

  if (!authStatus?.authRequired) {
    return null;
  }

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={(): Promise<void> => signOut()}>
            <LogOut />
            Log Out
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
