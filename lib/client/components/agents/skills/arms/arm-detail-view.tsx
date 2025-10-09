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
import { useSkillOptimizationArms } from '@client/providers/skill-optimization-arms';
import { BoxIcon, RefreshCwIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export function ArmDetailView(): ReactElement {
  const { navigationState } = useNavigation();
  const { selectedSkill, selectedAgent, armId, clusterId } = navigationState;
  const goBack = useSmartBack();

  const { arms, isLoading, error, refetch, setSkillId, setClusterId } =
    useSkillOptimizationArms();

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

  // Find the current arm
  const arm = arms.find((a) => a.id === armId);

  // Early return if no skill or agent or armId selected
  if (!selectedSkill || !selectedAgent || !armId) {
    return (
      <>
        <PageHeader
          title="Arm Details"
          description="No arm selected. Please select an arm to view its details."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No arm selected. Please select an arm to view its details.
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Arm Details"
          description="Loading arm details..."
          showBackButton={true}
          onBack={goBack}
        />
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Arm Details"
          description="Failed to load arm details"
          showBackButton={true}
          onBack={goBack}
        />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">
                Failed to load arm details: {error.message}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!arm) {
    return (
      <>
        <PageHeader
          title="Arm Details"
          description="Arm not found"
          showBackButton={true}
          onBack={goBack}
        />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <BoxIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Arm not found</h3>
              <p className="text-muted-foreground">
                The requested arm could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Arm Details"
        description={`ID: ${arm.id.slice(0, 8)}...`}
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
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core identifiers and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Arm ID
                </div>
                <div className="font-mono text-sm">{arm.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Cluster ID
                </div>
                <div className="font-mono text-sm">{arm.cluster_id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Created
                </div>
                <div className="text-sm">
                  {new Date(arm.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Updated
                </div>
                <div className="text-sm">
                  {new Date(arm.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Statistics</CardTitle>
            <CardDescription>
              Multi-armed bandit statistics for this arm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Pulls (n)
                </div>
                <Badge variant="secondary" className="text-lg">
                  {arm.stats.n}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Mean Reward
                </div>
                <Badge variant="outline" className="text-lg">
                  {arm.stats.mean.toFixed(4)}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  N² (Variance)
                </div>
                <Badge variant="outline" className="text-lg">
                  {arm.stats.n2.toFixed(4)}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Total Reward
                </div>
                <Badge variant="outline" className="text-lg">
                  {arm.stats.total_reward.toFixed(4)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Model Parameters</CardTitle>
            <CardDescription>
              Configuration ranges for this optimization arm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Model ID
                </div>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {arm.params.model_id}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">Temperature</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min:</span>
                    <Badge variant="outline">
                      {arm.params.temperature_min.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Max:</span>
                    <Badge variant="outline">
                      {arm.params.temperature_max.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Top P</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min:</span>
                    <Badge variant="outline">
                      {arm.params.top_p_min.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Max:</span>
                    <Badge variant="outline">
                      {arm.params.top_p_max.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Top K</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min:</span>
                    <Badge variant="outline">
                      {arm.params.top_k_min.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Max:</span>
                    <Badge variant="outline">
                      {arm.params.top_k_max.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">
                    Frequency Penalty
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min:</span>
                    <Badge variant="outline">
                      {arm.params.frequency_penalty_min.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Max:</span>
                    <Badge variant="outline">
                      {arm.params.frequency_penalty_max.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">
                    Presence Penalty
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min:</span>
                    <Badge variant="outline">
                      {arm.params.presence_penalty_min.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Max:</span>
                    <Badge variant="outline">
                      {arm.params.presence_penalty_max.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Thinking</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min:</span>
                    <Badge variant="outline">
                      {arm.params.thinking_min.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Max:</span>
                    <Badge variant="outline">
                      {arm.params.thinking_max.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              The system prompt template for this arm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded font-mono text-sm whitespace-pre-wrap break-words">
              {arm.params.system_prompt}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
