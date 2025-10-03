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
import { useArms } from '@client/providers/skill-optimization-arms';
import { useClusters } from '@client/providers/skill-optimization-clusters';
import type { SkillOptimizationCluster } from '@shared/types/data/skill-optimization-cluster';
import { BoxIcon, RefreshCwIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export function ClusterArmsView(): ReactElement {
  const { navigationState, navigateToArmDetail } = useNavigation();
  const { selectedSkill, selectedAgent, clusterId } = navigationState;
  const goBack = useSmartBack();

  const { arms, isLoading, error, refetch, setSkillId, setClusterId } =
    useArms();
  const { clusters } = useClusters();

  // Find the current cluster
  const currentCluster = clusters.find(
    (c: SkillOptimizationCluster) => c.id === clusterId,
  );
  const clusterIndex =
    clusters.findIndex((c: SkillOptimizationCluster) => c.id === clusterId) +
      1 || 0;

  // Set skill ID and cluster ID when they change
  useEffect(() => {
    if (!selectedSkill) {
      setSkillId(null);
      return;
    }
    setSkillId(selectedSkill.id);
  }, [selectedSkill, setSkillId]);

  useEffect(() => {
    if (!clusterId) {
      setClusterId(null);
      return;
    }
    setClusterId(clusterId);
  }, [clusterId, setClusterId]);

  // Early return if no skill or agent or cluster selected
  if (!selectedSkill || !selectedAgent || !clusterId) {
    return (
      <>
        <PageHeader
          title="Cluster Arms"
          description="No cluster selected. Please select a cluster to view its arms."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No cluster selected. Please select a cluster to view its arms.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Arms for Cluster ${clusterIndex}`}
        description={`Optimization arms for cluster ${clusterId.slice(0, 8)}...`}
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
        {/* Cluster Info */}
        {currentCluster && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BoxIcon className="h-5 w-5" />
                Cluster Information
              </CardTitle>
              <CardDescription>
                Total requests in this cluster:{' '}
                {currentCluster.total_steps.toString()}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Arms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map(() => (
              <Card key={nanoid()}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-destructive mb-4">
                    Failed to load arms: {error.message}
                  </p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : arms.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6 text-center">
                  <BoxIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No arms found</h3>
                  <p className="text-muted-foreground">
                    This cluster has no optimization arms yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            arms
              .slice()
              .sort((a, b) => b.stats.mean - a.stats.mean)
              .map((arm, index) => (
                <Card
                  key={arm.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() =>
                    navigateToArmDetail(
                      selectedAgent.name,
                      selectedSkill.name,
                      clusterId,
                      arm.id,
                    )
                  }
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Arm #{arm.originalIndex}
                    </CardTitle>
                    <CardDescription>
                      Rank: {index + 1} | ID: {arm.id.slice(0, 8)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Statistics
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Pulls
                            </span>
                            <Badge variant="secondary">{arm.stats.n}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Mean
                            </span>
                            <Badge variant="outline">
                              {arm.stats.mean.toFixed(3)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">
                          Parameters
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Temp</span>
                            <span>
                              {arm.params.temperature_min.toFixed(2)}-
                              {arm.params.temperature_max.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Top P</span>
                            <span>
                              {arm.params.top_p_min.toFixed(2)}-
                              {arm.params.top_p_max.toFixed(2)}
                            </span>
                          </div>
                        </div>
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
