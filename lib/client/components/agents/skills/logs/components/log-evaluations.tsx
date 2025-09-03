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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { useEvaluationRuns } from '@client/providers/evaluation-runs';
import { useNavigation } from '@client/providers/navigation';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { format } from 'date-fns';
import { ExternalLinkIcon, TrendingUpIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

interface LogEvaluationsProps {
  log: IdkRequestLog;
}

interface LogEvaluation {
  id: string;
  evaluation_method: string;
  name: string;
  status: string;
  score?: number;
  passed?: boolean;
  created_at: string;
  results?: Record<string, unknown>;
}

export function LogEvaluations({ log }: LogEvaluationsProps): ReactElement {
  const { evaluationRuns, setQueryParams, refetch } = useEvaluationRuns();
  const { navigateToEvaluationDetail, navigationState } = useNavigation();
  const [logEvaluations, setLogEvaluations] = useState<LogEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Find evaluations for this specific log
  useEffect(() => {
    const fetchEvaluations = async () => {
      setIsLoading(true);
      try {
        // Query evaluation runs where dataset_id = log.id (single log evaluations)
        await setQueryParams({
          dataset_id: log.id,
          limit: 100,
          offset: 0,
        });
        await refetch();
      } catch (error) {
        console.error('Failed to fetch log evaluations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluations();
  }, [log.id, setQueryParams, refetch]);

  // Process evaluation runs to extract log-specific results
  useEffect(() => {
    if (!evaluationRuns.length) {
      setLogEvaluations([]);
      return;
    }

    const evaluations: LogEvaluation[] = [];

    for (const run of evaluationRuns) {
      // For single log evaluations, dataset_id = log.id
      if (run.dataset_id === log.id) {
        const evaluation: LogEvaluation = {
          id: run.id,
          evaluation_method: run.evaluation_method,
          name: run.name,
          status: run.status,
          created_at: run.created_at,
          results: run.results,
        };

        // Extract score and passed status from results if available
        if (run.results && typeof run.results === 'object') {
          if (
            'average_score' in run.results &&
            typeof run.results.average_score === 'number'
          ) {
            evaluation.score = run.results.average_score;
          }
          if ('passed_count' in run.results && 'total_logs' in run.results) {
            const totalLogs = run.results.total_logs as number;
            const passedCount = run.results.passed_count as number;
            evaluation.passed = totalLogs > 0 && passedCount === totalLogs;
          }
        }

        evaluations.push(evaluation);
      }
    }

    // Sort by creation date (newest first)
    evaluations.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setLogEvaluations(evaluations);
  }, [evaluationRuns, log.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getScoreBadge = (score?: number, passed?: boolean) => {
    if (score === undefined)
      return <span className="text-muted-foreground">-</span>;

    if (passed === true) {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {score.toFixed(2)} ✓
        </Badge>
      );
    } else if (passed === false) {
      return <Badge variant="destructive">{score.toFixed(2)} ✗</Badge>;
    } else {
      return <Badge variant="secondary">{score.toFixed(2)}</Badge>;
    }
  };

  const formatMethodName = (method: string) => {
    return method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleViewDetails = (evaluationId: string) => {
    if (navigationState.selectedAgent && navigationState.selectedSkill) {
      navigateToEvaluationDetail(
        navigationState.selectedAgent.name,
        navigationState.selectedSkill.name,
        evaluationId,
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Log Evaluations
          </CardTitle>
          <CardDescription>
            Loading evaluation results for this log...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logEvaluations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Log Evaluations
          </CardTitle>
          <CardDescription>
            No evaluations have been run on this log yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the "Evaluate Log" button above to run your first evaluation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5" />
          Log Evaluations ({logEvaluations.length})
        </CardTitle>
        <CardDescription>
          Evaluation results for this specific log
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logEvaluations.map((evaluation) => (
              <TableRow key={evaluation.id}>
                <TableCell>
                  <Badge variant="outline">
                    {formatMethodName(evaluation.evaluation_method)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{evaluation.name}</TableCell>
                <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                <TableCell>
                  {getScoreBadge(evaluation.score, evaluation.passed)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(evaluation.created_at), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(evaluation.id)}
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
