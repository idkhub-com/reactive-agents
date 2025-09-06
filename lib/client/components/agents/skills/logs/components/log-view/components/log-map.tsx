'use client';

import { Button } from '@client/components/ui/button';
import { useLogs } from '@client/providers/logs';
import { cn } from '@client/utils/ui/utils';
import { PrettyFunctionName } from '@shared/types/api/request';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

export function LogMap({
  logs,
}: {
  logs: IdkRequestLog[];
}): React.ReactElement {
  const { selectedLog } = useLogs();

  const isCurrentLog = (log: IdkRequestLog): boolean => {
    return log.id === selectedLog?.id;
  };

  return (
    <div className="flex flex-col w-full gap-2 p-2 overflow-hidden overflow-y-auto">
      {logs.map((log) => (
        <Button
          key={log.id}
          className="text-xs font-light w-full justify-start px-2 text-muted-foreground"
          variant="ghost"
          disabled={isCurrentLog(log)}
        >
          <div
            className={cn(
              'shrink-0 border border-green-500 w-3 h-3 rounded-full',
              isCurrentLog(log) && 'bg-green-500',
            )}
          />
          {log.span_name ?? PrettyFunctionName[log.function_name] ?? log.id}
        </Button>
      ))}
    </div>
  );
}
