'use client';

import { getAgentEvaluationRuns } from '@client/api/v1/reactive-agents/agents';
import { AgentStatusIndicator } from '@client/components/agents/agent-status-indicator';
import { Badge } from '@client/components/ui/badge';
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
import { botttsNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import type { Agent } from '@shared/types/data';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { AgentPerformanceChart } from './skills/agent-performance-chart';

const createAgentAvatar = (agentName: string) => {
  return `data:image/svg+xml;base64,${Buffer.from(
    createAvatar(botttsNeutral, {
      seed: agentName,
      size: 64,
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

export function AgentsListView(): ReactElement {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { agents, isLoading } = useAgents();

  // Fetch evaluation runs for all agents
  const { data: allEvaluationRuns = [], isLoading: isLoadingEvaluationRuns } =
    useQuery({
      queryKey: ['allAgentEvaluationRuns', agents.map((a) => a.id).join(',')],
      queryFn: async () => {
        if (agents.length === 0) return [];

        // Fetch evaluation runs for all agents in parallel
        const evaluationRunsPromises = agents.map((agent) =>
          getAgentEvaluationRuns(agent.id).catch(() => []),
        );

        const evaluationRunsArrays = await Promise.all(evaluationRunsPromises);

        // Flatten all evaluation runs into a single array
        return evaluationRunsArrays.flat();
      },
      enabled: agents.length > 0,
    });

  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [agents, searchQuery]);

  const handleAgentSelect = (agent: Agent) => {
    router.push(`/agents/${encodeURIComponent(agent.name)}`);
  };

  const handleCreateAgent = () => {
    router.push('/agents/create');
  };

  return (
    <>
      <PageHeader
        title="Agents"
        description="Manage your AI agents"
        showBackButton={false}
        actions={
          <Button onClick={handleCreateAgent}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        {/* Performance Chart - Full Width */}
        <Card>
          <CardContent className="pt-6">
            {isLoadingEvaluationRuns ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <AgentPerformanceChart
                evaluationRuns={allEvaluationRuns}
                title="All Agents Performance Over Time"
              />
            )}
          </CardContent>
        </Card>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No agents match your search criteria.'
                : "You don't have any agents yet."}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateAgent}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create your first agent
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => {
              return (
                <Card
                  key={agent.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                  onClick={() => handleAgentSelect(agent)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Image
                        src={createAgentAvatar(agent.name)}
                        alt={`${agent.name} avatar`}
                        width={48}
                        height={48}
                        className="rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate leading-normal">
                          {agent.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {agent.description || 'No description available'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">Agent</Badge>
                      <AgentStatusIndicator
                        agent={agent}
                        variant="badge"
                        tooltipSide="top"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
