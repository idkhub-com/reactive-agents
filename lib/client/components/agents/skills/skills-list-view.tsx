'use client';

import { getAgentEvaluationRuns } from '@client/api/v1/reactive-agents/agents';
import { AgentStatusIndicator } from '@client/components/agents/agent-status-indicator';
import { DeleteAgentDialog } from '@client/components/agents/delete-agent-dialog';
import { SkillStatusIndicator } from '@client/components/agents/skills/skill-status-indicator';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import { Skeleton } from '@client/components/ui/skeleton';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import type { Skill } from '@shared/types/data';
import { useQuery } from '@tanstack/react-query';
import { Edit, PlusIcon, SearchIcon, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AgentPerformanceChart } from './agent-performance-chart';

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

export function SkillsListView(): ReactElement {
  const { navigateToSkillDashboard } = useNavigation();
  const { selectedAgent, deleteAgent } = useAgents();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const agentAvatar = useMemo(() => {
    if (!selectedAgent) return '';
    return createAgentAvatar(selectedAgent.name);
  }, [selectedAgent]);

  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);

  // Use providers
  const {
    skills,
    isLoading: isLoadingSkills,
    setQueryParams: setSkillQueryParams,
  } = useSkills();

  // Fetch agent-level evaluation runs
  const {
    data: agentEvaluationRuns = [],
    isLoading: isLoadingAgentEvaluationRuns,
  } = useQuery({
    queryKey: ['agentEvaluationRuns', selectedAgent?.id],
    queryFn: () =>
      selectedAgent
        ? getAgentEvaluationRuns(selectedAgent.id)
        : Promise.resolve([]),
    enabled: !!selectedAgent,
  });

  // Update skills query params when agent changes
  useEffect(() => {
    if (!selectedAgent) return;
    setSkillQueryParams({
      agent_id: selectedAgent.id,
      limit: 100,
    });
  }, [selectedAgent, setSkillQueryParams]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery) return skills;
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [skills, searchQuery]);

  const handleSkillSelect = (skill: Skill) => {
    if (selectedAgent) {
      navigateToSkillDashboard(selectedAgent.name, skill.name);
    }
  };

  const handleCreateSkill = () => {
    if (selectedAgent) {
      router.push(
        `/agents/${encodeURIComponent(selectedAgent.name)}/skills/create`,
      );
    }
  };

  const handleEditAgent = () => {
    if (selectedAgent) {
      router.push(`/agents/${encodeURIComponent(selectedAgent.name)}/edit`);
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    await deleteAgent(selectedAgent.id);
    router.push('/agents');
  };

  // Removed automatic redirect to create skill - let users decide when to create

  if (!selectedAgent) {
    return (
      <>
        <PageHeader
          title="Welcome to Agents"
          description="Select an agent from the dropdown above to view its skills and start managing your AI /agents"
          showBackButton={false}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Welcome to Agents</h2>
            <p className="text-muted-foreground mb-4">
              Select an agent from the dropdown above to view its skills and
              start managing your AI /agents.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Image
              src={agentAvatar}
              alt={`${selectedAgent.name} avatar`}
              width={20}
              height={20}
              className="size-5 rounded-sm"
            />
            <span>{selectedAgent.name}</span>
            <AgentStatusIndicator
              agent={selectedAgent}
              variant="badge"
              tooltipSide="bottom"
            />
          </div>
        }
        description={selectedAgent.description || 'No description provided'}
        showBackButton={true}
        onBack={() => router.push('/agents')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditAgent}
              title="Edit Agent"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteAgentDialogOpen(true)}
              title="Delete Agent"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Performance Chart - Full Width */}
        <Card>
          <CardContent className="pt-6">
            {isLoadingAgentEvaluationRuns ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <AgentPerformanceChart evaluationRuns={agentEvaluationRuns} />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleCreateSkill}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Skill
          </Button>
        </div>

        {isLoadingSkills ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map(() => (
              <Card key={nanoid()}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No skills found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No skills match your search criteria.'
                : "This agent doesn't have any skills yet."}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateSkill}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create your first skill
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => {
              return (
                <Card
                  key={skill.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSkillSelect(skill)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span className="truncate leading-normal">
                        {skill.name}
                      </span>
                      <SkillStatusIndicator
                        skill={skill}
                        variant="badge"
                        tooltipSide="left"
                      />
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {skill.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DeleteAgentDialog
        agent={selectedAgent}
        open={isDeleteAgentDialogOpen}
        onOpenChange={setIsDeleteAgentDialogOpen}
        onConfirm={handleDeleteAgent}
      />
    </>
  );
}
