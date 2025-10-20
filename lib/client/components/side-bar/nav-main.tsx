'use client';

import {
  AGENT_SHORTCUT_KEYS,
  MAX_AGENT_SHORTCUTS,
} from '@client/components/agents/constants';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
import { useNavigation } from '@client/providers/navigation';
import type { NavigationSection } from '@client/types/ui/side-bar';
import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { BotIcon, Plus } from 'lucide-react';
import Image from 'next/image';
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
  const { setSection } = useNavigation();
  const { agents, isLoading, selectedAgent, setSelectedAgent } = useAgents();
  const router = useRouter();
  const pathname = usePathname();
  const modifierKey = useModifierKey();
  const [isAgentsOpen, setIsAgentsOpen] = React.useState(true);

  const isSectionActive = (section: NavigationSection): boolean => {
    if (section.url && section.url !== '#') {
      return pathname.startsWith(section.url);
    }
    return false;
  };

  const handleSectionClick = (section: NavigationSection) => {
    // Clear selected agent when navigating away from agents
    if (section.title !== 'Agents') {
      setSelectedAgent(null);
    }

    if (section.url && section.url !== '#') {
      router.push(section.url);
    } else if (section.title === 'Documentation') {
      setSection('documentation');
    } else if (section.title === 'Settings') {
      setSection('settings');
    }
  };

  const handleCreateAgentClick = () => {
    router.push('/agents/create');
  };

  const handleAgentClick = React.useCallback(
    (agent: (typeof agents)[0]) => {
      setSelectedAgent(agent);
      router.push(`/agents/${encodeURIComponent(agent.name)}`);
    },
    [setSelectedAgent, router],
  );

  // Handle keyboard shortcuts for agent switching
  const handleShortcut = React.useCallback(
    (key: string) => {
      const keyNumber = parseInt(key, 10);
      if (keyNumber >= 1 && keyNumber <= agents.length) {
        const targetAgent = agents[keyNumber - 1];
        if (targetAgent) {
          handleAgentClick(targetAgent);
        }
      }
    },
    [agents, handleAgentClick],
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
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={'Agents'}
                className="cursor-pointer"
                onClick={(e) => {
                  // If clicking on the main button area (not the Plus icon), navigate to agents list
                  const target = e.target as HTMLElement;

                  if (
                    !target.closest('.create-agent-icon') &&
                    !target.classList.contains('create-agent-icon')
                  ) {
                    // Prevent default collapsible toggle behavior
                    e.preventDefault();
                    e.stopPropagation();

                    setSelectedAgent(null);
                    router.replace('/agents');
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
                    <Plus
                      className="ml-1 size-4 cursor-pointer hover:opacity-70 create-agent-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateAgentClick();
                      }}
                    />
                  </>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
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
                    <SidebarMenuSubButton onClick={handleCreateAgentClick}>
                      <Plus className="size-4" />
                      <span>Create your first agent</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : (
                  agents.map((agent, index) => (
                    <SidebarMenuSubItem
                      key={agent.id}
                      className="cursor-pointer"
                    >
                      <SidebarMenuSubButton
                        isActive={selectedAgent?.id === agent.id}
                        onClick={() => handleAgentClick(agent)}
                      >
                        <Image
                          src={createAgentAvatar(agent.name)}
                          alt={`${agent.name} avatar`}
                          width={16}
                          height={16}
                          className="size-4 rounded-sm"
                        />
                        <span className="truncate">{agent.name}</span>
                        {index < MAX_AGENT_SHORTCUTS && (
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">
                            {modifierKey}
                            {index + 1}
                          </span>
                        )}
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
              onClick={() => handleSectionClick(item)}
              isActive={isSectionActive(item)}
              className="cursor-pointer"
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
