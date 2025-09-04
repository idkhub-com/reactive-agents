import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Skeleton } from '@client/components/ui/skeleton';
import type { Log } from '@shared/types/data';
import { FileText, Plus, RotateCcw, Search } from 'lucide-react';
import { LogsList } from './dataset-logs-list';

interface LogsSectionProps {
  logs: Log[];
  filteredLogs: Log[] | undefined;
  isLoading: boolean;
  searchQuery: string;
  datasetId: string;
  onSearchChange: (query: string) => void;
  onAddLogs: () => void;
  onReset: () => void;
  onDeleteLog: (log: Log) => void;
}

export function LogsSection({
  logs,
  filteredLogs,
  isLoading,
  searchQuery,
  datasetId,
  onSearchChange,
  onAddLogs,
  onReset,
  onDeleteLog,
}: LogsSectionProps): React.ReactElement {
  const showSearchEmptyState =
    !isLoading &&
    filteredLogs?.length === 0 &&
    logs.length > 0 &&
    searchQuery.trim() !== '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Logs</h4>
            <p className="text-sm text-muted-foreground">
              Evaluation logs in this dataset
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAddLogs}>
              <Plus className="mr-2 h-4 w-4" />
              Add Logs
            </Button>
            <Button variant="outline" onClick={onReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showSearchEmptyState && (
          <div className="flex justify-center py-8">
            <Card className="max-w-md">
              <CardContent className="flex flex-col space-y-1.5 p-6 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold leading-none tracking-tight">
                  No logs found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search criteria
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="flex justify-center py-8">
            <Card className="max-w-md">
              <CardContent className="flex flex-col space-y-1.5 p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold leading-none tracking-tight">
                  No logs yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add logs to start building your dataset
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && filteredLogs && filteredLogs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredLogs.length} of {logs.length} logs
              </span>
            </div>

            <LogsList
              logs={filteredLogs}
              datasetId={datasetId}
              isLoading={false}
              onDeleteLog={onDeleteLog}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
