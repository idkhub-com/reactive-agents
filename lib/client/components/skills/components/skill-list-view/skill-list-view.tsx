'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useAgents } from '@client/providers/agents';
import { useSkills } from '@client/providers/skills';
import type { Skill } from '@shared/types/data';
import { Plus, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SkillsList } from './components/skill-list';

export function SkillListView(): React.ReactElement {
  const { agents, selectedAgent, isLoading: agentsLoading } = useAgents();
  const router = useRouter();
  const { skills, isLoading, queryParams, setQueryParams } = useSkills();
  const [visibleSkills, setVisibleSkills] = useState<Skill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');

  // Set the agent filter to the selected agent on mount
  useEffect(() => {
    if (selectedAgent) {
      setSelectedAgentFilter(selectedAgent.id);
    } else {
      setSelectedAgentFilter('all');
    }
  }, [selectedAgent]);

  // Filter skills based on search term and agent filter
  useEffect(() => {
    let filtered = skills;

    if (selectedAgentFilter && selectedAgentFilter !== 'all') {
      filtered = filtered.filter(
        (skill) => skill.agent_id === selectedAgentFilter,
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          skill.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setVisibleSkills(filtered);
  }, [skills, searchTerm, selectedAgentFilter]);

  // Update query params when agent filter changes
  useEffect(() => {
    // Only update if different to avoid infinite loop
    const newAgentId =
      selectedAgentFilter === 'all' ? undefined : selectedAgentFilter;
    if (queryParams.agent_id !== newAgentId) {
      setQueryParams({
        ...queryParams,
        agent_id: newAgentId,
      });
    }
  }, [selectedAgentFilter, setQueryParams, queryParams]);

  const handleCreateSkill = () => {
    router.push('/skills/create');
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedAgentFilter('all');
  };

  const getAgentName = (agentId: string): string => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  return (
    <div className="p-2 shrink-0 w-full h-full overflow-hidden transition-all duration-800">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>
            Skills{selectedAgent ? ` - ${selectedAgent.name}` : ''}
          </CardTitle>
          <CardDescription>
            {selectedAgent
              ? `Manage skills for the ${selectedAgent.name} agent`
              : 'Manage AI skills and their configurations across agents'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col overflow-hidden p-2">
          <div className="flex flex-col md:flex-row gap-2 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e): void => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="w-full md:w-48">
              <Select
                value={selectedAgentFilter}
                onValueChange={setSelectedAgentFilter}
                disabled={agentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by agent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agentsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading agents...
                    </SelectItem>
                  ) : (
                    agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleCreateSkill}>
                <Plus className="mr-2 h-4 w-4" />
                Create Skill
              </Button>

              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <Wrench className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading skills...
                </p>
              </div>
            </div>
          ) : visibleSkills.length === 0 ? (
            <div className="flex justify-center py-8">
              <Card className="max-w-md">
                <CardHeader className="text-center">
                  <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                  <CardTitle>
                    {searchTerm
                      ? 'No skills found'
                      : selectedAgent
                        ? `No skills for ${selectedAgent.name}`
                        : 'No skills yet'}
                  </CardTitle>
                  <CardDescription>
                    {searchTerm
                      ? 'Try adjusting your search criteria'
                      : selectedAgent
                        ? `Create the first skill for ${selectedAgent.name} to extend its capabilities.`
                        : 'Create your first skill to extend agent capabilities.'}
                  </CardDescription>
                </CardHeader>
                {!searchTerm && selectedAgent && (
                  <CardContent className="flex justify-center">
                    <Button onClick={handleCreateSkill}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Skill
                    </Button>
                  </CardContent>
                )}
              </Card>
            </div>
          ) : (
            <SkillsList skills={visibleSkills} getAgentName={getAgentName} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
