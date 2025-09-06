'use client';

import { executeEvaluation } from '@client/api/v1/idk/evaluations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@client/components/ui/alert-dialog';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/components/ui/dialog';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { PageHeader } from '@client/components/ui/page-header';
import { Progress } from '@client/components/ui/progress';
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
import { useToast } from '@client/hooks/use-toast';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useNavigation } from '@client/providers/navigation';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodName,
  EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  LoaderIcon,
  TrashIcon,
  XCircleIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function EvaluationRunDetailsView(): ReactElement {
  const { navigationState, navigateToEvaluations } = useNavigation();
  const { toast } = useToast();
  const {
    evaluationRuns,
    loadLogOutputs,
    logOutputs,
    logOutputsLoading,
    deleteEvaluationRun,
    refetch,
  } = useEvaluationRuns();
  const smartBack = useSmartBack();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [selectedLogOutput, setSelectedLogOutput] = useState<
    (typeof logOutputs)[0] | null
  >(null);
  const [logDetailDialogOpen, setLogDetailDialogOpen] = useState(false);
  // Use provider's log outputs
  const outputsLoading = logOutputsLoading;
  const outputsError = null; // Provider handles errors internally

  const evaluationId = navigationState.evalId;

  // Find evaluation from provider's evaluation runs using useMemo to avoid infinite loops
  const evaluation = useMemo(() => {
    if (!evaluationId || evaluationRuns.length === 0) return null;
    return evaluationRuns.find((run) => run.id === evaluationId) || null;
  }, [evaluationId, evaluationRuns]);

  const evaluationLoading = false;
  const evaluationError =
    evaluation === null && evaluationId
      ? new Error('Evaluation not found')
      : null;

  // Load log outputs when evaluation is available
  useEffect(() => {
    if (evaluationId) {
      loadLogOutputs(evaluationId, {});
    }
  }, [evaluationId, loadLogOutputs]);

  const handleBack = useCallback(() => {
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      const fallbackUrl = `/agents/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}/evaluations`;
      smartBack(fallbackUrl);
    } else {
      smartBack('/agents');
    }
  }, [smartBack, navigationState.selectedAgent, navigationState.selectedSkill]);

  const handleDelete = useCallback(async () => {
    if (!evaluation) return;

    setIsDeleting(true);
    try {
      await deleteEvaluationRun(evaluation.id);

      toast({
        title: 'Evaluation deleted',
        description: 'The evaluation run has been successfully deleted.',
      });

      // Refresh data and navigate back
      refetch();
      if (navigationState.selectedAgent && navigationState.selectedSkill) {
        navigateToEvaluations(
          navigationState.selectedAgent.name,
          navigationState.selectedSkill.name,
        );
      }
    } catch (error) {
      console.error('Failed to delete evaluation:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting evaluation',
        description: 'Please try again later',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [
    evaluation,
    toast,
    deleteEvaluationRun,
    refetch,
    navigateToEvaluations,
    navigationState.selectedAgent,
    navigationState.selectedSkill,
  ]);

  const handleExport = useCallback(() => {
    if (!evaluation || !logOutputs.length) return;

    const exportData = {
      evaluation: {
        id: evaluation.id,
        name: evaluation.name,
        description: evaluation.description,
        status: evaluation.status,
        results: evaluation.results,
        metadata: evaluation.metadata,
        created_at: evaluation.created_at,
        completed_at: evaluation.completed_at,
      },
      outputs: logOutputs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation-${evaluation.name}-${evaluation.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export completed',
      description: 'Evaluation results have been downloaded.',
    });
  }, [evaluation, logOutputs, toast]);

  const handleDuplicateClick = useCallback(() => {
    if (!evaluation) return;

    // Generate default name with " - 2" suffix
    const originalName = evaluation.name || 'Untitled Evaluation';
    const defaultName = `${originalName} - 2`;
    setDuplicateName(defaultName);
    setDuplicateDialogOpen(true);
  }, [evaluation]);

  const handleLogRowClick = useCallback((logOutput: (typeof logOutputs)[0]) => {
    setSelectedLogOutput(logOutput);
    setLogDetailDialogOpen(true);
  }, []);

  const handleDuplicateConfirm = useCallback(async () => {
    if (!evaluation || !navigationState.selectedAgent) return;

    setIsDuplicating(true);
    try {
      // Extract parameters from the original evaluation metadata
      const metadata = evaluation.metadata as Record<string, unknown>;
      const originalParameters =
        (metadata?.parameters as Record<string, unknown>) || {};

      const duplicateRequest: EvaluationMethodRequest = {
        agent_id: navigationState.selectedAgent.id,
        dataset_id: evaluation.dataset_id,
        evaluation_method: evaluation.evaluation_method as EvaluationMethodName,
        parameters: originalParameters,
        name: duplicateName.trim(),
        description: evaluation.description || undefined,
      };

      await executeEvaluation(duplicateRequest);

      toast({
        title: 'Evaluation duplicated',
        description: `New evaluation "${duplicateName}" has been created and is running.`,
      });

      // Refresh the evaluations list
      refetch();
      setDuplicateDialogOpen(false);
    } catch (error) {
      console.error('Failed to duplicate evaluation:', error);
      toast({
        variant: 'destructive',
        title: 'Error duplicating evaluation',
        description: 'Please try again later',
      });
    } finally {
      setIsDuplicating(false);
    }
  }, [
    evaluation,
    navigationState.selectedAgent,
    duplicateName,
    toast,
    refetch,
  ]);

  const getStatusIcon = (status: EvaluationRunStatus) => {
    switch (status) {
      case EvaluationRunStatus.COMPLETED:
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case EvaluationRunStatus.FAILED:
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case EvaluationRunStatus.RUNNING:
        return <LoaderIcon className="h-4 w-4 text-blue-600 animate-spin" />;
      case EvaluationRunStatus.PENDING:
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: EvaluationRunStatus) => {
    switch (status) {
      case EvaluationRunStatus.COMPLETED:
        return 'default';
      case EvaluationRunStatus.FAILED:
        return 'destructive';
      case EvaluationRunStatus.RUNNING:
        return 'default';
      case EvaluationRunStatus.PENDING:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Calculate statistics from log outputs
  const statistics =
    logOutputs.length > 0
      ? {
          totalLogs: logOutputs.length,
          averageScore:
            logOutputs.reduce((sum, output) => sum + (output.score || 0), 0) /
            logOutputs.length,
          highScoreCount: logOutputs.filter(
            (output) => (output.score || 0) >= 0.8,
          ).length,
          lowScoreCount: logOutputs.filter(
            (output) => (output.score || 0) < 0.5,
          ).length,
        }
      : null;

  if (evaluationLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (evaluationError || !evaluation) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Evaluation not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The evaluation you're looking for doesn't exist or has been
              deleted.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={evaluation.name}
        description={evaluation.description || 'No description provided'}
        showBackButton
        onBack={handleBack}
        actions={
          <div className="flex items-center gap-2">
            <Dialog
              open={duplicateDialogOpen}
              onOpenChange={setDuplicateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicateClick}
                >
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Duplicate Evaluation</DialogTitle>
                  <DialogDescription>
                    Create a new evaluation run with the same parameters. Only
                    the name can be changed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="duplicate-name">Evaluation Name</Label>
                    <Input
                      id="duplicate-name"
                      value={duplicateName}
                      onChange={(e) => setDuplicateName(e.target.value)}
                      placeholder="Enter evaluation name..."
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDuplicateDialogOpen(false)}
                    disabled={isDuplicating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDuplicateConfirm}
                    disabled={isDuplicating || !duplicateName.trim()}
                  >
                    {isDuplicating ? (
                      <>
                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-4 w-4 mr-2" />
                        Create Duplicate
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!logOutputs.length}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export Results
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete evaluation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this evaluation? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Evaluation Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(evaluation.status)}
                  <Badge variant={getStatusBadgeVariant(evaluation.status)}>
                    {evaluation.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Method</span>
                <Badge variant="outline">{evaluation.evaluation_method}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Created</span>
                <span className="text-sm text-muted-foreground">
                  {format(
                    new Date(evaluation.created_at),
                    'MMM dd, yyyy HH:mm',
                  )}
                </span>
              </div>
              {evaluation.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-sm text-muted-foreground">
                    {format(
                      new Date(evaluation.completed_at),
                      'MMM dd, yyyy HH:mm',
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Logs</span>
                  <span className="text-sm font-bold">
                    {statistics.totalLogs}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Score</span>
                  <span className="text-sm font-bold">
                    {statistics.averageScore.toFixed(3)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>High Score (≥0.8)</span>
                    <span>{statistics.highScoreCount}</span>
                  </div>
                  <Progress
                    value={
                      (statistics.highScoreCount / statistics.totalLogs) * 100
                    }
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Low Score (&lt;0.5)</span>
                    <span>{statistics.lowScoreCount}</span>
                  </div>
                  <Progress
                    value={
                      (statistics.lowScoreCount / statistics.totalLogs) * 100
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results from Evaluation Run */}
          {evaluation.results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evaluation Results</CardTitle>
                <CardDescription>
                  Official results from the evaluation run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const results = evaluation.results as Record<string, unknown>;
                  const totalLogs = results?.total_logs as number;
                  const passedCount = results?.passed_count as number;
                  const failedCount = results?.failed_count as number;
                  const averageScore = results?.average_score as number;
                  const thresholdUsed = results?.threshold_used as number;

                  return (
                    <>
                      {typeof totalLogs === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Total Logs
                          </span>
                          <span className="text-sm font-bold">{totalLogs}</span>
                        </div>
                      )}
                      {typeof passedCount === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Passed</span>
                          <span className="text-sm font-bold text-green-600">
                            {passedCount}
                          </span>
                        </div>
                      )}
                      {typeof failedCount === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Failed</span>
                          <span className="text-sm font-bold text-red-600">
                            {failedCount}
                          </span>
                        </div>
                      )}
                      {typeof averageScore === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Average Score
                          </span>
                          <span className="text-sm font-bold">
                            {(averageScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {typeof thresholdUsed === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Threshold</span>
                          <span className="text-sm font-bold">
                            {thresholdUsed}
                          </span>
                        </div>
                      )}
                      {typeof passedCount === 'number' &&
                        typeof totalLogs === 'number' &&
                        totalLogs > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Pass Rate</span>
                              <span>
                                {((passedCount / totalLogs) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress
                              value={(passedCount / totalLogs) * 100}
                              className="h-2"
                            />
                          </div>
                        )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Log Outputs */}
        <Card>
          <CardHeader>
            <CardTitle>Log Results</CardTitle>
            <CardDescription>
              Individual results for each log in the evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {outputsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map(() => (
                  <div key={nanoid()} className="flex space-x-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : outputsError ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Failed to load log outputs
                </p>
              </div>
            ) : logOutputs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No log outputs available yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Log ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Task/Reasoning</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logOutputs.map((output) => {
                    const outputData = output.output as Record<string, unknown>;
                    const _metadata = output.metadata as Record<
                      string,
                      unknown
                    >;

                    // Extract meaningful information from output
                    const task = outputData?.task as string;
                    const reasoning = outputData?.reasoning as string;
                    const passed = outputData?.passed as boolean;
                    const threshold = outputData?.threshold as number;

                    // Get status badge
                    const getStatusBadge = () => {
                      if (passed === true) {
                        return <Badge variant="default">Passed</Badge>;
                      } else if (passed === false) {
                        return <Badge variant="destructive">Failed</Badge>;
                      }
                      return <Badge variant="secondary">Unknown</Badge>;
                    };

                    // Get task/reasoning display
                    const getTaskReasoning = () => {
                      if (task) {
                        return (
                          <div className="max-w-xs">
                            <div className="font-medium text-xs">Task:</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {task}
                            </div>
                          </div>
                        );
                      }
                      if (reasoning) {
                        return (
                          <div className="max-w-xs">
                            <div className="text-xs text-muted-foreground truncate">
                              {reasoning}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <span className="text-xs text-muted-foreground">
                          N/A
                        </span>
                      );
                    };

                    // Get details
                    const getDetails = () => {
                      const details = [];
                      if (threshold !== undefined) {
                        details.push(`Threshold: ${threshold}`);
                      }
                      if (outputData?.execution_time_ms) {
                        details.push(`${outputData.execution_time_ms}ms`);
                      }
                      if (outputData?.strict_mode) {
                        details.push('Strict Mode');
                      }
                      return details.length > 0 ? details.join(' • ') : 'N/A';
                    };

                    return (
                      <TableRow
                        key={output.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleLogRowClick(output)}
                      >
                        <TableCell className="font-mono text-xs">
                          {output.log_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (output.score || 0) >= 0.8
                                ? 'default'
                                : (output.score || 0) >= 0.5
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {output.score?.toFixed(3) || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge()}</TableCell>
                        <TableCell>{getTaskReasoning()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {getDetails()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(output.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Configuration & Metadata */}
        {evaluation.metadata && Object.keys(evaluation.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Evaluation parameters and metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(evaluation.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Log Detail Dialog */}
        <Dialog
          open={logDetailDialogOpen}
          onOpenChange={setLogDetailDialogOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Evaluation Details</DialogTitle>
              <DialogDescription>
                Detailed information about the log evaluation
              </DialogDescription>
            </DialogHeader>

            {selectedLogOutput &&
              (() => {
                const outputData = selectedLogOutput.output as Record<
                  string,
                  unknown
                >;
                const metadata = selectedLogOutput.metadata as Record<
                  string,
                  unknown
                >;

                // Extract all available information
                const task = outputData?.task as string;
                const outcome = outputData?.outcome as string;
                const reasoning = outputData?.reasoning as string;
                const passed = outputData?.passed as boolean;
                const threshold = outputData?.threshold as number;
                const strictMode = outputData?.strict_mode as boolean;
                const executionTime = outputData?.execution_time_ms as number;
                const evaluatedAt = outputData?.evaluated_at as string;
                const extractionLLMOutput =
                  outputData?.extraction_llm_output as string;
                const verdictLLMOutput =
                  outputData?.verdict_llm_output as string;

                return (
                  <div className="space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Log ID:</span>
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {selectedLogOutput.log_id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Score:</span>
                        <Badge
                          variant={
                            (selectedLogOutput.score || 0) >= 0.8
                              ? 'default'
                              : (selectedLogOutput.score || 0) >= 0.5
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-sm"
                        >
                          {selectedLogOutput.score?.toFixed(3) || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={passed ? 'default' : 'destructive'}>
                          {passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Threshold:</span>
                        <span className="text-sm">{threshold || 'N/A'}</span>
                      </div>
                      {strictMode && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Mode:</span>
                          <Badge variant="outline">Strict Mode</Badge>
                        </div>
                      )}
                      {executionTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Execution Time:
                          </span>
                          <span className="text-sm">{executionTime}ms</span>
                        </div>
                      )}
                    </div>

                    {/* Task and Outcome */}
                    {task && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1">
                          Task
                        </h4>
                        <div className="bg-muted p-2 rounded text-sm max-h-32 overflow-y-auto">
                          <div className="whitespace-pre-wrap break-words text-xs">
                            {task}
                          </div>
                        </div>
                      </div>
                    )}

                    {outcome && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1">
                          Outcome
                        </h4>
                        <div className="bg-muted p-2 rounded text-sm max-h-32 overflow-y-auto">
                          <div className="whitespace-pre-wrap break-words text-xs">
                            {outcome}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reasoning */}
                    {reasoning && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1">
                          Reasoning
                        </h4>
                        <div className="bg-muted p-2 rounded text-sm max-h-40 overflow-y-auto">
                          <div className="whitespace-pre-wrap break-words text-xs">
                            {reasoning}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LLM Outputs */}
                    {extractionLLMOutput && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1">
                          Extraction LLM Output
                        </h4>
                        <pre className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto break-words whitespace-pre-wrap">
                          {extractionLLMOutput}
                        </pre>
                      </div>
                    )}

                    {verdictLLMOutput && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1">
                          Verdict LLM Output
                        </h4>
                        <pre className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto break-words whitespace-pre-wrap">
                          {verdictLLMOutput}
                        </pre>
                      </div>
                    )}

                    {/* Metadata */}
                    {Object.keys(metadata).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1">
                          Metadata
                        </h4>
                        <pre className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto break-words whitespace-pre-wrap">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Full Output */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm border-b pb-1">
                        Full Output Data
                      </h4>
                      <pre className="bg-muted p-2 rounded text-xs max-h-40 overflow-y-auto break-words whitespace-pre-wrap">
                        {JSON.stringify(outputData, null, 2)}
                      </pre>
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">Created:</span>
                        <span className="text-muted-foreground">
                          {format(
                            new Date(selectedLogOutput.created_at),
                            'MMM dd, yyyy HH:mm:ss',
                          )}
                        </span>
                      </div>
                      {evaluatedAt && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">Evaluated:</span>
                          <span className="text-muted-foreground">
                            {format(
                              new Date(evaluatedAt),
                              'MMM dd, yyyy HH:mm:ss',
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
