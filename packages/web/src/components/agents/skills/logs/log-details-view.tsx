'use client';

import { CompletionViewer } from '@client/components/agents/skills/logs/components/completion-viewer';
import { MessagesView } from '@client/components/agents/skills/logs/components/messages-view';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { PageHeader } from '@client/components/ui/page-header';
import { Separator } from '@client/components/ui/separator';
import { Skeleton } from '@client/components/ui/skeleton';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useLogs } from '@client/providers/logs';
import { useSkillOptimizationClusters } from '@client/providers/skill-optimization-clusters';
import { useSkillOptimizationEvaluationRuns } from '@client/providers/skill-optimization-evaluation-runs';
import { useSkills } from '@client/providers/skills';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import { type AIProvider, PrettyAIProvider } from '@shared/types/constants';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeftIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

// Pretty names for evaluation methods
const EvaluationMethodNames: Record<EvaluationMethodName, string> = {
  [EvaluationMethodName.TASK_COMPLETION]: 'Task Completion',
  [EvaluationMethodName.ARGUMENT_CORRECTNESS]: 'Argument Correctness',
  [EvaluationMethodName.ROLE_ADHERENCE]: 'Role Adherence',
  [EvaluationMethodName.TURN_RELEVANCY]: 'Turn Relevancy',
  [EvaluationMethodName.TOOL_CORRECTNESS]: 'Tool Correctness',
  [EvaluationMethodName.KNOWLEDGE_RETENTION]: 'Knowledge Retention',
  [EvaluationMethodName.CONVERSATION_COMPLETENESS]: 'Conversation Completeness',
  [EvaluationMethodName.LATENCY]: 'Latency',
};

export function LogDetailsView(): ReactElement {
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const { selectedLog, isLoading, setAgentId, setSkillId } = useLogs();
  const { clusters } = useSkillOptimizationClusters();
  const {
    evaluationRuns,
    setSkillId: setEvalSkillId,
    setLogId: setEvalLogId,
  } = useSkillOptimizationEvaluationRuns();
  const smartBack = useSmartBack();
  const [raRequestData, setReactiveAgentsRequestData] =
    useState<ReactiveAgentsRequestData | null>(null);
  const [showEvaluationDetails, setShowEvaluationDetails] = useState(false);
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  // Set agentId, skillId, and logId when agent/skill/log changes
  useEffect(() => {
    if (selectedAgent && selectedSkill) {
      setAgentId(selectedAgent.id);
      setSkillId(selectedSkill.id);
      setEvalSkillId(selectedSkill.id);
    } else {
      setAgentId(null);
      setSkillId(null);
      setEvalSkillId(null);
    }
  }, [selectedAgent, selectedSkill, setAgentId, setSkillId, setEvalSkillId]);

  // Set log ID for evaluation runs provider
  useEffect(() => {
    if (selectedLog) {
      setEvalLogId(selectedLog.id);
    } else {
      setEvalLogId(null);
    }
  }, [selectedLog, setEvalLogId]);

  // Function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  // Get cluster name
  const clusterName = useMemo(() => {
    if (!selectedLog?.cluster_id) return null;
    const cluster = clusters.find(
      (c: { id: string; name: string }) => c.id === selectedLog.cluster_id,
    );
    return cluster?.name ?? null;
  }, [selectedLog?.cluster_id, clusters]);

  // Extract temperature from request body
  const temperature = useMemo(() => {
    if (!selectedLog) return null;
    const requestBody = selectedLog.ai_provider_request_log?.request_body;
    if (
      requestBody &&
      typeof requestBody === 'object' &&
      'temperature' in requestBody
    ) {
      return requestBody.temperature as number;
    }
    return null;
  }, [selectedLog]);

  // Extract thinking effort from request body
  const thinkingEffort = useMemo(() => {
    if (!selectedLog) return null;
    const requestBody = selectedLog.ai_provider_request_log?.request_body;
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
  }, [selectedLog]);

  // Use the weighted average score from the database view (logs_with_eval_scores)
  // This ensures consistency with the list view and handles orphaned evaluation runs correctly
  const averageScore = useMemo(() => {
    return selectedLog?.avg_eval_score ?? null;
  }, [selectedLog?.avg_eval_score]);

  // Get all evaluation details from evaluation runs using display_info
  const evaluationDetails = useMemo(() => {
    const allDetails: Array<{
      method: EvaluationMethodName;
      score: number;
      sections: Array<{ label: string; content: string }>;
      judgeModelName: string | null;
      judgeModelProvider: string | null;
    }> = [];

    evaluationRuns.forEach((run) => {
      run.results.forEach((result) => {
        allDetails.push({
          method: result.method,
          score: result.score,
          sections: result.display_info,
          judgeModelName: result.judge_model_name ?? null,
          judgeModelProvider: result.judge_model_provider ?? null,
        });
      });
    });
    return allDetails;
  }, [evaluationRuns]);

  useEffect(() => {
    if (selectedLog) {
      const raRequestData = produceReactiveAgentsRequestData(
        selectedLog.ai_provider_request_log.method,
        selectedLog.ai_provider_request_log.request_url,
        {},
        selectedLog.ai_provider_request_log.request_body,
        selectedLog.ai_provider_request_log.response_body,
      );

      setReactiveAgentsRequestData(raRequestData);
    }
  }, [selectedLog]);

  const handleBack = () => {
    if (selectedAgent && selectedSkill) {
      const fallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/skills/${encodeURIComponent(selectedSkill.name)}/logs`;
      smartBack(fallbackUrl);
    } else {
      smartBack('/agents');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!selectedLog) {
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
            <h3 className="text-lg font-medium mb-2">Log not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The log you're looking for doesn't exist or has been deleted.
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
    <div className="flex flex-col h-full">
      <PageHeader
        title="Log Details"
        description={formatTimestamp(selectedLog.start_time)}
        showBackButton
        onBack={handleBack}
      />
      <div className="flex-1 overflow-hidden p-6">
        {/* Log Detail Card */}
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="flex flex-row justify-between items-center p-4 bg-card-header border-b">
            <CardTitle className="text-lg font-medium m-0 flex flex-row items-center gap-2 flex-wrap">
              <span className="text-sm font-light">
                {formatTimestamp(selectedLog.start_time)}
              </span>
              {selectedLog.span_name && (
                <>
                  <Separator orientation="vertical" />
                  <span className="text-xs font-light">
                    {selectedLog.span_name}
                  </span>
                </>
              )}
              {clusterName && (
                <>
                  <Separator orientation="vertical" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-light text-muted-foreground">
                      Cluster:
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {clusterName}
                    </Badge>
                  </div>
                </>
              )}
              {temperature !== null && (
                <>
                  <Separator orientation="vertical" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-light text-muted-foreground">
                      Temp:
                    </span>
                    <span className="font-mono text-xs">
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {thinkingEffort && (
                <>
                  <Separator orientation="vertical" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-light text-muted-foreground">
                      Thinking:
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {thinkingEffort}
                    </Badge>
                  </div>
                </>
              )}
              {averageScore !== null && (
                <>
                  <Separator orientation="vertical" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-light text-muted-foreground">
                      Weighted Eval Score:
                    </span>
                    <div className="flex items-center gap-1">
                      {averageScore >= 0.7 ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span className="font-mono text-xs font-medium">
                        {(averageScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </>
              )}
              {evaluationDetails.length > 0 && (
                <>
                  <Separator orientation="vertical" />
                  <Badge variant="outline" className="text-xs">
                    {evaluationDetails.length} eval
                    {evaluationDetails.length > 1 ? 's' : ''}
                  </Badge>
                </>
              )}
              {evaluationDetails.length > 0 && (
                <>
                  <Separator orientation="vertical" />
                  <button
                    type="button"
                    onClick={() =>
                      setShowEvaluationDetails(!showEvaluationDetails)
                    }
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showEvaluationDetails ? (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        <span>Hide Details</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <span>Show Details ({evaluationDetails.length})</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </CardTitle>
          </CardHeader>
          {showEvaluationDetails && evaluationDetails.length > 0 && (
            <div className="px-4 py-4 space-y-2 bg-muted/30 border-b">
              {evaluationDetails.map((evaluation, evalIdx) => {
                const evalKey = `${evaluation.method}-${evalIdx}`;
                const isEvalExpanded = expandedEvaluations.has(evalKey);
                const prettyName =
                  EvaluationMethodNames[evaluation.method] || evaluation.method;

                return (
                  <div
                    key={evalKey}
                    className="bg-background rounded-md border overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedEvaluations((prev) => {
                          const next = new Set(prev);
                          if (next.has(evalKey)) {
                            next.delete(evalKey);
                          } else {
                            next.add(evalKey);
                          }
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {prettyName}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {(evaluation.score * 100).toFixed(1)}%
                        </Badge>
                        {evaluation.judgeModelName && (
                          <Badge
                            variant="secondary"
                            className="text-xs text-muted-foreground"
                          >
                            {evaluation.judgeModelProvider
                              ? `${PrettyAIProvider[evaluation.judgeModelProvider as AIProvider] || evaluation.judgeModelProvider}/${evaluation.judgeModelName}`
                              : evaluation.judgeModelName}
                          </Badge>
                        )}
                      </div>
                      {isEvalExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {isEvalExpanded && (
                      <div className="border-t">
                        {evaluation.sections.map((section, sectionIdx) => {
                          const sectionKey = `${evalKey}-${sectionIdx}`;
                          const isSectionExpanded =
                            expandedSections.has(sectionKey);

                          return (
                            <div
                              key={sectionKey}
                              className="border-b last:border-b-0"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedSections((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(sectionKey)) {
                                      next.delete(sectionKey);
                                    } else {
                                      next.add(sectionKey);
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                              >
                                <span className="text-xs font-medium">
                                  {section.label}
                                </span>
                                {isSectionExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </button>
                              {isSectionExpanded && (
                                <div className="p-3 text-sm whitespace-pre-wrap leading-relaxed bg-background">
                                  {section.content}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <CardContent className="flex flex-row p-0 h-full relative overflow-hidden">
            {/*<div className="flex h-full w-[200px] border-r">
              <LogMap logs={[selectedLog]} />
            </div>*/}
            <div className="inset-0 flex flex-col flex-1 w-full p-4 gap-4 overflow-hidden overflow-y-auto">
              {selectedLog && raRequestData && (
                <MessagesView
                  logId={selectedLog.id}
                  raRequestData={raRequestData}
                />
              )}
              {selectedLog &&
                raRequestData &&
                selectedLog.ai_provider_request_log.response_body &&
                ('choices' in
                  selectedLog.ai_provider_request_log.response_body ||
                  'output' in
                    selectedLog.ai_provider_request_log.response_body) && (
                  <CompletionViewer
                    logId={selectedLog.id}
                    raRequestData={raRequestData}
                  />
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
