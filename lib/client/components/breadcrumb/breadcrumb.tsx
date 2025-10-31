'use client';

import { MAX_AGENT_SHORTCUTS } from '@client/components/agents/constants';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from '@client/components/ui/breadcrumb';
import { Button } from '@client/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@client/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { useModifierKey } from '@client/hooks/use-keyboard-shortcuts';
import { useAgents } from '@client/providers/agents';
import type { BreadcrumbSegment } from '@client/providers/navigation';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationArms } from '@client/providers/skill-optimization-arms';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkills } from '@client/providers/skills';
import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Bot, ChevronRight, Plus, PlusCircleIcon, Wrench } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { type ReactElement, useMemo } from 'react';

// ============================================================================
// Utility Functions
// ============================================================================

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

// ============================================================================
// Agent Breadcrumb Components
// ============================================================================

function LoadingAgentsBreadcrumb(): ReactElement {
  return (
    <BreadcrumbItem>
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
      >
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-lg">
          <Bot className="size-3" />
        </div>
        <span className="truncate font-medium">Loading...</span>
      </Button>
    </BreadcrumbItem>
  );
}

function CreateFirstAgentBreadcrumb({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <BreadcrumbItem>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={onClick}
      >
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-lg">
          <Bot className="size-3" />
        </div>
        <span className="truncate font-medium">Create your first agent</span>
        <Plus className="size-4" />
      </Button>
    </BreadcrumbItem>
  );
}

function AgentCombobox<T extends { id: string; name: string }>({
  activeAgent,
  agents,
  agentAvatars,
  comboboxOpen,
  setComboboxOpen,
  onAgentSelect,
  onCreateClick,
}: {
  activeAgent: T;
  agents: T[];
  agentAvatars: Map<string, string>;
  comboboxOpen: boolean;
  setComboboxOpen: (open: boolean) => void;
  onAgentSelect: (agent: T) => void;
  onCreateClick: () => void;
}): ReactElement {
  const modifierKey = useModifierKey();

  return (
    <BreadcrumbItem>
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Image
              src={agentAvatars.get(activeAgent.name) || ''}
              alt={`${activeAgent.name} avatar`}
              width={20}
              height={20}
              className="size-5 rounded-sm"
            />
            <span className="truncate font-medium">{activeAgent.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder="Search agents..." className="h-9" />
            <CommandList>
              <CommandEmpty>No agents found.</CommandEmpty>
              <CommandGroup heading="Agents">
                {agents.map((agent, index) => (
                  <CommandItem
                    key={agent.id}
                    value={agent.name}
                    onSelect={() => {
                      onAgentSelect(agent);
                      setComboboxOpen(false);
                    }}
                    className="gap-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Image
                        src={agentAvatars.get(agent.name) || ''}
                        alt={`${agent.name} avatar`}
                        width={20}
                        height={20}
                        className="rounded-sm"
                      />
                    </div>
                    <span className="flex-1 truncate">{agent.name}</span>
                    {index < MAX_AGENT_SHORTCUTS && (
                      <span className="text-xs text-muted-foreground">
                        {modifierKey}
                        {index + 1}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateClick();
                    setComboboxOpen(false);
                  }}
                  className="gap-2"
                >
                  <PlusCircleIcon size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Add agent</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </BreadcrumbItem>
  );
}

// ============================================================================
// Skill Breadcrumb Components
// ============================================================================

function NoAgentSelectedSkillBreadcrumb(): ReactElement {
  return (
    <BreadcrumbItem>
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
      >
        <Wrench className="size-5" />
        <span className="truncate font-medium">Select Agent First</span>
      </Button>
    </BreadcrumbItem>
  );
}

function CreateFirstSkillBreadcrumb({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <BreadcrumbItem>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={onClick}
      >
        <Wrench className="size-5" />
        <span className="truncate font-medium">Create your first skill</span>
        <Plus className="size-4" />
      </Button>
    </BreadcrumbItem>
  );
}

function LoadingSkillsBreadcrumb(): ReactElement {
  return (
    <BreadcrumbItem>
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
      >
        <Wrench className="size-5" />
        <span className="truncate font-medium">Loading skills...</span>
      </Button>
    </BreadcrumbItem>
  );
}

function SkillCombobox<T extends { id: string; name: string }>({
  activeSkill,
  skills,
  comboboxOpen,
  setComboboxOpen,
  onSkillSelect,
  onCreateClick,
}: {
  activeSkill: T;
  skills: T[];
  comboboxOpen: boolean;
  setComboboxOpen: (open: boolean) => void;
  onSkillSelect: (skill: T) => void;
  onCreateClick: () => void;
}): ReactElement {
  return (
    <BreadcrumbItem>
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Wrench className="size-5 shrink-0" />
            <span className="truncate font-medium">{activeSkill.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder="Search skills..." className="h-9" />
            <CommandList>
              <CommandEmpty>No skills found.</CommandEmpty>
              <CommandGroup heading="Skills">
                {skills.map((skill) => (
                  <CommandItem
                    key={skill.id}
                    value={skill.name}
                    onSelect={() => {
                      onSkillSelect(skill);
                      setComboboxOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate">{skill.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateClick();
                    setComboboxOpen(false);
                  }}
                  className="gap-2"
                >
                  <PlusCircleIcon size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Add skill</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </BreadcrumbItem>
  );
}

function SkillDropdownBreadcrumb(): ReactElement {
  const { navigationState } = useNavigation();
  const { selectedAgent } = useAgents();
  const { skills, selectedSkill, setQueryParams } = useSkills();
  const router = useRouter();
  const [comboboxOpen, setComboboxOpen] = React.useState(false);

  // Filter skills by selected agent
  React.useEffect(() => {
    if (selectedAgent) {
      setQueryParams({
        agent_id: selectedAgent.id,
        limit: 100,
      });
    }
  }, [selectedAgent, setQueryParams]);

  const handleCreateSkillClick = () => {
    setComboboxOpen(false);
    if (navigationState.selectedAgentName) {
      router.push(
        `/agents/${encodeURIComponent(navigationState.selectedAgentName)}/skills/create`,
      );
    }
  };

  const handleSkillSelect = (skill: (typeof skills)[0]) => {
    // Navigate to skill - NavigationProvider will update selection from URL
    if (navigationState.selectedAgentName) {
      router.push(
        `/agents/${encodeURIComponent(navigationState.selectedAgentName)}/${encodeURIComponent(skill.name)}`,
      );
    }
    setComboboxOpen(false);
  };

  if (!navigationState.selectedAgentName) {
    return <NoAgentSelectedSkillBreadcrumb />;
  }

  if (!selectedSkill && skills.length === 0) {
    return <CreateFirstSkillBreadcrumb onClick={handleCreateSkillClick} />;
  }

  const activeSkill = selectedSkill || skills[0] || null;

  if (!activeSkill) {
    return <LoadingSkillsBreadcrumb />;
  }

  return (
    <SkillCombobox
      activeSkill={activeSkill}
      skills={skills}
      comboboxOpen={comboboxOpen}
      setComboboxOpen={setComboboxOpen}
      onSkillSelect={handleSkillSelect}
      onCreateClick={handleCreateSkillClick}
    />
  );
}

// ============================================================================
// Cluster Breadcrumb Components
// ============================================================================

function ClusterDropdownBreadcrumb(): ReactElement {
  const { navigateToClusterArms } = useNavigation();
  const { clusters, selectedCluster } = useSkillOptimizationClusters();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const [comboboxOpen, setComboboxOpen] = React.useState(false);

  const handleClusterSelect = (cluster: (typeof clusters)[0]) => {
    if (selectedAgent && selectedSkill) {
      navigateToClusterArms(
        selectedAgent.name,
        selectedSkill.name,
        cluster.name,
      );
    }
    setComboboxOpen(false);
  };

  if (!selectedCluster && clusters.length === 0) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
        >
          <Bot className="size-5" />
          <span className="truncate font-medium">No partitions</span>
        </Button>
      </BreadcrumbItem>
    );
  }

  const activeCluster = selectedCluster || clusters[0] || null;

  if (!activeCluster) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
        >
          <Bot className="size-5" />
          <span className="truncate font-medium">Loading...</span>
        </Button>
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem>
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Bot className="size-5" />
            <span className="truncate font-medium">{activeCluster.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder="Search partitions..." className="h-9" />
            <CommandList>
              <CommandEmpty>No partitions found.</CommandEmpty>
              <CommandGroup heading="Partitions">
                {clusters.map((cluster) => (
                  <CommandItem
                    key={cluster.id}
                    value={cluster.name}
                    onSelect={() => handleClusterSelect(cluster)}
                  >
                    <span className="flex-1 truncate">{cluster.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </BreadcrumbItem>
  );
}

// ============================================================================
// Configuration Breadcrumb Components
// ============================================================================

function ArmDropdownBreadcrumb(): ReactElement {
  const { navigateToArmDetail } = useNavigation();
  const { arms, selectedArm } = useSkillOptimizationArms();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const { selectedCluster } = useSkillOptimizationClusters();
  const [comboboxOpen, setComboboxOpen] = React.useState(false);

  const handleArmSelect = (arm: (typeof arms)[0]) => {
    if (selectedAgent && selectedSkill && selectedCluster) {
      navigateToArmDetail(
        selectedAgent.name,
        selectedSkill.name,
        selectedCluster.name,
        arm.name,
      );
    }
    setComboboxOpen(false);
  };

  if (!selectedArm && arms.length === 0) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
        >
          <Bot className="size-5" />
          <span className="truncate font-medium">No configurations</span>
        </Button>
      </BreadcrumbItem>
    );
  }

  const activeArm = selectedArm || arms[0] || null;

  if (!activeArm) {
    return (
      <BreadcrumbItem>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-transparent"
        >
          <Bot className="size-5" />
          <span className="truncate font-medium">Loading...</span>
        </Button>
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem>
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 py-1 px-2 gap-2 justify-start bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Bot className="size-5" />
            <span className="truncate font-medium">{activeArm.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandInput
              placeholder="Search configurations..."
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>No configurations found.</CommandEmpty>
              <CommandGroup heading="Configurations">
                {arms.map((arm) => (
                  <CommandItem
                    key={arm.id}
                    value={arm.name}
                    onSelect={() => handleArmSelect(arm)}
                  >
                    <span className="flex-1 truncate">{arm.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </BreadcrumbItem>
  );
}

function AgentDropdownBreadcrumb(): ReactElement {
  const { agents, selectedAgent, isLoading } = useAgents();
  const router = useRouter();
  const [comboboxOpen, setComboboxOpen] = React.useState(false);

  // Memoize avatar generation to prevent recalculation on every render
  const agentAvatars = useMemo(() => {
    const avatars = new Map<string, string>();
    if (selectedAgent) {
      avatars.set(selectedAgent.name, createAgentAvatar(selectedAgent.name));
    }
    agents.forEach((agent) => {
      if (!avatars.has(agent.name)) {
        avatars.set(agent.name, createAgentAvatar(agent.name));
      }
    });
    return avatars;
  }, [agents, selectedAgent]);

  const handleCreateAgentClick = () => {
    setComboboxOpen(false);
    router.push('/agents/create');
  };

  const handleAgentSelect = (agent: (typeof agents)[0]) => {
    // Navigate to agent - NavigationProvider will update selection from URL
    router.push(`/agents/${encodeURIComponent(agent.name)}`);
    setComboboxOpen(false);
  };

  if (isLoading) {
    return <LoadingAgentsBreadcrumb />;
  }

  if (!selectedAgent) {
    return <CreateFirstAgentBreadcrumb onClick={handleCreateAgentClick} />;
  }

  return (
    <AgentCombobox
      activeAgent={selectedAgent}
      agents={agents}
      agentAvatars={agentAvatars}
      comboboxOpen={comboboxOpen}
      setComboboxOpen={setComboboxOpen}
      onAgentSelect={handleAgentSelect}
      onCreateClick={handleCreateAgentClick}
    />
  );
}

// ============================================================================
// Main Breadcrumb Component
// ============================================================================

function RegularBreadcrumbItem({
  segment,
  isLastItem,
}: {
  segment: BreadcrumbSegment;
  isLastItem: boolean;
}): ReactElement {
  return (
    <BreadcrumbItem className="flex overflow-hidden">
      {isLastItem ? (
        <BreadcrumbPage className="px-2 font-medium">
          {segment.label}
        </BreadcrumbPage>
      ) : (
        <BreadcrumbLink
          href={segment.path}
          className="px-2 font-medium cursor-pointer hover:text-foreground"
        >
          {segment.label}
        </BreadcrumbLink>
      )}
    </BreadcrumbItem>
  );
}

export function BreadcrumbComponent(): ReactElement {
  const { navigationState } = useNavigation();

  return (
    <Breadcrumb>
      <BreadcrumbList className="px-1! h-9 pr-0 gap-0! spacing-x-0! border rounded-md bg-sidebar dark:bg-sidebar overflow-hidden">
        {navigationState.breadcrumbs.map((segment, index) => (
          <React.Fragment
            key={
              segment.path ? `${segment.path}-${index}` : `breadcrumb-${index}`
            }
          >
            {index > 0 && (
              <ChevronRight size={16} className="hidden md:block" />
            )}
            {segment.isAgentDropdown ? (
              <AgentDropdownBreadcrumb />
            ) : segment.isSkillDropdown ? (
              <SkillDropdownBreadcrumb />
            ) : segment.isClusterDropdown ? (
              <ClusterDropdownBreadcrumb />
            ) : segment.isArmDropdown ? (
              <ArmDropdownBreadcrumb />
            ) : (
              <RegularBreadcrumbItem
                segment={segment}
                isLastItem={index === navigationState.breadcrumbs.length - 1}
              />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
