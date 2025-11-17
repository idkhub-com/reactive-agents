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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@client/components/ui/pagination';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useLogs } from '@client/providers/logs';
import { useNavigation } from '@client/providers/navigation';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkills } from '@client/providers/skills';
import type { Log } from '@shared/types/data';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle2,
  InfoIcon,
  SearchIcon,
  XCircle,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function LogsView(): ReactElement {
  const { navigateToLogDetail } = useNavigation();
  const smartBack = useSmartBack();
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const { clusters, setSkillId: setClustersSkillId } =
    useSkillOptimizationClusters();
  const {
    logs,
    isLoading,
    setAgentId,
    setSkillId,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = useLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [goToPageInput, setGoToPageInput] = useState('');

  // Helper functions for extracting data from logs
  const getClusterName = (log: Log): string | null | 'not-found' => {
    if (!log.cluster_id) return null;
    const cluster = clusters.find((c) => c.id === log.cluster_id);
    return cluster?.name ?? 'not-found';
  };

  const getTemperature = (log: Log) => {
    const requestBody = log.ai_provider_request_log?.request_body;
    if (
      requestBody &&
      typeof requestBody === 'object' &&
      'temperature' in requestBody
    ) {
      return requestBody.temperature as number;
    }
    return null;
  };

  const getThinkingEffort = (log: Log) => {
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
  };

  // Set agentId and skillId when agent/skill changes
  useEffect(() => {
    if (selectedAgent && selectedSkill) {
      setAgentId(selectedAgent.id);
      setSkillId(selectedSkill.id);
      setClustersSkillId(selectedSkill.id);
    } else {
      setAgentId(null);
      setSkillId(null);
      setClustersSkillId(null);
    }
  }, [
    selectedAgent,
    selectedSkill,
    setAgentId,
    setSkillId,
    setClustersSkillId,
  ]);

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
    const fallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/skills/${encodeURIComponent(selectedSkill.name)}`;
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
      />
      <div className="p-6 space-y-6">
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
                    <TableHead>Eval</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Partition</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead>Reasoning</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const clusterName = getClusterName(log);
                    const temperature = getTemperature(log);
                    const thinkingEffort = getThinkingEffort(log);
                    const evalScore =
                      log.avg_eval_score !== null &&
                      log.avg_eval_score !== undefined
                        ? log.avg_eval_score
                        : null;

                    return (
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
                          {evalScore !== null ? (
                            <div className="flex items-center gap-1">
                              {evalScore >= 0.7 ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="font-mono text-xs">
                                {(evalScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.method}</Badge>
                        </TableCell>
                        <TableCell>{log.function_name || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.endpoint}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{log.model}</span>
                        </TableCell>
                        <TableCell>
                          {clusterName === null ? (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          ) : clusterName === 'not-found' ? (
                            <span className="text-muted-foreground text-xs">
                              Not found
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {clusterName}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {temperature !== null ? (
                            <span className="font-mono text-xs">
                              {temperature.toFixed(2)}
                            </span>
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
                        <TableCell>
                          {thinkingEffort ? (
                            <Badge variant="secondary" className="text-xs">
                              {thinkingEffort}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.start_time), 'MMM dd, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          {log.duration ? `${log.duration}ms` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {filteredLogs.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Pagination Info and Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Rows per page:
                    </span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => setPageSize(Number(value))}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Page Info */}
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>

                  {/* Go to Page */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Go to page:
                    </span>
                    <Input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const pageNum = Number(goToPageInput);
                          if (pageNum >= 1 && pageNum <= totalPages) {
                            setPage(pageNum);
                            setGoToPageInput('');
                          }
                        }
                      }}
                      className="w-20"
                      placeholder={String(page)}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const pageNum = Number(goToPageInput);
                        if (pageNum >= 1 && pageNum <= totalPages) {
                          setPage(pageNum);
                          setGoToPageInput('');
                        }
                      }}
                      disabled={!goToPageInput}
                    >
                      Go
                    </Button>
                  </div>
                </div>

                {/* Pagination Buttons */}
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        // Show all pages if 5 or fewer
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        // Near the start
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        // Near the end
                        pageNum = totalPages - 4 + i;
                      } else {
                        // In the middle
                        pageNum = page - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            isActive={page === pageNum}
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {totalPages > 5 && page < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
