'use client';

import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { useLocation } from '@tanstack/react-router';
import { AgentStatusIndicator } from '@web/components/agents/agent-status-indicator';
import {
  AGENT_SHORTCUT_KEYS,
  MAX_AGENT_SHORTCUTS,
} from '@web/components/agents/constants';
import { AIProvidersStatusIndicator } from '@web/components/ai-providers/ai-providers-status-indicator';
import { SettingsStatusIndicator } from '@web/components/settings/settings-status-indicator';
import {
  Collapsible,
  CollapsibleContent,
} from '@web/components/ui/collapsible';
import { PermissiveLink as Link } from '@web/components/ui/permissive-link';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@web/components/ui/sidebar';
import {
  useKeyboardShortcuts,
  useModifierKey,
} from '@web/hooks/use-keyboard-shortcuts';
import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { useAgents } from '@web/providers/agents';
import type { NavigationSection } from '@web/types/ui/side-bar';
import { BotIcon, ExternalLink, Plus } from 'lucide-react';
import React from 'react';

const createAgentAvatar = (agentName: string) => {
  const svg = createAvatar(botttsNeutral, {
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
  }).toString();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export function NavMain({
  sections,
}: {
  sections: NavigationSection[];
}): React.ReactElement {
  const { agents, selectedAgent, isLoading } = useAgents();
  const navigate = usePermissiveNavigate();
  const location = useLocation();
  const pathname = location.pathname;
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
          navigate({ to: `/agents/${encodeURIComponent(targetAgent.name)}` });
        }
      }
    },
    [agents, navigate],
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
                to="/agents"
                onClick={(e: React.MouseEvent) => {
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
                    <button
                      type="button"
                      className="ml-1 size-4 cursor-pointer hover:opacity-70 flex items-center justify-center"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate({ to: '/agents/create' });
                      }}
                    >
                      <Plus className="size-4" />
                    </button>
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
                      <Link to="/agents/create">
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
                        <Link to={`/agents/${encodeURIComponent(agent.name)}`}>
                          <img
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
              {item.external ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ExternalLink className="ml-auto size-3 text-muted-foreground" />
                </a>
              ) : (
                <Link to={item.url} className="cursor-pointer">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {/* Show status indicators for nav items */}
                  {item.url === '/ai-providers' && (
                    <AIProvidersStatusIndicator />
                  )}
                  {item.url === '/settings' && <SettingsStatusIndicator />}
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
