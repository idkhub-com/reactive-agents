import { Badge } from '@client/components/ui/badge';
import { Card, CardContent } from '@client/components/ui/card';
import { Checkbox } from '@client/components/ui/checkbox';
import { Skeleton } from '@client/components/ui/skeleton';
import { getHttpMethodColor } from '@client/utils/http-method-colors';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { Code, FileText } from 'lucide-react';

interface LogsListProps {
  filteredLogs: IdkRequestLog[] | undefined;
  selectedLogs: Set<string>;
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  onLogToggle: (logId: string) => void;
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
  if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
  if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
  if (status >= 500) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function formatDate(date: string | number): string {
  return new Date(date).toLocaleString();
}

export function LogsList({
  filteredLogs,
  selectedLogs,
  isLoading,
  error,
  searchQuery,
  onLogToggle,
}: LogsListProps): React.ReactElement {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg p-2">
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h3 className="text-lg font-medium">Error loading logs</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message}
            </p>
          </div>
        </div>
      )}

      {!isLoading && filteredLogs?.length === 0 && (
        <div className="flex justify-center py-8">
          <Card className="max-w-md">
            <CardContent className="flex flex-col space-y-1.5 p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold leading-none tracking-tight">
                No logs found
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'No logs available to convert to data points'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {filteredLogs && filteredLogs.length > 0 && (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card
              key={log.id}
              className={`cursor-pointer transition-colors ${
                selectedLogs.has(log.id) ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => onLogToggle(log.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedLogs.has(log.id)}
                    onCheckedChange={() => onLogToggle(log.id)}
                    className="mt-1"
                  />
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 mt-1">
                      <Code className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={getHttpMethodColor(log.method)}>
                          {log.method}
                        </Badge>
                        <span className="font-medium text-sm truncate">
                          {log.endpoint}
                        </span>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Function: {log.function_name}</span>
                        <span>{formatDate(log.start_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
