'use client';

import type { Log } from '@shared/types/data';
import { LogsTableView } from '@web/components/agents/logs-table-view';
import { Badge } from '@web/components/ui/badge';
import { useSmartBack } from '@web/hooks/use-smart-back';
import { useAgents } from '@web/providers/agents';
import { useLogs } from '@web/providers/logs';
import { useNavigation } from '@web/providers/navigation';
import { useSkillOptimizationClusters } from '@web/providers/skill-optimization-clusters';
import { useSkills } from '@web/providers/skills';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

/** The logs of one skill: the shared table with a partition column. */
export function LogsView(): ReactElement {
  const { navigateToLogDetail } = useNavigation();
  const smartBack = useSmartBack();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const { clusters, setSkillId: setClustersSkillId } =
    useSkillOptimizationClusters();
  const { setAgentId, setSkillId, setAgentWide } = useLogs();

  // Set agentId and skillId when agent/skill changes
  useEffect(() => {
    setAgentWide(false);
    if (selectedAgent && selectedSkill) {
      setAgentId(selectedAgent.id);
      setSkillId(selectedSkill.id);
      setClustersSkillId(selectedSkill.id);
    } else {
      setAgentId(null);
      setSkillId(null);
      setClustersSkillId(null);
    }
  }, [
    selectedAgent,
    selectedSkill,
    setAgentId,
    setSkillId,
    setAgentWide,
    setClustersSkillId,
  ]);

  // Early return if no skill or agent selected - AFTER all hooks
  if (!selectedSkill || !selectedAgent) {
    return <div>No skill selected</div>;
  }

  const getClusterName = (log: Log): string | null | 'not-found' => {
    if (!log.cluster_id) return null;
    const cluster = clusters.find((c) => c.id === log.cluster_id);
    return cluster?.name ?? 'not-found';
  };

  const renderPartition = (log: Log) => {
    const clusterName = getClusterName(log);
    if (clusterName === null) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    if (clusterName === 'not-found') {
      return <span className="text-muted-foreground text-xs">Not found</span>;
    }
    return (
      <Badge variant="outline" className="font-mono text-xs">
        {clusterName}
      </Badge>
    );
  };

  return (
    <LogsTableView
      description={`Request logs for ${selectedSkill.name}`}
      emptyText="No logs available for this skill yet."
      onBack={() =>
        smartBack(
          `/agents/${encodeURIComponent(selectedAgent.name)}/skills/${encodeURIComponent(selectedSkill.name)}`,
        )
      }
      onLogClick={(log) =>
        navigateToLogDetail(selectedAgent.name, selectedSkill.name, log.id)
      }
      extraColumn={{ header: 'Partition', render: renderPartition }}
    />
  );
}
