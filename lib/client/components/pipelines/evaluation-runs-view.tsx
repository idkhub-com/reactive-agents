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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useDatasets } from '@client/providers/datasets';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useNavigation } from '@client/providers/navigation';
import type {
  EvaluationRun,
  EvaluationRunQueryParams,
} from '@shared/types/data';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { format } from 'date-fns';
import {
  CalendarIcon,
  ClockIcon,
  DatabaseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function EvaluationRunsView(): ReactElement {
  const {
    navigationState,
    navigateToCreateEvaluation,
    navigateToEvaluationDetail,
  } = useNavigation();
  const smartBack = useSmartBack();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  // Use the EvaluationRuns provider
  const {
    evaluationRuns,
    isLoading,
    refetch,
    setQueryParams,
    refreshEvaluationRuns,
  } = useEvaluationRuns();

  // Use the Datasets provider to get dataset names
  const { datasets, setQueryParams: setDatasetQueryParams } = useDatasets();

  // Update dataset query params when agent changes
  useEffect(() => {
    if (navigationState.selectedAgent) {
      setDatasetQueryParams({
        agent_id: navigationState.selectedAgent.id,
        limit: 100, // Load more datasets to ensure we have all needed for mapping
      });
    }
  }, [navigationState.selectedAgent, setDatasetQueryParams]);

  // Update query params when filters change
  useEffect(() => {
    if (!navigationState.selectedAgent) return;

    const queryParams: EvaluationRunQueryParams = {
      agent_id: navigationState.selectedAgent.id,
      limit,
      offset: (currentPage - 1) * limit,
    };

    if (statusFilter !== 'all') {
      queryParams.status = statusFilter as EvaluationRunStatus;
    }

    if (methodFilter !== 'all') {
      queryParams.evaluation_method = methodFilter as EvaluationMethodName;
    }

    setQueryParams(queryParams);
  }, [
    navigationState.selectedAgent,
    currentPage,
    limit,
    statusFilter,
    methodFilter,
    setQueryParams,
  ]);

  // Early return if no skill or agent selected - AFTER all hooks
  if (!navigationState.selectedSkill || !navigationState.selectedAgent) {
    return <div>No skill selected</div>;
  }

  const { selectedSkill, selectedAgent } = navigationState;

  const filteredEvaluations = evaluationRuns.filter((evaluation) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        evaluation.name?.toLowerCase().includes(searchLower) ||
        evaluation.evaluation_method?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'running':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Helper function to get dataset name by ID
  const _getDatasetName = (datasetId: string): string => {
    const dataset = datasets.find((d) => d.id === datasetId);
    return dataset?.name || 'Unknown Dataset';
  };

  // Helper function to get dataset details including size
  const _getDatasetDetails = (
    evaluation: EvaluationRun,
  ): { name: string; details: string } => {
    const dataset = datasets.find((d) => d.id === evaluation.dataset_id);
    const results = evaluation.results as Record<string, unknown>;
    const totalDataPoints = results?.total_data_points as number;

    const name = dataset?.name || 'Unknown Dataset';

    let details = `ID: ${evaluation.dataset_id.slice(0, 8)}...`;
    if (typeof totalDataPoints === 'number') {
      details = `${totalDataPoints} data points • ${details}`;
    }

    return { name, details };
  };

  // Helper function to format evaluation name
  const formatEvaluationName = (evaluation: EvaluationRun): string => {
    // If it's an auto-generated name with timestamp, create a friendlier version
    if (evaluation.name?.includes(' - 202') && evaluation.name?.includes('T')) {
      const methodName =
        evaluationMethods[
          evaluation.evaluation_method as keyof typeof evaluationMethods
        ];
      const date = format(new Date(evaluation.created_at), 'MMM dd, HH:mm');
      return `${methodName} (${date})`;
    }
    return evaluation.name || 'Unnamed Evaluation';
  };

  // Helper function to get data points information
  const _getDataPointsInfo = (evaluation: EvaluationRun): string => {
    const results = evaluation.results as Record<string, unknown>;
    const total = results?.total_data_points as number;
    const evaluated = results?.evaluated_data_points as number;

    if (typeof total === 'number') {
      if (typeof evaluated === 'number' && evaluated !== total) {
        return `${evaluated}/${total}`;
      }
      return `${total}`;
    }
    return 'N/A';
  };

  // Helper function to get pass rate information with color coding
  const getPassRate = (
    evaluation: EvaluationRun,
  ): { text: string; color: string } => {
    const results = evaluation.results as Record<string, unknown>;
    const passed = results?.passed_count as number;
    const _failed = results?.failed_count as number;
    const total = results?.total_data_points as number;

    if (typeof passed === 'number' && typeof total === 'number' && total > 0) {
      const passRate = (passed / total) * 100;
      let color = 'text-muted-foreground';

      if (passRate >= 90) {
        color = 'text-green-600 dark:text-green-400';
      } else if (passRate >= 70) {
        color = 'text-yellow-600 dark:text-yellow-400';
      } else if (passRate < 70) {
        color = 'text-red-600 dark:text-red-400';
      }

      return {
        text: `${passRate.toFixed(1)}% (${passed}/${total})`,
        color,
      };
    }
    return { text: 'N/A', color: 'text-muted-foreground' };
  };

  // Helper function to get enhanced score display with color coding
  const getScoreDisplay = (
    evaluation: EvaluationRun,
  ): { text: string; color: string } => {
    const results = evaluation.results as Record<string, unknown>;

    // Try different score field names that might be used
    const score =
      (results?.average_score as number) ?? (results?.score as number);

    if (typeof score === 'number') {
      const percentage = score * 100;
      let color = 'text-muted-foreground';

      if (percentage >= 90) {
        color = 'text-green-600 dark:text-green-400';
      } else if (percentage >= 70) {
        color = 'text-yellow-600 dark:text-yellow-400';
      } else if (percentage < 70) {
        color = 'text-red-600 dark:text-red-400';
      }

      return {
        text: `${percentage.toFixed(1)}%`,
        color,
      };
    }
    return { text: 'N/A', color: 'text-muted-foreground' };
  };

  // Helper function to get aggregate statistics
  const getAggregateStats = () => {
    const completed = filteredEvaluations.filter(
      (e) => e.status === 'completed',
    );
    const totalDataPoints = completed.reduce((sum, e) => {
      const results = e.results as Record<string, unknown>;
      const total = results?.total_data_points as number;
      return sum + (typeof total === 'number' ? total : 0);
    }, 0);

    const averageScore =
      completed.length > 0
        ? completed.reduce((sum, e) => {
            const results = e.results as Record<string, unknown>;
            const score =
              (results?.average_score as number) ?? (results?.score as number);
            return sum + (typeof score === 'number' ? score : 0);
          }, 0) / completed.length
        : 0;

    return {
      total: filteredEvaluations.length,
      completed: completed.length,
      totalDataPoints,
      averageScore: averageScore * 100,
    };
  };

  // Map of evaluation method names for display
  const evaluationMethods = {
    tool_correctness: 'Tool Correctness',
    task_completion: 'Task Completion',
    argument_correctness: 'Argument Correctness',
    role_adherence: 'Role Adherence',
    turn_relevancy: 'Turn Relevancy',
  } as const;

  const handleBack = () => {
    // Use smart back with fallback to skill dashboard
    const fallbackUrl = `/pipelines/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}`;
    smartBack(fallbackUrl);
  };

  const handleCreateEvaluation = () => {
    navigateToCreateEvaluation(selectedAgent.name, selectedSkill.name);
  };

  const handleEvaluationClick = (evaluation: EvaluationRun) => {
    navigateToEvaluationDetail(
      selectedAgent.name,
      selectedSkill.name,
      evaluation.id,
    );
  };

  // Helper function to get compact dataset info with icon
  const getCompactDatasetInfo = (evaluation: EvaluationRun): string => {
    const dataset = datasets.find((d) => d.id === evaluation.dataset_id);
    const results = evaluation.results as Record<string, unknown>;
    const totalDataPoints = results?.total_data_points as number;

    const datasetName = dataset?.name || 'Unknown Dataset';

    if (typeof totalDataPoints === 'number') {
      return `${datasetName} (${totalDataPoints.toLocaleString()} pts)`;
    }
    return datasetName;
  };

  // Helper function to get execution time with icon
  const getExecutionTime = (evaluation: EvaluationRun): string => {
    if (evaluation.completed_at && evaluation.created_at) {
      const durationMs =
        new Date(evaluation.completed_at).getTime() -
        new Date(evaluation.created_at).getTime();
      const durationSeconds = Math.round(durationMs / 1000);

      if (durationSeconds < 60) {
        return `${durationSeconds}s`;
      } else if (durationSeconds < 3600) {
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}m ${seconds}s`;
      } else {
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
      }
    }
    return 'N/A';
  };

  return (
    <>
      <PageHeader
        title="Evaluations"
        description={`Evaluation runs for ${selectedSkill.name}`}
        onBack={handleBack}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                refreshEvaluationRuns();
                refetch();
              }}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreateEvaluation}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Evaluation
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Filter and search through evaluation runs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or method..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="tool_correctness">
                    Tool Correctness
                  </SelectItem>
                  <SelectItem value="task_completion">
                    Task Completion
                  </SelectItem>
                  <SelectItem value="argument_correctness">
                    Argument Correctness
                  </SelectItem>
                  <SelectItem value="role_adherence">Role Adherence</SelectItem>
                  <SelectItem value="turn_relevancy">Turn Relevancy</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Evaluations Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Evaluation Runs</CardTitle>
                <CardDescription>
                  View and manage evaluation runs for your agents and datasets
                </CardDescription>
                {(() => {
                  const stats = getAggregateStats();
                  return (
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <span>{stats.total} evaluations found</span>
                      {stats.completed > 0 && (
                        <>
                          <span>• {stats.completed} completed</span>
                          <span>
                            • {stats.totalDataPoints.toLocaleString()} data
                            points evaluated
                          </span>
                          {stats.averageScore > 0 && (
                            <span
                              className={`font-medium ${
                                stats.averageScore >= 90
                                  ? 'text-green-600 dark:text-green-400'
                                  : stats.averageScore >= 70
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              • {stats.averageScore.toFixed(1)}% average score
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map(() => (
                  <div key={nanoid()} className="flex space-x-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">
                  No evaluations found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ||
                  statusFilter !== 'all' ||
                  methodFilter !== 'all'
                    ? 'No evaluations match your current filters.'
                    : 'No evaluations have been run for this skill yet.'}
                </p>
                <Button onClick={handleCreateEvaluation}>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Run your first evaluation
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evaluation</TableHead>
                    <TableHead>Status & Method</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Dataset & Timing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow
                      key={evaluation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEvaluationClick(evaluation)}
                    >
                      {/* Evaluation Name & Description */}
                      <TableCell className="max-w-sm">
                        <div>
                          <div className="font-medium">
                            {formatEvaluationName(evaluation)}
                          </div>
                          {evaluation.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {evaluation.description}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CalendarIcon className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>Created on</TooltipContent>
                            </Tooltip>
                            {format(
                              new Date(evaluation.created_at),
                              'MMM dd, HH:mm',
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status & Method */}
                      <TableCell>
                        <div className="space-y-2">
                          <Badge
                            variant={getStatusBadgeVariant(evaluation.status)}
                          >
                            {evaluation.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {evaluationMethods[
                              evaluation.evaluation_method as keyof typeof evaluationMethods
                            ] || evaluation.evaluation_method}
                          </div>
                        </div>
                      </TableCell>

                      {/* Performance Metrics */}
                      <TableCell>
                        <div className="space-y-2">
                          {/* Score with icon */}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <TrendingUpIcon className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Average score</TooltipContent>
                            </Tooltip>
                            <span
                              className={`text-sm font-medium ${getScoreDisplay(evaluation).color}`}
                            >
                              {getScoreDisplay(evaluation).text}
                            </span>
                          </div>

                          {/* Pass rate with icon */}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <UsersIcon className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Pass rate (passed/total)
                              </TooltipContent>
                            </Tooltip>
                            <span
                              className={`text-xs ${getPassRate(evaluation).color}`}
                            >
                              {getPassRate(evaluation).text}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Dataset & Timing */}
                      <TableCell>
                        <div className="space-y-2">
                          {/* Dataset info with icon */}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DatabaseIcon className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Dataset name and data points
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-sm font-medium">
                              {getCompactDatasetInfo(evaluation)}
                            </span>
                          </div>

                          {/* Execution time with icon */}
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ClockIcon className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Execution duration
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-xs text-muted-foreground">
                              {getExecutionTime(evaluation)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {filteredEvaluations.length > 0 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} - Showing {filteredEvaluations.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filteredEvaluations.length < limit}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
