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
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationArms } from '@client/providers/skill-optimization-arms';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkills } from '@client/providers/skills';
import { BoxIcon, RefreshCwIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useCallback, useEffect } from 'react';

export function ClusterArmsView(): ReactElement {
  const { navigateToArmDetail } = useNavigation();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const goBack = useSmartBack();

  const { arms, isLoading, error, refetch, setSkillId, setClusterId } =
    useSkillOptimizationArms();
  const { selectedCluster } = useSkillOptimizationClusters();
  const { skillModels, setSkillId: setModelsSkillId } = useModels();
  const { getAPIKeyById } = useAIProviderAPIKeys();

  const clusterId = selectedCluster?.id;

  // Helper function to get model and provider info for an arm
  const getArmMetadata = useCallback(
    (modelId: string) => {
      const model = skillModels.find((m) => m.id === modelId);
      if (!model) return { modelName: 'Unknown', providerName: 'Unknown' };

      const apiKey = getAPIKeyById(model.ai_provider_id);
      return {
        modelName: model.model_name,
        providerName: apiKey?.ai_provider || 'Unknown',
      };
    },
    [skillModels, getAPIKeyById],
  );

  // Set skill ID and cluster ID when they change
  useEffect(() => {
    if (!selectedSkill) {
      setSkillId(null);
      setModelsSkillId(null);
      return;
    }
    setSkillId(selectedSkill.id);
    setModelsSkillId(selectedSkill.id);
  }, [selectedSkill, setSkillId, setModelsSkillId]);

  useEffect(() => {
    if (!clusterId) {
      setClusterId(null);
      return;
    }
    setClusterId(clusterId);
  }, [clusterId, setClusterId]);

  // Early return if no skill or agent or cluster selected
  if (!selectedSkill || !selectedAgent || !selectedCluster) {
    return (
      <>
        <PageHeader
          title="Partition Configurations"
          description="No partition selected. Please select a partition to view its configurations."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No partition selected. Please select a partition to view its
            configurations.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Configurations for ${selectedCluster?.name || 'Partition'}`}
        description={`View the performance of each configuration in this partition.`}
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
        {/* Partition Info */}
        {selectedCluster && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BoxIcon className="h-5 w-5" />
                Partition Information
              </CardTitle>
              <CardDescription>
                Total requests in this partition:{' '}
                {selectedCluster.total_steps.toString()}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Configurations Grid */}
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
                    Failed to load configurations: {error.message}
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
                  <h3 className="text-lg font-semibold mb-2">
                    No configurations found
                  </h3>
                  <p className="text-muted-foreground">
                    This partition has no optimization configurations yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            arms
              .slice()
              .sort((a, b) => b.stats.mean - a.stats.mean)
              .map((arm, index) => {
                const { modelName, providerName } = getArmMetadata(
                  arm.params.model_id,
                );
                return (
                  <Card
                    key={arm.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() =>
                      selectedAgent &&
                      selectedSkill &&
                      selectedCluster &&
                      navigateToArmDetail(
                        selectedAgent.name,
                        selectedSkill.name,
                        selectedCluster.name,
                        arm.name,
                      )
                    }
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{arm.name}</CardTitle>
                      <CardDescription>
                        Rank: {index + 1} | ID: {arm.id.slice(0, 8)}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-2">
                            Configuration
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Provider
                              </span>
                              <Badge variant="secondary">{providerName}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Model
                              </span>
                              <Badge variant="outline">{modelName}</Badge>
                            </div>
                          </div>
                        </div>

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
                              <span className="text-muted-foreground">
                                Temp
                              </span>
                              <span>
                                {arm.params.temperature_min.toFixed(2)}-
                                {arm.params.temperature_max.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Top P
                              </span>
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
                );
              })
          )}
        </div>
      </div>
    </>
  );
}
