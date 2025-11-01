'use client';

import { AgentStatusIndicator } from '@client/components/agents/agent-status-indicator';
import {
  AGENT_SHORTCUT_KEYS,
  MAX_AGENT_SHORTCUTS,
} from '@client/components/agents/constants';
import {
  Collapsible,
  CollapsibleContent,
} from '@client/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@client/components/ui/sidebar';
import {
  useKeyboardShortcuts,
  useModifierKey,
} from '@client/hooks/use-keyboard-shortcuts';
import { useAgents } from '@client/providers/agents';
import type { NavigationSection } from '@client/types/ui/side-bar';
import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { BotIcon, ExternalLink, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

const createAgentAvatar = (agentName: string) => {
  return `data:image/svg+xml;base64,${Buffer.from(
    createAvatar(botttsNeutral, {
      seed: agentName,
      size: 20,
      backgroundColor: [
        '00acc1',
        '039be5',
        '1e88e5',
        '43a047',
        '546e7a',
        '5e35b1',
        '6d4c41',
        '757575',
        '7cb342',
        '8e24aa',
        'c0ca33',
        'd81b60',
        'e53935',
        'f4511e',
        'fb8c00',
        'fdd835',
        'ffb300',
        '00897b',
        '3949ab',
      ],
    }).toString(),
  ).toString('base64')}`;
};

export function NavMain({
  sections,
}: {
  sections: NavigationSection[];
}): React.ReactElement {
  const { agents, selectedAgent, isLoading } = useAgents();
  const router = useRouter();
  const pathname = usePathname();
  const modifierKey = useModifierKey();
  const [isAgentsOpen, setIsAgentsOpen] = React.useState(true);

  const isSectionActive = (section: NavigationSection): boolean => {
    if (section.url && section.url !== '#' && !section.external) {
      return pathname.startsWith(section.url);
    }
    return false;
  };

  // Handle keyboard shortcuts for agent switching
  const handleShortcut = React.useCallback(
    (key: string) => {
      const keyNumber = parseInt(key, 10);
      if (keyNumber >= 1 && keyNumber <= agents.length) {
        const targetAgent = agents[keyNumber - 1];
        if (targetAgent) {
          router.push(`/agents/${encodeURIComponent(targetAgent.name)}`);
        }
      }
    },
    [agents, router],
  );

  // Set up keyboard shortcuts for first MAX_AGENT_SHORTCUTS agents
  useKeyboardShortcuts({
    onShortcutAction: handleShortcut,
    shortcuts: AGENT_SHORTCUT_KEYS,
    enabled: !isLoading && agents.length > 0,
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {/* Agents Section */}
        <Collapsible open={isAgentsOpen} onOpenChange={setIsAgentsOpen}>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={'Agents'}
              className="cursor-pointer"
              asChild
            >
              <Link
                href="/agents"
                onClick={(e) => {
                  // Only toggle collapse if we're already on /agents
                  if (pathname === '/agents') {
                    e.preventDefault();
                    setIsAgentsOpen(!isAgentsOpen);
                  }
                }}
              >
                <BotIcon size={16} className="shrink-0" />
                <span>Agents</span>
                {!isLoading && (
                  <>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {agents.length}
                    </span>
                    <Link
                      href="/agents/create"
                      className="ml-1 size-4 cursor-pointer hover:opacity-70 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Plus className="size-4" />
                    </Link>
                  </>
                )}
              </Link>
            </SidebarMenuButton>
            <CollapsibleContent>
              <SidebarMenuSub>
                {isLoading ? (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton>
                      <span>Loading...</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : agents.length === 0 ? (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/agents/create">
                        <Plus className="size-4" />
                        <span>Create your first agent</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : (
                  agents.map((agent, index) => (
                    <SidebarMenuSubItem key={agent.id}>
                      <SidebarMenuSubButton
                        isActive={selectedAgent?.id === agent.id}
                        asChild
                      >
                        <Link
                          href={`/agents/${encodeURIComponent(agent.name)}`}
                        >
                          <Image
                            src={createAgentAvatar(agent.name)}
                            alt={`${agent.name} avatar`}
                            width={16}
                            height={16}
                            className="size-4 rounded-sm"
                          />
                          <span className="truncate">{agent.name}</span>
                          <AgentStatusIndicator agent={agent} />
                          {index < MAX_AGENT_SHORTCUTS && (
                            <span className="ml-auto text-xs text-muted-foreground shrink-0">
                              {modifierKey}
                              {index + 1}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                )}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>

        {/* Other Platform Sections */}
        {sections.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isSectionActive(item)}
              asChild
            >
              <Link
                href={item.url}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="cursor-pointer"
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
                {item.external && (
                  <ExternalLink className="ml-auto size-3 text-muted-foreground" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
