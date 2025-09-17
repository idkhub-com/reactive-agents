'use client';

import { StatusBadge } from '@client/components/agents/skills/logs/components/log-list-view/components/status-badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@client/components/ui/avatar';
import { TableCell, TableRow } from '@client/components/ui/table';
import { AVATAR_SEED } from '@client/constants';
import { useLogs } from '@client/providers/logs';
import { micah } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { PrettyFunctionName } from '@shared/types/api/request/function-name';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { format } from 'date-fns';
import type { KeyboardEvent, ReactElement } from 'react';

export function LogRow({ log }: { log: IdkRequestLog }): ReactElement {
  const { setSelectedLog, setLogsViewOpen } = useLogs();

  // Function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  // Function to handle log selection
  const handleLogSelect = (): void => {
    setSelectedLog(log);
    setLogsViewOpen(true);
  };

  // Handle keyboard interaction
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLogSelect();
    }
  };

  return (
    <TableRow
      className="hover:cursor-pointer"
      key={log.id}
      onClick={handleLogSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`View log details for ${PrettyFunctionName[log.function_name]}`}
    >
      <TableCell className="w-[96px] text-right">
        <StatusBadge log={log} score={null} />
      </TableCell>
      <TableCell className="w-[160px] text-left border-r">
        {formatTimestamp(log.start_time)}
      </TableCell>
      <TableCell>{PrettyFunctionName[log.function_name]}</TableCell>
      <TableCell>{log.model}</TableCell>
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
