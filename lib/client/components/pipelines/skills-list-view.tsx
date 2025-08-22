'use client';

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
import { useDatasets } from '@client/providers/datasets';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useLogs } from '@client/providers/logs';
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import type { Skill } from '@shared/types/data';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

interface SkillStats {
  skillId: string;
  logsCount: number;
  evaluationsCount: number;
  datasetsCount: number;
}

export function SkillsListView(): ReactElement {
  const { navigationState, navigateToSkillDashboard } = useNavigation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Use providers
  const {
    skills,
    isLoading: isLoadingSkills,
    setQueryParams: setSkillQueryParams,
  } = useSkills();
  const { evaluationRuns, setQueryParams: setEvaluationQueryParams } =
    useEvaluationRuns();
  const { datasets, setQueryParams: setDatasetQueryParams } = useDatasets();

  const [skillStats, setSkillStats] = useState<SkillStats[]>([]);
  const [logsBySkill, setLogsBySkill] = useState<Record<string, number>>({});

  // Update skills query params when agent changes
  useEffect(() => {
    if (!navigationState.selectedAgent) return;
    setSkillQueryParams({
      agent_id: navigationState.selectedAgent.id,
      limit: 100,
    });
  }, [navigationState.selectedAgent, setSkillQueryParams]);

  // Ensure evaluations and datasets providers filter by the selected agent
  useEffect(() => {
    if (!navigationState.selectedAgent) return;
    const agentId = navigationState.selectedAgent.id;
    setEvaluationQueryParams({ agent_id: agentId, limit: 100, offset: 0 });
    setDatasetQueryParams({ agent_id: agentId, limit: 100, offset: 0 });
  }, [
    navigationState.selectedAgent,
    setEvaluationQueryParams,
    setDatasetQueryParams,
  ]);

  // Fetch a recent slice of agent logs via Logs provider and group by skill_id
  const { logs: recentAgentLogs = [], setQueryParams: setLogsQueryParams } =
    useLogs();

  useEffect(() => {
    if (!navigationState.selectedAgent) return;
    setLogsQueryParams({
      agent_id: navigationState.selectedAgent.id,
      limit: 200,
      offset: 0,
    });
  }, [navigationState.selectedAgent, setLogsQueryParams]);

  useEffect(() => {
    const grouped: Record<string, number> = {};
    for (const log of recentAgentLogs) {
      grouped[log.skill_id] = (grouped[log.skill_id] || 0) + 1;
    }
    setLogsBySkill(grouped);
  }, [recentAgentLogs]);

  // Calculate stats for skills using provider data and grouped recent logs
  useEffect(() => {
    if (!navigationState.selectedAgent || skills.length === 0) {
      setSkillStats([]);
      return;
    }

    // Calculate stats synchronously using available provider data
    const stats = skills.map((skill) => ({
      skillId: skill.id,
      // Use recent agent logs grouped by skill_id (approximate, not total)
      logsCount: logsBySkill[skill.id] || 0,
      evaluationsCount: evaluationRuns.length, // Use provider data
      datasetsCount: datasets.length, // Use provider data
    }));

    setSkillStats(stats);
  }, [
    skills,
    evaluationRuns.length,
    datasets.length,
    navigationState.selectedAgent,
    logsBySkill,
  ]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery) return skills;
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [skills, searchQuery]);

  const getSkillStats = (skillId: string): SkillStats => {
    return (
      skillStats.find((stats) => stats.skillId === skillId) || {
        skillId,
        logsCount: 0,
        evaluationsCount: 0,
        datasetsCount: 0,
      }
    );
  };

  const handleSkillSelect = (skill: Skill) => {
    if (navigationState.selectedAgent) {
      navigateToSkillDashboard(navigationState.selectedAgent.name, skill.name);
    }
  };

  const handleCreateSkill = () => {
    if (navigationState.selectedAgent) {
      router.push(
        `/pipelines/${encodeURIComponent(navigationState.selectedAgent.name)}/skills/create`,
      );
    }
  };

  if (!navigationState.selectedAgent) {
    return (
      <>
        <PageHeader
          title="Welcome to Pipelines"
          description="Select an agent from the dropdown above to view its skills and start managing your AI pipelines"
          showBackButton={false}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              Welcome to Pipelines
            </h2>
            <p className="text-muted-foreground mb-4">
              Select an agent from the dropdown above to view its skills and
              start managing your AI pipelines.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Skills"
        description={`Manage skills for ${navigationState.selectedAgent.name}`}
        showBackButton={false}
        actions={
          <Button onClick={handleCreateSkill}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Skill
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
              const stats = getSkillStats(skill.id);
              return (
                <Card
                  key={skill.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSkillSelect(skill)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="truncate">{skill.name}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {skill.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{stats.logsCount} logs</Badge>
                      <Badge variant="secondary">
                        {stats.evaluationsCount} evaluations
                      </Badge>
                      <Badge variant="secondary">
                        {stats.datasetsCount} datasets
                      </Badge>
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
