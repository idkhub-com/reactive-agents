'use client';

import { PrettyFunctionName } from '@shared/types/api/request/function-name';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/components/ui/card';
import { Skeleton } from '@web/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { useAgents } from '@web/providers/agents';
import { useLogs } from '@web/providers/logs';
import { useSkills } from '@web/providers/skills';
import { FileTextIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

/**
 * The agent dashboard's counterpart of the skill dashboard's "Recent
 * requests" card: the agent's latest logs across all of its skills, opening
 * the agent-wide logs page. It wires the logs provider itself, so it only
 * belongs on views that want the agent-wide scope.
 */
export function AgentRecentLogsCard(): ReactElement | null {
  const navigate = usePermissiveNavigate();
  const { selectedAgent } = useAgents();
  const { skills } = useSkills();
  const {
    logs: recentLogs,
    isLoading,
    setAgentId,
    setSkillId,
    setAgentWide,
  } = useLogs();

  useEffect(() => {
    if (selectedAgent) {
      setAgentId(selectedAgent.id);
      setSkillId(null);
      setAgentWide(true);
    } else {
      setAgentId(null);
      setSkillId(null);
      setAgentWide(false);
    }
  }, [selectedAgent, setAgentId, setSkillId, setAgentWide]);

  if (!selectedAgent) {
    return null;
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
      onClick={() =>
        navigate({
          to: `/agents/${encodeURIComponent(selectedAgent.name)}/logs`,
        })
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Logs</CardTitle>
          <CardDescription>Recent requests across all skills</CardDescription>
        </div>
        <FileTextIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-1">
            {Array.from({ length: 5 }).map(() => (
              <Skeleton key={nanoid()} className="h-8 w-full" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No logs available</p>
        ) : (
          <div className="m-4 border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Function</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.slice(0, 5).map((log) => {
                  const skillName = skills.find(
                    (skill) => skill.id === log.skill_id,
                  )?.name;
                  return (
                    <TableRow key={log.id} className="hover:bg-transparent">
                      <TableCell className="font-medium">
                        {PrettyFunctionName[log.function_name] ||
                          log.function_name ||
                          'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.model}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {skillName ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.duration === null
                          ? 'running'
                          : `${log.duration.toFixed(0)}ms`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
