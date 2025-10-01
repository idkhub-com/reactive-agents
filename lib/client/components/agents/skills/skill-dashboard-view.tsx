'use client';

import { generateSkillArms } from '@client/api/v1/idk/skills';
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
import { useToast } from '@client/hooks/use-toast';
import { useDatasets } from '@client/providers/datasets';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useLogs } from '@client/providers/logs';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useClusterStates } from '@client/providers/skill-optimization-clusters';
import {
  ArrowRightIcon,
  CpuIcon,
  DatabaseIcon,
  FileTextIcon,
  LayersIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings,
  Wand2Icon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function SkillDashboardView(): ReactElement {
  const {
    navigationState,
    navigateToLogs,
    navigateToEvaluations,
    navigateToDatasets,
    navigateToModels,
    navigateToClusters,
  } = useNavigation();
  const router = useRouter();
  const { toast } = useToast();

  const { selectedSkill, selectedAgent } = navigationState;
  const [isGeneratingArms, setIsGeneratingArms] = useState(false);

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

  // Models via provider
  const { skillModels, isLoadingSkillModels, setSkillId } = useModels();

  // Cluster states via provider
  const {
    clusterStates,
    isLoading: isLoadingClusterStates,
    setSkillId: setClusterStatesSkillId,
  } = useClusterStates();

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

  // Update models query params
  useEffect(() => {
    if (!selectedSkill) {
      setSkillId(null);
      return;
    }
    setSkillId(selectedSkill.id);
  }, [selectedSkill, setSkillId]);

  // Update cluster states skill ID
  useEffect(() => {
    if (!selectedSkill) {
      setClusterStatesSkillId(null);
      return;
    }
    setClusterStatesSkillId(selectedSkill.id);
  }, [selectedSkill, setClusterStatesSkillId]);

  // Use provider data directly
  const recentEvaluations = evaluationRuns.slice(0, 10);
  const associatedDatasets = datasets.slice(0, 5);

  // Handler for generating skill arms
  const handleGenerateArms = async () => {
    if (!selectedSkill) return;

    setIsGeneratingArms(true);
    try {
      const arms = await generateSkillArms(selectedSkill.id);
      toast({
        title: 'Arms generated successfully',
        description: `Generated ${arms.length} optimization arms for ${selectedSkill.name}`,
      });
    } catch (error) {
      console.error('Error generating arms:', error);
      toast({
        title: 'Failed to generate arms',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingArms(false);
    }
  };

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}/edit`,
                )
              }
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Skill
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateArms}
              disabled={isGeneratingArms}
            >
              <Wand2Icon className="h-4 w-4 mr-2" />
              {isGeneratingArms ? 'Generating...' : 'Generate Arms'}
            </Button>
            <Button
              onClick={() =>
                navigateToEvaluations(selectedAgent.name, selectedSkill.name)
              }
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Run Evaluation
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
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

          {/* Models Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToModels(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">Models</CardTitle>
                <CardDescription>Available AI models</CardDescription>
              </div>
              <CpuIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSkillModels ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-4 w-full" />
                  ))}
                </div>
              ) : skillModels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No models configured
                </p>
              ) : (
                <div className="space-y-2">
                  {skillModels.slice(0, 3).map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate flex-1">
                        {model.model_name}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        Model
                      </Badge>
                    </div>
                  ))}
                  {skillModels.length > 3 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        +{skillModels.length - 3} more
                      </span>
                      <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" size="sm">
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Add
                </Button>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRightIcon className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Clusters Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToClusters(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Clusters
                </CardTitle>
                <CardDescription>Optimization clusters</CardDescription>
              </div>
              <LayersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingClusterStates ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map(() => (
                    <Skeleton key={nanoid()} className="h-4 w-full" />
                  ))}
                </div>
              ) : clusterStates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clusters found
                </p>
              ) : (
                <div className="space-y-2">
                  {clusterStates.slice(0, 3).map((cluster, index) => (
                    <div
                      key={cluster.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate flex-1">
                        Cluster {index + 1}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {cluster.total_steps.toString()} reqs
                      </Badge>
                    </div>
                  ))}
                  {clusterStates.length > 3 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        +{clusterStates.length - 3} more
                      </span>
                      <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-4">
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
