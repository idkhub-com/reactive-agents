'use client';

import { LogRow } from '@client/components/agents/skills/logs/components/log-row';
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import type { Log } from '@shared/types/data';
import type { ReactElement } from 'react';

interface LogListProps {
  logs: Log[];
}

export function LogsList({ logs }: LogListProps): ReactElement {
  return (
    <div className="flex h-full flex-col rounded-md border overflow-hidden">
      <Table className="p-2 border-none">
        {logs.length === 0 && (
          <TableCaption>
            No logs found. Adjust your filters and try again.
          </TableCaption>
        )}
        <TableHeader className="bg-card-header">
          <TableRow>
            <TableHead className="w-[96px] text-right"></TableHead>
            <TableHead className="w-[160px] text-right border-r">
              Time
            </TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>User</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <LogRow key={`${log.id}-${log.start_time}`} log={log} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
