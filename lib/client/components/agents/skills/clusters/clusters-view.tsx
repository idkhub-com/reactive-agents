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
import { useNavigation } from '@client/providers/navigation';
import { useClusters } from '@client/providers/skill-optimization-clusters';
import { useSkillOptimizationEvaluationRuns } from '@client/providers/skill-optimization-evaluation-runs';
import { LayersIcon, RefreshCwIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { ClusterPerformanceChart } from './cluster-performance-chart';

export function ClustersView(): ReactElement {
  const { navigationState, navigateToClusterArms } = useNavigation();
  const { selectedSkill, selectedAgent } = navigationState;
  const goBack = useSmartBack();

  const { clusters, isLoading, error, refetch, setSkillId } = useClusters();
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
          title="Clusters"
          description="No skill selected. Please select a skill to view its clusters."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No skill selected. Please select a skill to view its clusters.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Clusters for ${selectedSkill.name}`}
        description="View optimization clusters for this skill"
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
        {/* Cluster Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayersIcon className="h-5 w-5" />
              Cluster Overview
            </CardTitle>
            <CardDescription>Total clusters: {clusters.length}</CardDescription>
          </CardHeader>
        </Card>

        {/* Clusters Grid */}
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
                    Failed to load clusters: {error.message}
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
                    No clusters found
                  </h3>
                  <p className="text-muted-foreground">
                    This skill has no optimization clusters yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            clusters.map((cluster, index) => (
              <Card
                key={cluster.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() =>
                  navigateToClusterArms(
                    selectedAgent.name,
                    selectedSkill.name,
                    cluster.id,
                  )
                }
              >
                <CardHeader>
                  <CardTitle className="text-lg">Cluster {index + 1}</CardTitle>
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
