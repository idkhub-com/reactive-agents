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
import { PageHeader } from '@client/components/ui/page-header';
import { Skeleton } from '@client/components/ui/skeleton';
import { useDatasets } from '@client/providers/datasets';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useLogs } from '@client/providers/logs';
import { useNavigation } from '@client/providers/navigation';
import {
  ArrowRightIcon,
  DatabaseIcon,
  FileTextIcon,
  MessageSquareIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export function SkillDashboardView(): ReactElement {
  const {
    navigationState,
    navigateToLogs,
    navigateToEvaluations,
    navigateToDatasets,
    navigateToConfigurations,
  } = useNavigation();

  const { selectedSkill, selectedAgent } = navigationState;

  // Use providers
  const {
    evaluationRuns,
    isLoading: isLoadingEvaluations,
    setQueryParams: setEvalQueryParams,
  } = useEvaluationRuns();
  const {
    datasets,
    isLoading: isLoadingDatasets,
    setQueryParams: setDatasetQueryParams,
  } = useDatasets();

  // Logs via provider
  const {
    logs: recentLogs = [],
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
    setQueryParams: setLogsQueryParams,
  } = useLogs();

  // Update evaluation runs query params
  useEffect(() => {
    if (!selectedAgent || !selectedSkill) return;
    setEvalQueryParams({
      agent_id: selectedAgent.id,
      skill_id: selectedSkill.id,
      limit: 100,
      offset: 0,
    });
  }, [selectedAgent, selectedSkill, setEvalQueryParams]);

  // Update datasets query params
  useEffect(() => {
    if (!selectedAgent) return;
    setDatasetQueryParams({
      agent_id: selectedAgent.id,
      limit: 100,
      offset: 0,
    });
  }, [selectedAgent, setDatasetQueryParams]);

  // Update logs query params
  useEffect(() => {
    if (!selectedAgent) return;
    setLogsQueryParams({
      agent_id: selectedAgent.id,
      skill_id: selectedSkill?.id,
      limit: 25,
      offset: 0,
    });
  }, [selectedAgent, selectedSkill, setLogsQueryParams]);

  // Use provider data directly
  const recentEvaluations = evaluationRuns.slice(0, 10);
  const associatedDatasets = datasets.slice(0, 5);

  // Early return if no skill or agent selected - AFTER all hooks
  if (!selectedSkill || !selectedAgent) {
    return (
      <>
        <PageHeader
          title="Skill Dashboard"
          description="No skill selected. Please select a skill to view its dashboard."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No skill selected. Please select a skill to view its dashboard.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={selectedSkill.name}
        description={selectedSkill.description || 'No description available'}
        actions={
          <Button
            onClick={() =>
              navigateToEvaluations(selectedAgent.name, selectedSkill.name)
            }
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Run Evaluation
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Recent Logs Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToLogs(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Recent Logs
                </CardTitle>
                <CardDescription>Last 25 requests</CardDescription>
              </div>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-4 w-full" />
                  ))}
                </div>
              ) : recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No logs available
                </p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate flex-1">
                        {log.function_name || 'N/A'}
                      </span>
                      <Badge
                        variant={
                          log.status >= 200 && log.status < 300
                            ? 'default'
                            : 'destructive'
                        }
                        className="ml-2"
                      >
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                  {recentLogs.length > 5 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        +{recentLogs.length - 5} more
                      </span>
                      <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    refetchLogs();
                  }}
                >
                  <RefreshCwIcon className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRightIcon className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Evaluations Status Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToEvaluations(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Evaluations
                </CardTitle>
                <CardDescription>Recent evaluation runs</CardDescription>
              </div>
              <PlayIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingEvaluations ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-4 w-full" />
                  ))}
                </div>
              ) : recentEvaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No evaluations yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentEvaluations.slice(0, 3).map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate flex-1">{evaluation.name}</span>
                      <Badge
                        variant={
                          evaluation.status === 'completed'
                            ? 'default'
                            : evaluation.status === 'running'
                              ? 'secondary'
                              : evaluation.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                        }
                        className="ml-2"
                      >
                        {evaluation.status}
                      </Badge>
                    </div>
                  ))}
                  {recentEvaluations.length > 3 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        +{recentEvaluations.length - 3} more
                      </span>
                      <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToEvaluations(
                      selectedAgent.name,
                      selectedSkill.name,
                    );
                  }}
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Create
                </Button>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRightIcon className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Associated Datasets Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToDatasets(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Datasets
                </CardTitle>
                <CardDescription>Associated datasets</CardDescription>
              </div>
              <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingDatasets ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-4 w-full" />
                  ))}
                </div>
              ) : associatedDatasets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No datasets available
                </p>
              ) : (
                <div className="space-y-2">
                  {associatedDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate flex-1">{dataset.name}</span>
                      <Badge variant="outline" className="ml-2">
                        Dataset
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" size="sm">
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Create
                </Button>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRightIcon className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Configurations Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToConfigurations(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Configurations
                </CardTitle>
                <CardDescription>
                  AI model and behavior settings
                </CardDescription>
              </div>
              <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Configure AI models, prompts, and parameters for this skill
                </div>
                <div className="text-2xl font-bold">Configure</div>
                <p className="text-xs text-muted-foreground">
                  Set up AI configurations
                </p>
              </div>
              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" size="sm">
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Create
                </Button>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRightIcon className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{recentLogs.length}</div>
              <p className="text-xs text-muted-foreground">Recent requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {evaluationRuns.filter((e) => e.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed evaluations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{datasets.length}</div>
              <p className="text-xs text-muted-foreground">
                Available datasets
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
