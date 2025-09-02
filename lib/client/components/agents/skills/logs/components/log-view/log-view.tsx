'use client';

import { CompletionViewer } from '@client/components/agents/skills/logs/components/log-view/components/completion-viewer';
import { LogMap } from '@client/components/agents/skills/logs/components/log-view/components/log-map';
import { MessagesView } from '@client/components/agents/skills/logs/components/log-view/components/messages-view';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Separator } from '@client/components/ui/separator';
import { useLogs } from '@client/providers/logs';
import { cn } from '@client/utils/ui/utils';
import type { IdkRequestData } from '@shared/types/api/request/body';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';
import { format } from 'date-fns';
import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LogView(): React.ReactElement {
  const { selectedLog, logsViewOpen, setLogsViewOpen } = useLogs();

  const [idkRequestData, setIdkRequestData] = useState<IdkRequestData | null>(
    null,
  );

  useEffect(() => {
    if (logsViewOpen) {
      const logsView = document.getElementById('logs-view-close-button');
      if (logsView) {
        // Delay until animation is complete
        setTimeout(() => {
          logsView.focus();
        }, 700);
      }
    }
  }, [logsViewOpen]);

  // Function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  useEffect(() => {
    if (selectedLog) {
      const idkRequestData = produceIdkRequestData(
        selectedLog.ai_provider_request_log.method,
        selectedLog.ai_provider_request_log.request_url,
        {},
        selectedLog.ai_provider_request_log.request_body,
        selectedLog.ai_provider_request_log.response_body,
      );

      setIdkRequestData(idkRequestData);
    }
  }, [selectedLog]);

  return (
    <div
      id="log-view"
      className={cn(
        logsViewOpen
          ? 'translate-x-0'
          : 'translate-y-full aria-hidden invisible',
        'z-10 absolute inset-0 p-2 transition-all duration-700 overflow-hidden',
      )}
    >
      <Card
        id="log-view-card"
        className="flex flex-col h-full relative overflow-hidden shadow-xl"
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
          if (e.key === 'Escape') {
            setLogsViewOpen(false);
          }
        }}
      >
        <CardHeader className="flex flex-row justify-between items-center p-2 bg-card-header">
          <CardTitle className="text-sm font-light m-0 pl-2 flex flex-row items-center gap-2">
            <span className="text-sm font-light">
              {formatTimestamp(selectedLog?.start_time ?? 0)}
            </span>
            {selectedLog?.span_name && (
              <>
                <Separator orientation="vertical" />
                <span className="text-xs font-light">
                  {selectedLog.span_name}
                </span>
              </>
            )}
          </CardTitle>
          <div className="flex flex-row justify-end shrink-0">
            <Button
              id="log-view-close-button"
              className="invert-0 hover:invert-100"
              onClick={(): void => setLogsViewOpen(false)}
              variant="ghost"
              size="icon"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-row p-0 h-full relative border-t overflow-hidden">
          <div className="flex h-full w-[200px] border-r">
            <LogMap logs={selectedLog ? [selectedLog] : []} />
          </div>
          <div className="inset-0 flex flex-col flex-1 w-full p-2 gap-2 overflow-hidden overflow-y-auto">
            {selectedLog && idkRequestData && (
              <MessagesView
                logId={selectedLog.id}
                idkRequestData={idkRequestData}
              />
            )}
            {selectedLog &&
              idkRequestData &&
              ('choices' in selectedLog.ai_provider_request_log.response_body ||
                'output' in
                  selectedLog.ai_provider_request_log.response_body) && (
                <CompletionViewer
                  logId={selectedLog.id}
                  idkRequestData={idkRequestData}
                />
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
