'use client';

import { ManageSkillModelsDialog } from '@client/components/agents/skills/manage-skill-models-dialog';
import { SkillStatusIndicator } from '@client/components/agents/skills/skill-status-indicator';
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
import { useSkillValidation } from '@client/hooks/use-skill-validation';
import { useAgents } from '@client/providers/agents';
import { useLogs } from '@client/providers/logs';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkillOptimizationEvaluationRuns } from '@client/providers/skill-optimization-evaluation-runs';
import { useSkills } from '@client/providers/skills';
import { shapes } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import {
  AlertCircle,
  ArrowRightIcon,
  CheckCircle2,
  CpuIcon,
  Edit,
  FileTextIcon,
  LayersIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { DeleteSkillDialog } from './delete-skill-dialog';
import { ManageSkillEvaluationsDialog } from './manage-skill-evaluations-dialog';
import { SkillPerformanceChart } from './skill-performance-chart';

// ============================================================================
// Utility Functions
// ============================================================================

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

export function SkillDashboardView(): ReactElement {
  const { navigateToLogs, navigateToClusters } = useNavigation();
  const router = useRouter();

  const { selectedAgent } = useAgents();
  const { selectedSkill, deleteSkill } = useSkills();
  const [isManageEvaluationsOpen, setIsManageEvaluationsOpen] = useState(false);
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const [isDeleteSkillDialogOpen, setIsDeleteSkillDialogOpen] = useState(false);

  // Skill validation
  const { isReady, missingRequirements } = useSkillValidation(selectedSkill);

  // Logs via provider
  const {
    logs: recentLogs = [],
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
    setAgentId: setLogsAgentId,
    setSkillId: setLogsSkillId,
  } = useLogs();

  // Models via provider
  const { setSkillId } = useModels();

  // Cluster states via provider
  const {
    clusters: clusterStates,
    isLoading: isLoadingClusterStates,
    setSkillId: setClusterStatesSkillId,
  } = useSkillOptimizationClusters();

  // Skill optimization evaluation runs via provider
  const {
    evaluationRuns: skillEvaluationRuns,
    isLoading: isLoadingSkillEvaluationRuns,
    setSkillId: setSkillEvaluationRunsSkillId,
  } = useSkillOptimizationEvaluationRuns();

  // Update logs agentId and skillId
  useEffect(() => {
    if (selectedAgent && selectedSkill) {
      setLogsAgentId(selectedAgent.id);
      setLogsSkillId(selectedSkill.id);
    } else {
      setLogsAgentId(null);
      setLogsSkillId(null);
    }
  }, [selectedAgent, selectedSkill, setLogsAgentId, setLogsSkillId]);

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

  // Update skill evaluation runs skill ID
  useEffect(() => {
    if (!selectedSkill) {
      setSkillEvaluationRunsSkillId(null);
      return;
    }
    setSkillEvaluationRunsSkillId(selectedSkill.id);
  }, [selectedSkill, setSkillEvaluationRunsSkillId]);

  const handleDeleteSkill = async () => {
    if (!selectedSkill || !selectedAgent) return;
    await deleteSkill(selectedSkill.id);
    router.push(`/agents/${encodeURIComponent(selectedAgent.name)}`);
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
        title={
          <div className="flex items-center gap-2">
            <Image
              src={createSkillAvatar(selectedSkill.name)}
              alt={`${selectedSkill.name} icon`}
              width={20}
              height={20}
              className="h-5 w-5 rounded-sm"
            />
            <span>{selectedSkill.name}</span>
            <SkillStatusIndicator
              skill={selectedSkill}
              variant="badge"
              tooltipSide="bottom"
            />
          </div>
        }
        description={selectedSkill.description || 'No description available'}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsManageModelsOpen(true)}
            >
              <CpuIcon className="h-4 w-4 mr-2" />
              Manage Models
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsManageEvaluationsOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Manage Evaluations
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push(
                  `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}/edit`,
                )
              }
              title="Edit Skill"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteSkillDialogOpen(true)}
              title="Delete Skill"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      {!isReady && (
        <div className="mx-6 mt-6">
          <Card className="bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertCircle className="h-5 w-5 text-orange-800 dark:text-orange-200 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                  Skill Not Ready
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  This skill is missing required components:
                </p>
                <ul className="text-sm text-orange-800 dark:text-orange-200 list-disc pl-5 space-y-1 mb-3">
                  {missingRequirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManageModelsOpen(true)}
                    className="bg-white dark:bg-orange-900 hover:bg-orange-50 dark:hover:bg-orange-800 border-orange-300 dark:border-orange-700"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Add Model
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManageEvaluationsOpen(true)}
                    className="bg-white dark:bg-orange-900 hover:bg-orange-50 dark:hover:bg-orange-800 border-orange-300 dark:border-orange-700"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Add Evaluation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="p-6 space-y-6">
        {/* Performance Chart - Full Width */}
        <Card>
          <CardContent className="pt-6">
            {isLoadingSkillEvaluationRuns ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <SkillPerformanceChart evaluationRuns={skillEvaluationRuns} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
          {/* Partitions Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() =>
              navigateToClusters(selectedAgent.name, selectedSkill.name)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Partitions
                </CardTitle>
                <CardDescription>Optimization partitions</CardDescription>
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
                  No partitions found
                </p>
              ) : (
                <div className="space-y-2">
                  {clusterStates.slice(0, 3).map((cluster) => (
                    <div
                      key={cluster.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate flex-1">{cluster.name}</span>
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
        </div>
      </div>

      {/* Manage Evaluations Dialog */}
      {selectedSkill && (
        <ManageSkillEvaluationsDialog
          open={isManageEvaluationsOpen}
          onOpenChange={setIsManageEvaluationsOpen}
          skillId={selectedSkill.id}
        />
      )}

      {/* Manage Models Dialog */}
      {selectedSkill && (
        <ManageSkillModelsDialog
          open={isManageModelsOpen}
          onOpenChange={setIsManageModelsOpen}
          skillId={selectedSkill.id}
        />
      )}

      {/* Delete Skill Dialog */}
      <DeleteSkillDialog
        skill={selectedSkill || null}
        open={isDeleteSkillDialogOpen}
        onOpenChange={setIsDeleteSkillDialogOpen}
        onConfirm={handleDeleteSkill}
      />
    </>
  );
}
