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

export function EvaluationDetailView(): ReactElement {
  const { navigationState, navigateToEvaluations } = useNavigation();
  const { toast } = useToast();
  const {
    evaluationRuns,
    loadDataPointOutputs,
    dataPointOutputs,
    dataPointOutputsLoading,
    deleteEvaluationRun,
    refetch,
  } = useEvaluationRuns();
  const smartBack = useSmartBack();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  // Use provider's data point outputs
  const outputsLoading = dataPointOutputsLoading;
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

  // Load data point outputs when evaluation is available
  useEffect(() => {
    if (evaluationId) {
      loadDataPointOutputs(evaluationId, {});
    }
  }, [evaluationId, loadDataPointOutputs]);

  const handleBack = useCallback(() => {
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      const fallbackUrl = `/pipelines/${encodeURIComponent(navigationState.selectedAgent.name)}/${encodeURIComponent(navigationState.selectedSkill.name)}/evaluations`;
      smartBack(fallbackUrl);
    } else {
      smartBack('/pipelines');
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
    if (!evaluation || !dataPointOutputs.length) return;

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
      outputs: dataPointOutputs,
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
  }, [evaluation, dataPointOutputs, toast]);

  const handleDuplicateClick = useCallback(() => {
    if (!evaluation) return;

    // Generate default name with " - 2" suffix
    const originalName = evaluation.name || 'Untitled Evaluation';
    const defaultName = `${originalName} - 2`;
    setDuplicateName(defaultName);
    setDuplicateDialogOpen(true);
  }, [evaluation]);

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

  // Calculate statistics from data point outputs
  const statistics =
    dataPointOutputs.length > 0
      ? {
          totalDataPoints: dataPointOutputs.length,
          averageScore:
            dataPointOutputs.reduce(
              (sum, output) => sum + (output.score || 0),
              0,
            ) / dataPointOutputs.length,
          highScoreCount: dataPointOutputs.filter(
            (output) => (output.score || 0) >= 0.8,
          ).length,
          lowScoreCount: dataPointOutputs.filter(
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
              disabled={!dataPointOutputs.length}
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
                  <span className="text-sm font-medium">Total Data Points</span>
                  <span className="text-sm font-bold">
                    {statistics.totalDataPoints}
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
                      (statistics.highScoreCount / statistics.totalDataPoints) *
                      100
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
                      (statistics.lowScoreCount / statistics.totalDataPoints) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Data Point Outputs */}
        <Card>
          <CardHeader>
            <CardTitle>Data Point Results</CardTitle>
            <CardDescription>
              Individual results for each data point in the evaluation
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
                  Failed to load data point outputs
                </p>
              </div>
            ) : dataPointOutputs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No data point outputs available yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Point ID</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataPointOutputs.map((output) => (
                    <TableRow key={output.id}>
                      <TableCell className="font-mono text-xs">
                        {output.data_point_id.slice(0, 8)}...
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
                      <TableCell className="max-w-xs truncate">
                        {typeof output.output === 'object'
                          ? JSON.stringify(output.output)
                          : output.output || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {typeof output.metadata === 'object' &&
                        output.metadata?.reasoning
                          ? String(output.metadata.reasoning)
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(output.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
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
      </div>
    </>
  );
}
