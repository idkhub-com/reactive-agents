'use client';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Skeleton } from '@client/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useLogs } from '@client/providers/logs';
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import type { Log } from '@shared/types/data';
import { format } from 'date-fns';
import { CalendarIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function LogsView(): ReactElement {
  const { navigateToLogDetail } = useNavigation();
  const smartBack = useSmartBack();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const {
    logs,
    isLoading,
    refetch,
    setAgentId,
    setSkillId,
    refreshLogs,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Set agentId and skillId when agent/skill changes
  useEffect(() => {
    if (selectedAgent && selectedSkill) {
      setAgentId(selectedAgent.id);
      setSkillId(selectedSkill.id);
    } else {
      setAgentId(null);
      setSkillId(null);
    }
  }, [selectedAgent, selectedSkill, setAgentId, setSkillId]);

  // Early return if no skill or agent selected - AFTER all hooks
  if (!selectedSkill || !selectedAgent) {
    return <div>No skill selected</div>;
  }

  const filteredLogs = logs.filter((log: Log) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.function_name?.toLowerCase().includes(searchLower) ||
        log.endpoint?.toLowerCase().includes(searchLower) ||
        log.method?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusBadgeVariant = (status: number) => {
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400 && status < 500) return 'destructive';
    if (status >= 500) return 'destructive';
    return 'secondary';
  };

  const handleBack = () => {
    // Use smart back with fallback to skill dashboard
    const fallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}`;
    smartBack(fallbackUrl);
  };

  const handleLogClick = (log: Log) => {
    navigateToLogDetail(selectedAgent.name, selectedSkill.name, log.id);
  };

  return (
    <>
      <PageHeader
        title="Logs"
        description={`Request logs for ${selectedSkill.name}`}
        onBack={handleBack}
        actions={
          <Button
            onClick={() => {
              refreshLogs();
              refetch();
            }}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />
      <div className="px-2 pt-6 pb-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Filter and search through logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by function name, endpoint, method..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="200">Success (2xx)</SelectItem>
                  <SelectItem value="400">Client Error (4xx)</SelectItem>
                  <SelectItem value="500">Server Error (5xx)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Request Logs</CardTitle>
                <CardDescription>
                  {filteredLogs.length} logs found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map(() => (
                  <div key={nanoid()} className="flex space-x-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No logs found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No logs match your current filters.'
                    : 'No logs available for this skill yet.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleLogClick(log)}
                    >
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.method}</Badge>
                      </TableCell>
                      <TableCell>{log.function_name || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.endpoint}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.start_time), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.duration ? `${log.duration}ms` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Load More */}
        {hasNextPage && (
          <div className="flex justify-center items-center py-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
        {filteredLogs.length > 0 && !hasNextPage && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Showing all {filteredLogs.length} logs
          </div>
        )}
      </div>
    </>
  );
}
