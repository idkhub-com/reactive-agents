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
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkillOptimizationEvaluationRuns } from '@client/providers/skill-optimization-evaluation-runs';
import { useSkills } from '@client/providers/skills';
import { ArrowRightIcon, LayersIcon, RefreshCwIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { ClusterPerformanceChart } from './cluster-performance-chart';

export function ClustersView(): ReactElement {
  const { navigateToClusterArms } = useNavigation();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const goBack = useSmartBack();

  const { clusters, isLoading, error, refetch, setSkillId } =
    useSkillOptimizationClusters();
  const { getEvaluationRunsByClusterId, setSkillId: setEvaluationRunsSkillId } =
    useSkillOptimizationEvaluationRuns();

  // Set skill ID when skill changes
  useEffect(() => {
    if (!selectedSkill) {
      setSkillId(null);
      setEvaluationRunsSkillId(null);
      return;
    }
    setSkillId(selectedSkill.id);
    setEvaluationRunsSkillId(selectedSkill.id);
  }, [selectedSkill, setSkillId, setEvaluationRunsSkillId]);

  // Early return if no skill or agent selected
  if (!selectedSkill || !selectedAgent) {
    return (
      <>
        <PageHeader
          title="Partitions"
          description="No skill selected. Please select a skill to view its partitions."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No skill selected. Please select a skill to view its partitions.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Partitions for ${selectedSkill.name}`}
        description="View optimization partitions for this skill"
        showBackButton={true}
        onBack={goBack}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Partition Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayersIcon className="h-5 w-5" />
              Partition Overview
            </CardTitle>
            <CardDescription>
              Total partitions: {clusters.length}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Partitions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map(() => (
              <Card key={nanoid()}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-destructive mb-4">
                    Failed to load partitions: {error.message}
                  </p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : clusters.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <LayersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No partitions found
                  </h3>
                  <p className="text-muted-foreground">
                    This skill has no optimization partitions yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            clusters.map((cluster) => (
              <Card
                key={cluster.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{cluster.name}</CardTitle>
                  <CardDescription>
                    ID: {cluster.id.slice(0, 8)}...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Requests
                      </span>
                      <Badge variant="secondary">
                        {cluster.total_steps.toString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Dimensions
                      </span>
                      <Badge variant="outline">
                        {cluster.centroid.length}D
                      </Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-2">
                        Performance per Hour
                      </div>
                      <ClusterPerformanceChart
                        evaluationRuns={getEvaluationRunsByClusterId(
                          cluster.id,
                        )}
                      />
                    </div>
                    <div className="pt-3">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          navigateToClusterArms(
                            selectedAgent.name,
                            selectedSkill.name,
                            cluster.name,
                          )
                        }
                      >
                        View Details
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
