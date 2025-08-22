'use client';

import { MAX_AGENT_SHORTCUTS } from '@client/components/agents/constants';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@client/components/ui/breadcrumb';
import { Button } from '@client/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { useModifierKey } from '@client/hooks/use-keyboard-shortcuts';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Bot, ChevronsUpDown, Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { type ReactElement, useMemo } from 'react';

const createAgentAvatar = (agentName: string) => {
  return `data:image/svg+xml;base64,${Buffer.from(
    createAvatar(botttsNeutral, {
      seed: agentName,
      size: 24,
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

function SkillDropdownBreadcrumb(): ReactElement {
  const { navigationState, skills, setSelectedSkill } = useNavigation();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const selectedSkill = navigationState.selectedSkill;
  const selectedAgent = navigationState.selectedAgent;

  const handleCreateSkillClick = () => {
    setDropdownOpen(false);
    if (selectedAgent) {
      router.push(
        `/pipelines/${encodeURIComponent(selectedAgent.name)}/skills/create`,
      );
    }
  };

  const handleSkillSelect = (skill: (typeof skills)[0]) => {
    setSelectedSkill(skill);
    setDropdownOpen(false);
  };

  if (!selectedAgent) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-auto p-2 justify-start bg-transparent hover:bg-transparent"
        >
          <Bot className="size-4 mr-2" />
          <span className="truncate font-medium">Select Agent First</span>
        </Button>
      </BreadcrumbItem>
    );
  }

  if (!selectedSkill && skills.length === 0) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleCreateSkillClick}
        >
          <Bot className="size-4 mr-2" />
          <span className="truncate font-medium">Create your first skill</span>
          <Plus className="ml-2 size-4" />
        </Button>
      </BreadcrumbItem>
    );
  }

  const activeSkill = selectedSkill || skills[0] || null;

  if (!activeSkill) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-auto p-2 justify-start bg-transparent hover:bg-transparent"
        >
          <Bot className="size-4 mr-2" />
          <span className="truncate font-medium">Loading skills...</span>
        </Button>
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Bot className="size-4 mr-2" />
            <span className="truncate font-medium">{activeSkill.name}</span>
            <ChevronsUpDown className="ml-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Skills
          </DropdownMenuLabel>
          {skills.map((skill) => (
            <DropdownMenuItem
              key={skill.id}
              onClick={() => handleSkillSelect(skill)}
              className="p-2"
            >
              <div className="flex flex-col">
                <span className="truncate font-medium">{skill.name}</span>
                {skill.description && (
                  <span className="truncate text-xs text-muted-foreground">
                    {skill.description}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="p-2 cursor-pointer"
            onClick={handleCreateSkillClick}
          >
            <Plus className="size-4 mr-2" />
            <div className="text-muted-foreground font-medium">Add skill</div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
  );
}

function AgentDropdownBreadcrumb(): ReactElement {
  const {
    agents,
    isLoading,
    selectedAgent,
    setSelectedAgent: setAgentsSelectedAgent,
  } = useAgents();
  const { setSelectedAgent: setNavigationSelectedAgent } = useNavigation();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const modifierKey = useModifierKey();

  // Use first agent as default if no agent is selected
  const activeAgent = selectedAgent || agents[0] || null;

  // Memoize avatar generation to prevent recalculation on every render
  const agentAvatars = useMemo(() => {
    const avatars = new Map<string, string>();
    if (activeAgent) {
      avatars.set(activeAgent.name, createAgentAvatar(activeAgent.name));
    }
    agents.forEach((agent) => {
      if (!avatars.has(agent.name)) {
        avatars.set(agent.name, createAgentAvatar(agent.name));
      }
    });
    return avatars;
  }, [agents, activeAgent]);

  const handleCreateAgentClick = () => {
    setDropdownOpen(false);
    router.push('/agents/create');
  };

  const handleAgentSelect = (agent: (typeof agents)[0]) => {
    // Keep AgentsProvider and NavigationProvider in sync
    setAgentsSelectedAgent(agent);
    setNavigationSelectedAgent(agent);
    setDropdownOpen(false);
  };

  if (isLoading) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="lg"
          disabled
          className="h-auto p-2 justify-start bg-transparent hover:bg-transparent"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Bot className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight ml-2">
            <span className="truncate font-medium">Loading...</span>
          </div>
        </Button>
      </BreadcrumbItem>
    );
  }

  if (!activeAgent) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="lg"
          className="h-auto p-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleCreateAgentClick}
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Bot className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight ml-2">
            <span className="truncate font-medium">
              Create your first agent
            </span>
          </div>
          <Plus className="ml-auto size-4" />
        </Button>
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            className="h-auto p-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Image
                src={agentAvatars.get(activeAgent.name) || ''}
                alt={`${activeAgent.name} avatar`}
                width={24}
                height={24}
                className="size-6 rounded-sm"
              />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight ml-2">
              <span className="truncate font-medium">{activeAgent.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {activeAgent.description || 'AI Agent'}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Agents
          </DropdownMenuLabel>
          {agents.map((agent, index) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleAgentSelect(agent)}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-md border">
                <Image
                  src={agentAvatars.get(agent.name) || ''}
                  alt={`${agent.name} avatar`}
                  width={16}
                  height={16}
                  className="size-4 rounded-sm"
                />
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
    </BreadcrumbItem>
  );
}

export function BreadcrumbComponent(): ReactElement {
  const { navigationState } = useNavigation();

  return (
    <Breadcrumb>
      <BreadcrumbList className="pl-0">
        {navigationState.breadcrumbs.map((segment, index) => (
          <React.Fragment
            key={
              segment.path ? `${segment.path}-${index}` : `breadcrumb-${index}`
            }
          >
            {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
            {segment.isAgentDropdown ? (
              <AgentDropdownBreadcrumb />
            ) : segment.isSkillDropdown ? (
              <SkillDropdownBreadcrumb />
            ) : (
              <BreadcrumbItem>
                {index === navigationState.breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={segment.path}
                    className="cursor-pointer hover:text-foreground"
                  >
                    {segment.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
