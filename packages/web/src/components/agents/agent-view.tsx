'use client';

import { getAgentEvaluationScoresByTimeBucket } from '@client/api/v1/reactive-agents/agents';
import { getSkillEvents } from '@client/api/v1/reactive-agents/skill-events';
import { getSkillEvaluationScoresByTimeBucket } from '@client/api/v1/reactive-agents/skills';
import { AgentPerformanceChart } from '@client/components/agents/agent-performance-chart';
import { AgentStatusIndicator } from '@client/components/agents/agent-status-indicator';
import { DeleteAgentDialog } from '@client/components/agents/delete-agent-dialog';
import { SkillPerformanceChart } from '@client/components/agents/skills/skill-performance-chart';
import { SkillStatusIndicator } from '@client/components/agents/skills/skill-status-indicator';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { DateTimePicker } from '@client/components/ui/date-time-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import { Skeleton } from '@client/components/ui/skeleton';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@client/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import { botttsNeutral, shapes } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import type { Skill } from '@shared/types/data';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3Icon,
  Clock,
  Edit,
  MoreVertical,
  PlusIcon,
  SearchIcon,
  Trash2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

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

const createSkillAvatar = (skillName: string) => {
  return `data:image/svg+xml;base64,${Buffer.from(
    createAvatar(shapes, {
      seed: skillName,
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

export function AgentView(): ReactElement {
  const { navigateToSkillDashboard } = useNavigation();
  const { selectedAgent, deleteAgent } = useAgents();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const agentAvatar = useMemo(() => {
    if (!selectedAgent) return '';
    return createAgentAvatar(selectedAgent.name);
  }, [selectedAgent]);

  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);

  // Time interval controls for chart (30 buckets fixed)
  type TimeInterval = '1min' | '5min' | '15min' | '1hour' | '6hour' | '24hour';
  const BUCKETS = 30; // Fixed number of buckets
  const INTERVAL_CONFIG = {
    '1min': { label: '1 Min', minutes: 1, hours: (BUCKETS * 1) / 60 },
    '5min': { label: '5 Min', minutes: 5, hours: (BUCKETS * 5) / 60 },
    '15min': { label: '15 Min', minutes: 15, hours: (BUCKETS * 15) / 60 },
    '1hour': { label: '1 Hour', minutes: 60, hours: (BUCKETS * 60) / 60 },
    '6hour': { label: '6 Hours', minutes: 360, hours: (BUCKETS * 360) / 60 },
    '24hour': { label: '1 Day', minutes: 1440, hours: (BUCKETS * 1440) / 60 },
  } as const;

  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>(() => {
    if (typeof window === 'undefined') return '1hour';
    try {
      const stored = localStorage.getItem('agent-performance-interval');
      if (stored && stored in INTERVAL_CONFIG) {
        return stored as TimeInterval;
      }
    } catch {
      // localStorage not available
    }
    return '1hour';
  });

  // Save interval preference
  useEffect(() => {
    try {
      localStorage.setItem('agent-performance-interval', selectedInterval);
    } catch {
      // localStorage not available
    }
  }, [selectedInterval]);

  // End time for charts (defaults to now)
  const [endTime, setEndTime] = useState<Date>(() => new Date());

  // Use providers
  const {
    skills,
    isLoading: isLoadingSkills,
    setQueryParams: setSkillQueryParams,
  } = useSkills();

  // Update skills query params when agent changes
  useEffect(() => {
    if (!selectedAgent) return;
    setSkillQueryParams({
      agent_id: selectedAgent.id,
      limit: 100,
    });
  }, [selectedAgent, setSkillQueryParams]);

  // Fetch agent-level evaluation scores by time bucket
  const {
    data: agentEvaluationScores = [],
    isLoading: isLoadingAgentEvaluationScores,
  } = useQuery({
    queryKey: [
      'agentEvaluationScores',
      selectedAgent?.id,
      selectedInterval,
      INTERVAL_CONFIG[selectedInterval].hours,
      endTime.toISOString(),
    ],
    queryFn: async () => {
      if (!selectedAgent) return [];
      const scores = await getAgentEvaluationScoresByTimeBucket(
        selectedAgent.id,
        {
          interval_minutes: INTERVAL_CONFIG[selectedInterval].minutes,
          start_time: new Date(
            endTime.getTime() -
              INTERVAL_CONFIG[selectedInterval].hours * 60 * 60 * 1000,
          ).toISOString(),
          end_time: endTime.toISOString(),
        },
      );
      return scores;
    },
    enabled: !!selectedAgent,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch agent-level skill events
  const { data: agentEvents = [] } = useQuery({
    queryKey: ['agentEvents', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent) return [];
      return await getSkillEvents({ agent_id: selectedAgent.id });
    },
    enabled: !!selectedAgent,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch skill-level evaluation scores for all skills (small charts)
  const {
    data: skillEvaluationScores = {},
    isLoading: isLoadingSkillEvaluationScores,
  } = useQuery({
    queryKey: [
      'skillEvaluationScores',
      selectedAgent?.id,
      skills.map((s) => s.id).join(','),
      endTime.toISOString(),
    ],
    queryFn: async () => {
      if (!selectedAgent || skills.length === 0) return {};

      // Fetch scores for all skills in parallel (30 buckets at 5 min intervals = 2.5 hours)
      const scoresPromises = skills.map(async (skill) => {
        const scores = await getSkillEvaluationScoresByTimeBucket(skill.id, {
          interval_minutes: 5, // 5 min intervals
          start_time: new Date(
            endTime.getTime() - 2.5 * 60 * 60 * 1000,
          ).toISOString(), // Last 2.5 hours (30 buckets)
          end_time: endTime.toISOString(),
        }).catch(() => []);
        return [skill.id, scores] as const;
      });

      const scoresArray = await Promise.all(scoresPromises);
      return Object.fromEntries(scoresArray);
    },
    enabled: !!selectedAgent && skills.length > 0,
    refetchInterval: 60000, // Refetch every minute
  });

  const filteredSkills = useMemo(() => {
    const filtered = searchQuery
      ? skills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            skill.description
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()),
        )
      : skills;

    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="More options">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditAgent}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Agent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteAgentDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="p-6 space-y-6">
        {/* Agent Performance Chart */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3Icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Agent Performance</CardTitle>
            </div>
            <CardDescription className="mb-4">
              Performance metrics across all skills for this agent
            </CardDescription>
            <div className="flex justify-between items-start gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <DateTimePicker
                          date={endTime}
                          onDateChange={setEndTime}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>
                        Select the end time for the chart (rightmost data point)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEndTime(new Date())}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Jump to current time</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroup
                    type="single"
                    value={selectedInterval}
                    onValueChange={(value) => {
                      if (value) setSelectedInterval(value as TimeInterval);
                    }}
                    size="sm"
                    className="border rounded-lg gap-0 overflow-hidden"
                  >
                    {(Object.keys(INTERVAL_CONFIG) as TimeInterval[]).map(
                      (interval) => (
                        <ToggleGroupItem
                          key={interval}
                          value={interval}
                          aria-label={`Toggle ${INTERVAL_CONFIG[interval].label} interval`}
                          className="text-xs rounded-none"
                        >
                          {INTERVAL_CONFIG[interval].label}
                        </ToggleGroupItem>
                      ),
                    )}
                  </ToggleGroup>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Select time interval for chart buckets</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAgentEvaluationScores ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <AgentPerformanceChart
                evaluationScores={agentEvaluationScores}
                events={agentEvents}
                skills={skills}
                intervalMinutes={INTERVAL_CONFIG[selectedInterval].minutes}
                windowHours={INTERVAL_CONFIG[selectedInterval].hours}
                endTime={endTime}
              />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map(() => (
              <Card key={nanoid()}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
            {filteredSkills.map((skill) => {
              return (
                <Card
                  key={skill.id}
                  className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
                  onClick={() => handleSkillSelect(skill)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Image
                          src={createSkillAvatar(skill.name)}
                          alt={`${skill.name} icon`}
                          width={24}
                          height={24}
                          className="size-6 rounded-sm shrink-0"
                        />
                        <CardTitle className="text-base truncate leading-normal">
                          {skill.name}
                        </CardTitle>
                      </div>
                      <SkillStatusIndicator
                        skill={skill}
                        variant="badge"
                        tooltipSide="left"
                      />
                    </div>
                    <CardDescription className="line-clamp-2 text-sm">
                      {skill.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-2">
                        Performance
                      </div>
                      {isLoadingSkillEvaluationScores ? (
                        <Skeleton className="h-32 w-full" />
                      ) : (
                        <SkillPerformanceChart
                          evaluationScores={
                            skillEvaluationScores[skill.id] || []
                          }
                          size="small"
                          intervalMinutes={5}
                          windowHours={2.5}
                          endTime={endTime}
                        />
                      )}
                    </div>
                  </CardContent>
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
