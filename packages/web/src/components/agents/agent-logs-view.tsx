'use client';

import type { Log } from '@shared/types/data';
import { LogsTableView } from '@web/components/agents/logs-table-view';
import { Badge } from '@web/components/ui/badge';
import { useSmartBack } from '@web/hooks/use-smart-back';
import { useAgents } from '@web/providers/agents';
import { useLogs } from '@web/providers/logs';
import { useNavigation } from '@web/providers/navigation';
import { useSkills } from '@web/providers/skills';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

/**
 * Every request log of the agent, across all of its skills: the shared
 * table with a skill column. A row still opens the skill-scoped log detail
 * -- the skill name is resolved from the agent's skills list.
 */
export function AgentLogsView(): ReactElement {
  const { navigateToLogDetail } = useNavigation();
  const smartBack = useSmartBack();
  const { selectedAgent } = useAgents();
  const { skills, setQueryParams: setSkillQueryParams } = useSkills();
  const { setAgentId, setSkillId, setAgentWide } = useLogs();

  // Fetch agent-wide: all skills, no skill filter on the logs query
  useEffect(() => {
    if (selectedAgent) {
      setAgentId(selectedAgent.id);
      setSkillId(null);
      setAgentWide(true);
      setSkillQueryParams({ agent_id: selectedAgent.id, limit: 100 });
    } else {
      setAgentId(null);
      setSkillId(null);
      setAgentWide(false);
    }
  }, [
    selectedAgent,
    setAgentId,
    setSkillId,
    setAgentWide,
    setSkillQueryParams,
  ]);

  if (!selectedAgent) {
    return <div>No agent selected</div>;
  }

  const getSkillName = (log: Log): string | null =>
    skills.find((skill) => skill.id === log.skill_id)?.name ?? null;

  const renderSkill = (log: Log) => {
    const skillName = getSkillName(log);
    if (!skillName) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    return (
      <Badge variant="outline" className="text-xs">
        {skillName}
      </Badge>
    );
  };

  return (
    <LogsTableView
      description={`Request logs across all skills for ${selectedAgent.name}`}
      emptyText="No logs available for this agent yet."
      onBack={() =>
        smartBack(`/agents/${encodeURIComponent(selectedAgent.name)}`)
      }
      onLogClick={(log) => {
        // The detail route lives under the skill; without a resolved name
        // there is nowhere to go, and the skills list covers every skill
        // the agent has, so this only skips while it is still loading.
        const skillName = getSkillName(log);
        if (skillName) {
          navigateToLogDetail(selectedAgent.name, skillName, log.id);
        }
      }}
      extraColumn={{ header: 'Skill', render: renderSkill }}
    />
  );
}
