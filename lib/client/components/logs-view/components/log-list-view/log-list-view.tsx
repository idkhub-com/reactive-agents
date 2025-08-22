'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useLogs } from '@client/providers/logs';
import { LogsQueryParams } from '@shared/types/data/log';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { useEffect, useState } from 'react';
import { LogsList } from './components/log-list';

export function LogListView(): React.ReactElement {
  const { logs, refetch, isLoading: isQueryLoading } = useLogs();
  const [visibleLogs, setVisibleLogs] = useState<IdkRequestLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch logs with query parameters when filters change
  useEffect(() => {
    const fetchLogs = (): void => {
      try {
        const params = LogsQueryParams.parse({});

        // Add query parameters based on filters
        if (statusFilter !== 'all') {
          params.status =
            statusFilter === 'success'
              ? 200
              : statusFilter === 'error'
                ? 400
                : 100; // 100 for pending
        }

        // Add endpoint parameter for search
        if (searchTerm) {
          params.endpoint = `%${searchTerm}%`;
        }

        refetch();
      } catch (_error) {
        // Error fetching logs - silently handle for now
      }
    };

    fetchLogs();
  }, [refetch, statusFilter, searchTerm]);

  // Map API logs to UI logs when apiLogs change
  useEffect(() => {
    setVisibleLogs(logs);
  }, [logs]);

  // Filter logs based on filters
  const filteredLogs = visibleLogs;

  return (
    <div className="p-2 shrink-0 w-full h-full overflow-hidden transition-all duration-800">
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>
            View and analyze execution logs across your application
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col overflow-hidden p-2">
          <div className="flex flex-col md:flex-row gap-2 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e): void => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={(): void => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {isQueryLoading ? (
            <div className="flex justify-center py-8">
              <p>Loading logs...</p>
            </div>
          ) : (
            <LogsList logs={filteredLogs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
