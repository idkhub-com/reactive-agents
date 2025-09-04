import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { Skeleton } from '@client/components/ui/skeleton';
import { getHttpMethodColor } from '@client/utils/http-method-colors';
import type { Log } from '@shared/types/data';
import { Code, MoreVertical, Trash2 } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface LogsListProps {
  logs: Log[];
  datasetId: string;
  isLoading?: boolean;
  onLogsDeleted?: () => void;
  onDeleteLog?: (log: Log) => void;
}

function LogsListComponent({
  logs,
  datasetId: _datasetId,
  isLoading,
  onLogsDeleted: _onLogsDeleted,
  onDeleteLog,
}: LogsListProps): React.ReactElement {
  const logsRef = useRef<Log[]>(logs);
  const isMountedRef = useRef(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [logToView, setLogToView] = useState<Log | null>(null);

  // Update ref when logs changes
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true; // Ensure it's set to true on mount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDeleteClick = useCallback(
    (log: Log) => {
      onDeleteLog?.(log);
    },
    [onDeleteLog],
  );

  const handleViewClick = useCallback((log: Log) => {
    if (!isMountedRef.current) return;

    // Set the log to view in the dialog
    setLogToView(log);
    setViewDialogOpen(true);
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    try {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (_error) {
      return 'Invalid date';
    }
  }, []);

  // Loading skeleton component
  const skeletonKeys = ['req', 'res', 'meta'] as const;
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {skeletonKeys.map((key) => (
        <Card key={key} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="shrink-0 mt-1">
                <Skeleton className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center gap-4 text-sm mb-2">
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <div className="space-y-4">
        {logs.map((log) => (
          <Card
            key={log.id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={(e) => {
              e.stopPropagation();
              handleViewClick(log);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="shrink-0 mt-1">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={getHttpMethodColor(log.method)}>
                        {log.method}
                      </Badge>
                      <span className="font-medium text-sm truncate">
                        {log.endpoint}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>Function: {log.function_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Started {formatDate(log.start_time)}</span>
                      {Object.keys(log.metadata).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(log.metadata).length} metadata
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(log);
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Log
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Log Details
            </DialogTitle>
            <DialogDescription>
              {logToView && `${logToView.method} ${logToView.endpoint}`}
            </DialogDescription>
            {logToView && (
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getHttpMethodColor(logToView.method)}>
                  {logToView.method}
                </Badge>
                <span>{logToView.endpoint}</span>
              </div>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {logToView && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">AI Provider Request Log</h4>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(
                          logToView.ai_provider_request_log,
                          null,
                          2,
                        )}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                {Object.keys(logToView.metadata).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Metadata</h4>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-sm overflow-auto">
                          {JSON.stringify(logToView.metadata, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Function Name:</span>
                        <span>{logToView.function_name}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-medium">Started:</span>
                        <span>{formatDate(logToView.start_time)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const LogsList = memo(LogsListComponent);
