'use client';

import {
  AGENT_SHORTCUT_KEYS,
  MAX_AGENT_SHORTCUTS,
} from '@client/components/agents/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@client/components/ui/sidebar';
import {
  useKeyboardShortcuts,
  useModifierKey,
} from '@client/hooks/use-keyboard-shortcuts';
import { useAgents } from '@client/providers/agents';
import { useSidebar } from '@client/providers/side-bar';
import { PlusIcon } from '@radix-ui/react-icons';
import type { Agent } from '@shared/types/data';
import { Bot, ChevronsUpDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export function AgentSwitcher(): React.ReactElement {
  const { isMobile } = useSidebar();
  const { agents, selectedAgent, setSelectedAgent, isLoading } = useAgents();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const modifierKey = useModifierKey();

  // Use first agent as default if no agent is selected
  const activeAgent = selectedAgent || agents[0] || null;

  const handleCreateAgentClick = () => {
    setDropdownOpen(false); // Close dropdown first
    router.push('/agents/create');
  };

  const handleNavigateToCreateAgent = () => {
    router.push('/agents/create');
  };

  // Handle keyboard shortcuts for agent switching
  const handleShortcut = React.useCallback(
    (key: string) => {
      const keyNumber = parseInt(key, 10);
      if (keyNumber >= 1 && keyNumber <= agents.length) {
        const targetAgent = agents[keyNumber - 1];
        if (targetAgent) {
          setSelectedAgent(targetAgent);
        }
      }
    },
    [agents, setSelectedAgent],
  );

  // Set up keyboard shortcuts for first MAX_AGENT_SHORTCUTS agents
  useKeyboardShortcuts({
    onShortcutAction: handleShortcut,
    shortcuts: AGENT_SHORTCUT_KEYS,
    enabled: !isLoading && agents.length > 0,
  });

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Bot className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeAgent) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            onClick={handleNavigateToCreateAgent}
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Bot className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                Create your first agent
              </span>
            </div>
            <PlusIcon className="ml-auto" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Bot className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeAgent.name}</span>
                <span className="truncate text-xs">
                  {activeAgent.description || 'AI Agent'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Agents
            </DropdownMenuLabel>
            {agents.map((agent: Agent, index: number) => (
              <DropdownMenuItem
                key={agent.id}
                onClick={(): void => setSelectedAgent(agent)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Bot className="size-3.5 shrink-0" />
                </div>
                <div className="flex flex-col">
                  <span className="truncate font-medium">{agent.name}</span>
                  {agent.description && (
                    <span className="truncate text-xs text-muted-foreground">
                      {agent.description}
                    </span>
                  )}
                </div>
                {index < MAX_AGENT_SHORTCUTS && (
                  <DropdownMenuShortcut>
                    {modifierKey}
                    {index + 1}
                  </DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 cursor-pointer"
              onClick={handleCreateAgentClick}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add agent</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
