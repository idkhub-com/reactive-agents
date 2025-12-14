'use client';

import { StatusBadge } from '@client/components/agents/skills/logs/components/status-badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@client/components/ui/avatar';
import { Badge } from '@client/components/ui/badge';
import { TableCell, TableRow } from '@client/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { AVATAR_SEED } from '@client/constants';
import { useAgents } from '@client/providers/agents';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkills } from '@client/providers/skills';
import { micah } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { PrettyFunctionName } from '@shared/types/api/request/function-name';
import type { Log } from '@shared/types/data';
import { format } from 'date-fns';
import { InfoIcon } from 'lucide-react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useMemo } from 'react';

export function LogRow({ log }: { log: Log }): ReactElement {
  const { navigateToLogDetail } = useNavigation();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const { clusters } = useSkillOptimizationClusters();

  // Function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  // Function to handle log selection
  const handleLogSelect = (): void => {
    if (selectedAgent && selectedSkill) {
      navigateToLogDetail(selectedAgent.name, selectedSkill.name, log.id);
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLogSelect();
    }
  };

  // Get cluster name
  const clusterName = useMemo((): string | null | 'not-found' => {
    if (!log.cluster_id) return null;
    const cluster = clusters.find(
      (c: { id: string; name: string }) => c.id === log.cluster_id,
    );
    return cluster?.name ?? 'not-found';
  }, [log.cluster_id, clusters]);

  // Extract temperature from request body
  const temperature = useMemo(() => {
    const requestBody = log.ai_provider_request_log?.request_body;
    if (
      requestBody &&
      typeof requestBody === 'object' &&
      'temperature' in requestBody
    ) {
      return requestBody.temperature as number;
    }
    return null;
  }, [log.ai_provider_request_log?.request_body]);

  // Extract thinking effort from request body
  const thinkingEffort = useMemo(() => {
    const requestBody = log.ai_provider_request_log?.request_body;
    if (requestBody && typeof requestBody === 'object') {
      // Check for thinking.type (Anthropic extended thinking)
      if (
        'thinking' in requestBody &&
        typeof requestBody.thinking === 'object' &&
        requestBody.thinking !== null &&
        'type' in requestBody.thinking
      ) {
        return requestBody.thinking.type as string;
      }
      // Check for reasoning_effort (OpenAI o1/o3 models)
      if ('reasoning_effort' in requestBody) {
        return requestBody.reasoning_effort as string;
      }
    }
    return null;
  }, [log.ai_provider_request_log?.request_body]);

  return (
    <TableRow
      className="hover:cursor-pointer"
      key={log.id}
      onClick={handleLogSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View log details for ${PrettyFunctionName[log.function_name]}`}
    >
      <TableCell className="w-[96px] text-right">
        <StatusBadge
          log={log}
          score={log.avg_eval_score !== undefined ? log.avg_eval_score : null}
        />
      </TableCell>
      <TableCell className="w-[160px] text-left border-r">
        {formatTimestamp(log.start_time)}
      </TableCell>
      <TableCell>{PrettyFunctionName[log.function_name]}</TableCell>
      <TableCell>{log.model}</TableCell>
      <TableCell>
        {clusterName === null ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : clusterName === 'not-found' ? (
          <span className="text-muted-foreground text-xs">Not found</span>
        ) : (
          <Badge variant="outline" className="font-mono text-xs">
            {clusterName}
          </Badge>
        )}
      </TableCell>
      <TableCell className="w-[80px]">
        {temperature !== null ? (
          <span className="font-mono text-xs">{temperature.toFixed(2)}</span>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3 w-3 text-muted-foreground/50" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Temperature not supported for this model
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell className="w-[100px]">
        {thinkingEffort ? (
          <Badge variant="secondary" className="text-xs">
            {thinkingEffort}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        {(log.external_user_human_name || log.external_user_id) && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 rounded-full border">
              <AvatarImage
                src={`data:image/svg+xml;base64,${Buffer.from(
                  createAvatar(micah, {
                    seed: `${AVATAR_SEED}${log.external_user_human_name ?? log.external_user_id}`,
                    size: 32,
                    backgroundColor: [
                      'FFD1DC',
                      'AEEEEE',
                      'BDFCC9',
                      'E6E6FA',
                      'FFFFCC',
                      'FFE5B4',
                      'D8BFD8',
                      'B0E0E6',
                    ],
                  }).toString(),
                ).toString('base64')}`}
                alt={`User Avatar for ${log.external_user_human_name || log.external_user_id}`}
              />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            {log.external_user_human_name || log.external_user_id}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
